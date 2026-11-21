-- RLS and RPC tests for the Chai Bill schema.
-- Run against a local Supabase database after the migration has been applied:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- Everything runs in one transaction that is rolled back, so no data is left behind.
-- Any failed assertion raises an exception and stops the script with a non-zero exit.

\set ON_ERROR_STOP on
begin;

-- Impersonate an authenticated user, the way PostgREST does for a JWT with this sub.
create function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

create function pg_temp.as_superuser() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;

create function pg_temp.check_eq(p_label text, p_actual bigint, p_expected bigint) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual;
  end if;
  raise notice 'PASS %', p_label;
end $$;

-- Passes only if the statement raises an error.
create function pg_temp.expect_error(p_label text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL %: statement succeeded but should have been rejected', p_label;
exception when others then
  if sqlerrm like 'FAIL %' then
    raise;
  end if;
  raise notice 'PASS % (rejected: %)', p_label, sqlerrm;
end $$;

do $$
declare
  alice uuid := '11111111-1111-1111-1111-111111111111';
  bob   uuid := '22222222-2222-2222-2222-222222222222';
  carol uuid := '33333333-3333-3333-3333-333333333333';
  hh uuid;
  hh_carol uuid;
  invite text;
  invite_for_carol text;
  exp_shared uuid;
  exp_bad uuid;
  exp_personal uuid;
  filler uuid;
  n bigint;
  affected integer;
begin
  -- Users. auth.users is written as the superuser.
  perform pg_temp.as_superuser();
  insert into auth.users (id, email) values
    (alice, 'alice@test.local'),
    (bob,   'bob@test.local'),
    (carol, 'carol@test.local');

  -- Alice creates the household and invites Bob. Bob joins.
  perform pg_temp.as_user(alice);
  hh := public.create_household('Flat 4B', 'Alice');
  invite := public.create_household_invite(hh);

  perform pg_temp.as_user(bob);
  perform public.join_household(invite, 'Bob');

  -- Carol has her own, separate household.
  perform pg_temp.as_user(carol);
  hh_carol := public.create_household('Other flat', 'Carol');

  -- Alice writes data: a shared expense (1000 paise, equal split) and a personal one.
  perform pg_temp.as_user(alice);
  insert into public.expenses (household_id, created_by, scope, description, amount_paise, paid_by, split_method)
    values (hh, alice, 'shared', 'Groceries', 1000, alice, 'equal')
    returning id into exp_shared;
  insert into public.expense_shares (expense_id, user_id, share_paise)
    values (exp_shared, alice, 500), (exp_shared, bob, 500);

  insert into public.expenses (created_by, scope, description, amount_paise, paid_by)
    values (alice, 'personal', 'Gift for mum', 300, alice)
    returning id into exp_personal;
  insert into public.expense_shares (expense_id, user_id, share_paise)
    values (exp_personal, alice, 300);

  -- ---------------------------------------------------------------- alice
  select count(*) into n from public.expenses where household_id = hh;
  perform pg_temp.check_eq('alice sees the shared expense', n, 1);
  select count(*) into n from public.expenses where id = exp_personal;
  perform pg_temp.check_eq('alice sees her personal expense', n, 1);

  -- ---------------------------------------------------------------- bob (same household)
  perform pg_temp.as_user(bob);
  select count(*) into n from public.expenses where household_id = hh;
  perform pg_temp.check_eq('bob sees the shared expense', n, 1);
  select count(*) into n from public.expense_shares where expense_id = exp_shared;
  perform pg_temp.check_eq('bob sees both shares of the shared expense', n, 2);
  select count(*) into n from public.expenses where id = exp_personal;
  perform pg_temp.check_eq('bob cannot see alice personal expense', n, 0);
  select count(*) into n from public.expense_shares where expense_id = exp_personal;
  perform pg_temp.check_eq('bob cannot see personal expense shares', n, 0);

  perform pg_temp.expect_error('bob cannot add a share to alice personal expense',
    format('insert into public.expense_shares (expense_id, user_id, share_paise) values (%L, %L, 0)', exp_personal, bob));

  update public.expenses set description = 'hacked' where id = exp_personal;
  get diagnostics affected = row_count;
  perform pg_temp.check_eq('bob cannot update alice personal expense (0 rows)', affected, 0);

  insert into public.settlements (household_id, from_user, to_user, amount_paise, method, created_by)
    values (hh, bob, alice, 500, 'upi', bob);
  select count(*) into n from public.settlements where household_id = hh;
  perform pg_temp.check_eq('bob records a settlement in his household', n, 1);

  insert into public.shopping_items (household_id, name, added_by)
    values (hh, 'Milk', bob);

  perform pg_temp.expect_error('bob cannot write the activity feed directly',
    format('insert into public.activity_events (household_id, actor_id, kind, entity_id) values (%L, %L, %L, gen_random_uuid())', hh, bob, 'expense_added'));

  -- Bad share sum is rejected once the deferred check is made immediate.
  -- Alice writes a 1000-paise expense with 800 paise of shares.
  perform pg_temp.as_user(alice);
  insert into public.expenses (household_id, created_by, scope, description, amount_paise, paid_by)
    values (hh, alice, 'shared', 'Bad split', 1000, alice)
    returning id into exp_bad;
  set constraints public.expense_shares_sum_ck immediate;
  perform pg_temp.expect_error('shares that do not sum to the total are rejected',
    format('insert into public.expense_shares (expense_id, user_id, share_paise) values (%L, %L, 400), (%L, %L, 400)',
           exp_bad, alice, exp_bad, bob));
  set constraints public.expense_shares_sum_ck deferred;

  perform pg_temp.expect_error('alice cannot add a share for a non-member',
    format('insert into public.expense_shares (expense_id, user_id, share_paise) values (%L, %L, 0)', exp_shared, carol));

  -- Alice creates a second invite while the household is full (two members) to test the cap later.
  invite_for_carol := public.create_household_invite(hh);

  -- ---------------------------------------------------------------- carol (outsider)
  perform pg_temp.as_user(carol);
  select count(*) into n from public.households where id = hh;
  perform pg_temp.check_eq('carol cannot see the household', n, 0);
  select count(*) into n from public.expenses where household_id = hh;
  perform pg_temp.check_eq('carol cannot see shared expenses', n, 0);
  select count(*) into n from public.expense_shares where expense_id = exp_shared;
  perform pg_temp.check_eq('carol cannot see shares', n, 0);
  select count(*) into n from public.expenses where id = exp_personal;
  perform pg_temp.check_eq('carol cannot see alice personal expense', n, 0);
  select count(*) into n from public.settlements where household_id = hh;
  perform pg_temp.check_eq('carol cannot see settlements', n, 0);
  select count(*) into n from public.shopping_items where household_id = hh;
  perform pg_temp.check_eq('carol cannot see shopping items', n, 0);
  select count(*) into n from public.activity_events where household_id = hh;
  perform pg_temp.check_eq('carol cannot see the activity feed', n, 0);
  select count(*) into n from public.household_members where household_id = hh;
  perform pg_temp.check_eq('carol cannot see household members', n, 0);

  perform pg_temp.expect_error('carol cannot write an expense into alice household',
    format('insert into public.expenses (household_id, created_by, scope, description, amount_paise, paid_by) values (%L, %L, %L, %L, 100, %L)',
           hh, carol, 'shared', 'Sneaky', carol));
  perform pg_temp.expect_error('carol cannot record a settlement in alice household',
    format('insert into public.settlements (household_id, from_user, to_user, amount_paise, method, created_by) values (%L, %L, %L, 100, %L, %L)',
           hh, carol, alice, 'cash', carol));
  perform pg_temp.expect_error('carol cannot create an invite for alice household',
    format('select public.create_household_invite(%L)', hh));

  update public.expenses set description = 'hacked' where id = exp_shared;
  get diagnostics affected = row_count;
  perform pg_temp.check_eq('carol cannot update the shared expense (0 rows)', affected, 0);

  -- The household is capped at 15 members. Fill it to the cap (as the superuser, to skip 13 sign-ups),
  -- then check a 16th person is turned away.
  perform pg_temp.as_superuser();
  for i in 1..(public.household_member_cap() - 2) loop
    filler := gen_random_uuid();
    insert into auth.users (id, email) values (filler, 'filler' || i || '@test.local');
    insert into public.household_members (household_id, user_id, display_name)
      values (hh, filler, 'Filler ' || i);
  end loop;
  select count(*) into n from public.household_members where household_id = hh;
  perform pg_temp.check_eq('the flat is filled to the cap', n, public.household_member_cap());

  perform pg_temp.as_user(carol);
  perform pg_temp.expect_error('a sixteenth person cannot join a full household',
    format('select public.join_household(%L, %L)', invite_for_carol, 'Carol'));

  -- ---------------------------------------------------------------- anon
  perform pg_temp.as_superuser();
  set local role anon;
  perform pg_temp.expect_error('anon cannot read expenses', 'select count(*) from public.expenses');
  reset role;

  -- ---------------------------------------------------------------- final state, checked as alice
  perform pg_temp.as_user(alice);
  select count(*) into n from public.activity_events where household_id = hh;
  -- expected: expense_added (groceries), settlement_recorded (bob), shopping_added (milk), expense_added (bad split)
  perform pg_temp.check_eq('alice sees four activity events', n, 4);
  select amount_paise into n from public.expenses where id = exp_shared;
  perform pg_temp.check_eq('shared expense amount unchanged after rejected edits', n, 1000);
  select count(*) into n from public.expenses where id = exp_personal and description = 'Gift for mum';
  perform pg_temp.check_eq('personal expense description unchanged after rejected edit', n, 1);

  raise notice 'ALL RLS CHECKS PASSED';
end $$;

rollback;
