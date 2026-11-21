-- Nest invites: readable codes, shared codes, refresh revokes the old one, several nests per person.
-- One transaction, rolled back at the end.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/nests.sql
-- Expected output ends with "NESTS CHECKS PASSED".

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
  if sqlerrm like 'FAIL %' then raise; end if;
  raise notice 'PASS % (rejected: %)', p_label, sqlerrm;
end $$;

do $$
declare
  ana uuid := 'eeeeeeee-0000-0000-0000-000000000001';
  ben uuid := 'eeeeeeee-0000-0000-0000-000000000002';
  cy  uuid := 'eeeeeeee-0000-0000-0000-000000000003';
  dee uuid := 'eeeeeeee-0000-0000-0000-000000000004';
  nest_one uuid;
  nest_two uuid;
  code1 text;
  code2 text;
  n bigint;
begin
  perform pg_temp.as_superuser();
  insert into auth.users (id, email) values
    (ana, 'nest-ana@test.local'), (ben, 'nest-ben@test.local'), (cy, 'nest-cy@test.local'), (dee, 'nest-dee@test.local');

  -- ------------------------------------------------------------ code format
  perform pg_temp.as_user(ana);
  nest_one := public.create_household('Nest One', 'Ana');
  code1 := public.create_household_invite(nest_one);
  perform pg_temp.check_eq('a code is 8 characters', length(code1), 8);
  perform pg_temp.check_eq('a code avoids look-alike characters', (code1 ~ '[01ilo]')::int, 0);
  perform pg_temp.check_eq('a code is lowercase letters and digits', (code1 ~ '^[a-z0-9]+$')::int, 1);

  -- ------------------------------------------------------------ shared code, typed loosely
  -- Ben types it with capitals and a dash; that must still join.
  perform pg_temp.as_user(ben);
  perform public.join_household(upper(substr(code1, 1, 4)) || '-' || upper(substr(code1, 5)), 'Ben');
  select count(*) into n from public.household_members where household_id = nest_one;
  perform pg_temp.check_eq('a loosely typed code joins the nest', n, 2);

  -- The same code works for a second person, not just one.
  perform pg_temp.as_user(cy);
  perform public.join_household(code1, 'Cy');
  select count(*) into n from public.household_members where household_id = nest_one;
  perform pg_temp.check_eq('one code lets several people join', n, 3);

  -- Joining again is harmless.
  perform pg_temp.as_user(cy);
  perform public.join_household(code1, 'Cy');
  select count(*) into n from public.household_members where household_id = nest_one;
  perform pg_temp.check_eq('joining twice does not add a second membership', n, 3);

  -- ------------------------------------------------------------ refresh revokes the old code
  perform pg_temp.as_user(ana);
  code2 := public.create_household_invite(nest_one);
  perform pg_temp.check_eq('a refreshed code is different', (code2 <> code1)::int, 1);
  perform pg_temp.as_user(dee);
  perform pg_temp.expect_error('the old code stops working after a refresh',
    format('select public.join_household(%L, %L)', code1, 'Dee'));
  perform pg_temp.as_user(dee);
  perform public.join_household(code2, 'Dee');
  select count(*) into n from public.household_members where household_id = nest_one;
  perform pg_temp.check_eq('the new code works', n, 4);

  -- ------------------------------------------------------------ several nests per person
  perform pg_temp.as_user(ana);
  nest_two := public.create_household('Nest Two', 'Ana');
  select count(*) into n from public.household_members where user_id = ana;
  perform pg_temp.check_eq('one person can belong to two nests', n, 2);

  -- A code from one nest does not open the other. Ana makes the code; Ben (not in nest two) tries it.
  perform pg_temp.as_user(ana);
  code2 := public.create_household_invite(nest_two);
  perform pg_temp.as_user(ben);
  perform pg_temp.check_eq('ben is not in nest two yet', (select count(*) from public.household_members where household_id = nest_two and user_id = ben), 0);
  declare joined uuid;
  begin
    joined := public.join_household(code2, 'Ben');
    perform pg_temp.check_eq('a code opens the nest it was made for', (joined = nest_two)::int, 1);
  end;

  -- ------------------------------------------------------------ the cap still holds for shared codes
  perform pg_temp.as_user(ana);
  perform pg_temp.check_eq('the nest still has four people', (select count(*) from public.household_members where household_id = nest_one), 4);

  raise notice 'NESTS CHECKS PASSED';
end $$;

rollback;
