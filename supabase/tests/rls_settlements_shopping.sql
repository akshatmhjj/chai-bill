-- RLS checks for settlements, shopping items and the activity feed.
-- Same style as rls.sql: one transaction, rolled back at the end.
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_settlements_shopping.sql
--
-- Expected output ends with "SETTLEMENTS AND SHOPPING CHECKS PASSED".

\set ON_ERROR_STOP on
begin;

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
  alice uuid := 'cccccccc-0000-0000-0000-000000000001';
  bob   uuid := 'cccccccc-0000-0000-0000-000000000002';
  carol uuid := 'cccccccc-0000-0000-0000-000000000003';
  hh uuid;
  hh_carol uuid;
  invite text;
  item_id uuid;
  settlement_id uuid;
  n bigint;
  affected integer;
begin
  perform pg_temp.as_superuser();
  insert into auth.users (id, email) values
    (alice, 'cc-alice@test.local'), (bob, 'cc-bob@test.local'), (carol, 'cc-carol@test.local');

  perform pg_temp.as_user(alice);
  hh := public.create_household('Settle Flat', 'Alice');
  invite := public.create_household_invite(hh);
  perform pg_temp.as_user(bob);
  perform public.join_household(invite, 'Bob');
  perform pg_temp.as_user(carol);
  hh_carol := public.create_household('Carol Flat', 'Carol');

  -- ------------------------------------------------------------ shopping
  perform pg_temp.as_user(bob);
  insert into public.shopping_items (household_id, name, added_by) values (hh, 'Milk', bob) returning id into item_id;
  select count(*) into n from public.shopping_items where household_id = hh;
  perform pg_temp.check_eq('bob adds a shopping item', n, 1);

  perform pg_temp.expect_error('shopping item cannot be added as someone else',
    format('insert into public.shopping_items (household_id, name, added_by) values (%L, %L, %L)', hh, 'Eggs', alice));

  perform pg_temp.as_user(carol);
  select count(*) into n from public.shopping_items where household_id = hh;
  perform pg_temp.check_eq('carol cannot see the shopping list', n, 0);
  perform pg_temp.expect_error('carol cannot add to the shopping list',
    format('insert into public.shopping_items (household_id, name, added_by) values (%L, %L, %L)', hh, 'Soap', carol));
  update public.shopping_items set status = 'bought', bought_by = carol, bought_at = now() where id = item_id;
  get diagnostics affected = row_count;
  perform pg_temp.check_eq('carol cannot buy an item (0 rows)', affected, 0);
  delete from public.shopping_items where id = item_id;
  get diagnostics affected = row_count;
  perform pg_temp.check_eq('carol cannot delete an item (0 rows)', affected, 0);

  perform pg_temp.as_user(alice);
  update public.shopping_items set status = 'bought', bought_by = alice, bought_at = now() where id = item_id;
  delete from public.shopping_items where id = item_id;
  select count(*) into n from public.activity_events where household_id = hh and kind = 'shopping_deleted';
  perform pg_temp.check_eq('a roommate can delete an item and it is logged', n, 1);

  -- ------------------------------------------------------------ settlements
  perform pg_temp.as_user(bob);
  insert into public.settlements (household_id, from_user, to_user, amount_paise, method, created_by)
    values (hh, bob, alice, 500, 'upi', bob) returning id into settlement_id;
  select count(*) into n from public.settlements where household_id = hh;
  perform pg_temp.check_eq('bob records a payment he made', n, 1);

  -- A member must not be able to record a payment made by someone else.
  perform pg_temp.as_user(alice);
  perform pg_temp.expect_error('alice cannot record a payment that bob made',
    format('insert into public.settlements (household_id, from_user, to_user, amount_paise, method, created_by) values (%L, %L, %L, 100, %L, %L)',
           hh, bob, alice, 'cash', alice));

  perform pg_temp.as_user(alice);
  update public.settlements set deleted_at = now() where id = settlement_id;
  get diagnostics affected = row_count;
  perform pg_temp.check_eq('alice cannot delete bob payment (0 rows)', affected, 0);

  perform pg_temp.as_user(carol);
  select count(*) into n from public.settlements where household_id = hh;
  perform pg_temp.check_eq('carol cannot see settlements', n, 0);
  perform pg_temp.expect_error('carol cannot record a settlement in alice household',
    format('insert into public.settlements (household_id, from_user, to_user, amount_paise, method, created_by) values (%L, %L, %L, 100, %L, %L)',
           hh, carol, alice, 'cash', carol));

  perform pg_temp.as_user(bob);
  update public.settlements set deleted_at = now() where id = settlement_id;
  select count(*) into n from public.settlements where household_id = hh and deleted_at is null;
  perform pg_temp.check_eq('bob can delete his own payment', n, 0);

  -- ------------------------------------------------------------ activity feed
  perform pg_temp.as_user(alice);
  -- shopping_added, shopping_bought, shopping_deleted, settlement_recorded, settlement_deleted.
  select count(*) into n from public.activity_events where household_id = hh;
  perform pg_temp.check_eq('alice sees the household activity feed', n, 5);
  select count(*) into n from public.activity_events where household_id = hh_carol;
  perform pg_temp.check_eq('alice cannot see carol household feed', n, 0);

  perform pg_temp.as_user(carol);
  select count(*) into n from public.activity_events where household_id = hh;
  perform pg_temp.check_eq('carol cannot see alice household feed', n, 0);
  perform pg_temp.expect_error('nobody can write the activity feed directly',
    format('insert into public.activity_events (household_id, actor_id, kind, entity_id) values (%L, %L, %L, gen_random_uuid())', hh_carol, carol, 'expense_added'));

  raise notice 'SETTLEMENTS AND SHOPPING CHECKS PASSED';
end $$;

rollback;
