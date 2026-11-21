-- Checks for the redesign migration: profiles, unread tracking, categories, edit events.
-- One transaction, rolled back at the end.
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/redesign.sql
--
-- Expected output ends with "REDESIGN CHECKS PASSED".

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

create function pg_temp.check_text(p_label text, p_actual text, p_expected text) returns void language plpgsql as $$
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
  alice uuid := 'dddddddd-0000-0000-0000-000000000001';
  bob   uuid := 'dddddddd-0000-0000-0000-000000000002';
  carol uuid := 'dddddddd-0000-0000-0000-000000000003';
  hh uuid;
  invite text;
  expense_id uuid;
  personal_id uuid;
  n bigint;
  t text;
  seen_before timestamptz;
  seen_after timestamptz;
  affected integer;
begin
  perform pg_temp.as_superuser();
  insert into auth.users (id, email) values
    (alice, 'rd-alice@test.local'), (bob, 'rd-bob@test.local'), (carol, 'rd-carol@test.local');

  -- ------------------------------------------------------------ profiles
  perform pg_temp.as_user(alice);
  perform public.update_profile('  Akshat  ', 'fox');
  select display_name into t from public.profiles where user_id = alice;
  perform pg_temp.check_text('update_profile trims and stores the name', t, 'Akshat');
  select avatar_key into t from public.profiles where user_id = alice;
  perform pg_temp.check_text('update_profile stores the avatar', t, 'fox');

  perform pg_temp.expect_error('an unknown avatar is rejected',
    $q$select public.update_profile('Akshat', 'dragon')$q$);
  perform pg_temp.expect_error('a blank name is rejected',
    $q$select public.update_profile('   ', 'fox')$q$);
  perform pg_temp.expect_error('a name over 40 characters is rejected',
    format('select public.update_profile(%L, %L)', repeat('x', 41), 'fox'));

  perform pg_temp.expect_error('clients cannot insert a profile directly',
    format('insert into public.profiles (user_id, display_name, avatar_key) values (%L, %L, %L)', bob, 'Fake', 'cat'));
  perform pg_temp.expect_error('clients cannot update a profile directly',
    format('update public.profiles set avatar_key = %L where user_id = %L', 'cat', alice));
  perform pg_temp.expect_error('clients cannot delete a profile directly',
    format('delete from public.profiles where user_id = %L', alice));

  -- Flat, with both roommates.
  hh := public.create_household('Redesign Flat', 'Akshat');
  invite := public.create_household_invite(hh);

  perform pg_temp.as_user(bob);
  perform public.update_profile('Yashwardhan', 'cat');
  perform public.join_household(invite, 'Yashwardhan');

  perform pg_temp.as_user(carol);
  perform public.update_profile('Carol', 'panda');

  -- Visibility: roommates see each other, outsiders see only themselves.
  perform pg_temp.as_user(alice);
  select count(*) into n from public.profiles;
  perform pg_temp.check_eq('alice sees her own and her roommate profile', n, 2);
  select count(*) into n from public.profiles where user_id = carol;
  perform pg_temp.check_eq('alice cannot see an outsider profile', n, 0);

  perform pg_temp.as_user(carol);
  select count(*) into n from public.profiles;
  perform pg_temp.check_eq('carol sees only her own profile', n, 1);

  -- Changing the name keeps the flat display name in step.
  perform pg_temp.as_user(alice);
  perform public.update_profile('Akshat M', 'fox');
  select display_name into t from public.household_members where household_id = hh and user_id = alice;
  perform pg_temp.check_text('the flat display name follows the profile', t, 'Akshat M');
  select display_name into t from public.household_members where household_id = hh and user_id = bob;
  perform pg_temp.check_text('the roommate display name is untouched', t, 'Yashwardhan');

  perform pg_temp.as_superuser();
  set local role anon;
  perform pg_temp.expect_error('anon cannot read profiles', 'select count(*) from public.profiles');
  reset role;

  -- ------------------------------------------------------------ expenses, categories, activity
  perform pg_temp.as_user(alice);
  perform pg_temp.expect_error('an unknown category is rejected',
    format($q$select public.upsert_expense(null, %L, 'shared', 'Bad', 1000, %L, 'equal', current_date,
      '[{"user_id":"%s","share_paise":1000,"basis_points":null}]'::jsonb, 'crypto')$q$, hh, alice, alice));

  expense_id := public.upsert_expense(null, hh, 'shared', 'Weekly groceries', 1000, alice, 'equal', current_date,
    jsonb_build_array(
      jsonb_build_object('user_id', alice, 'share_paise', 500, 'basis_points', null),
      jsonb_build_object('user_id', bob,   'share_paise', 500, 'basis_points', null)),
    'groceries');
  select category into t from public.expenses where id = expense_id;
  perform pg_temp.check_text('the category is stored', t, 'groceries');

  select payload->>'category' into t from public.activity_events where entity_id = expense_id and kind = 'expense_added';
  perform pg_temp.check_text('expense_added carries the category', t, 'groceries');
  select payload->>'paid_by' into t from public.activity_events where entity_id = expense_id and kind = 'expense_added';
  perform pg_temp.check_text('expense_added carries who paid', t, alice::text);

  -- An expense without a category is fine.
  personal_id := public.upsert_expense(null, null, 'personal', 'Gift', 300, alice, 'equal', current_date,
    jsonb_build_array(jsonb_build_object('user_id', alice, 'share_paise', 300, 'basis_points', null)));
  select count(*) into n from public.expenses where id = personal_id and category is null;
  perform pg_temp.check_eq('category is optional', n, 1);

  -- Editing a shared expense is logged; personal expenses never are.
  perform pg_temp.as_user(bob);
  perform public.upsert_expense(expense_id, hh, 'shared', 'Weekly groceries', 1200, alice, 'equal', current_date,
    jsonb_build_array(
      jsonb_build_object('user_id', alice, 'share_paise', 600, 'basis_points', null),
      jsonb_build_object('user_id', bob,   'share_paise', 600, 'basis_points', null)),
    'groceries');
  select count(*) into n from public.activity_events where entity_id = expense_id and kind = 'expense_edited' and actor_id = bob;
  perform pg_temp.check_eq('a shared edit is logged with the editor as actor', n, 1);

  perform pg_temp.as_user(alice);
  perform public.upsert_expense(personal_id, null, 'personal', 'Gift', 350, alice, 'equal', current_date,
    jsonb_build_array(jsonb_build_object('user_id', alice, 'share_paise', 350, 'basis_points', null)));
  select count(*) into n from public.activity_events where entity_id = personal_id;
  perform pg_temp.check_eq('a personal expense never reaches the feed', n, 0);

  -- ------------------------------------------------------------ unread tracking
  perform pg_temp.as_superuser();
  select activity_seen_at into seen_before from public.household_members where household_id = hh and user_id = alice;

  perform pg_temp.as_user(alice);
  -- Cannot move backwards.
  perform public.mark_activity_seen(hh, seen_before - interval '1 day');
  select activity_seen_at into seen_after from public.household_members where household_id = hh and user_id = alice;
  perform pg_temp.check_eq('the seen marker never moves backwards', (seen_after = seen_before)::int, 1);

  -- Cannot move into the future.
  perform public.mark_activity_seen(hh, now() + interval '1 day');
  select activity_seen_at into seen_after from public.household_members where household_id = hh and user_id = alice;
  perform pg_temp.check_eq('the seen marker is clamped to now', (seen_after <= now())::int, 1);

  -- Only the caller's own row moves.
  perform pg_temp.as_superuser();
  select activity_seen_at into seen_before from public.household_members where household_id = hh and user_id = bob;
  perform pg_temp.as_user(alice);
  perform public.mark_activity_seen(hh, now());
  perform pg_temp.as_superuser();
  select activity_seen_at into seen_after from public.household_members where household_id = hh and user_id = bob;
  perform pg_temp.check_eq('marking seen only changes the caller row', (seen_after = seen_before)::int, 1);

  -- An outsider cannot move anyone's marker.
  perform pg_temp.as_user(carol);
  perform public.mark_activity_seen(hh, now());
  get diagnostics affected = row_count;
  perform pg_temp.as_superuser();
  select activity_seen_at into seen_after from public.household_members where household_id = hh and user_id = alice;
  perform pg_temp.check_eq('an outsider cannot change a marker', (seen_after <= now())::int, 1);

  -- Unread is exactly "someone else's events after the marker".
  perform pg_temp.as_superuser();
  update public.household_members set activity_seen_at = now() - interval '1 hour' where household_id = hh and user_id = alice;
  perform pg_temp.as_user(alice);
  select count(*) into n from public.activity_events e
    join public.household_members m on m.household_id = e.household_id and m.user_id = alice
    where e.household_id = hh and e.actor_id <> alice and e.created_at > m.activity_seen_at;
  perform pg_temp.check_eq('alice has one unread event (bob edited an expense)', n, 1);

  raise notice 'REDESIGN CHECKS PASSED';
end $$;

rollback;
