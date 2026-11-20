-- Commit-path checks for the deferred share-sum trigger.
-- rls.sql never commits, so it cannot exercise the deferred check. This script
-- does real commits, writes data, and deletes it again at the end.
--
--   psql "$DB_URL" -f supabase/tests/commit_path.sql
--
-- Expected output: the valid commit succeeds, the two invalid commits fail with
-- a check_violation error, and the final DO block prints "COMMIT-PATH CHECKS PASSED".
-- Errors from the two invalid commits are expected and are not failures.

-- Users and a household, created through the same RPC the app will use.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'commit-alice@test.local'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'commit-bob@test.local');

begin;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.create_household('Commit Flat', 'Alice');
select public.create_household_invite(id) from public.households where name = 'Commit Flat';
commit;

-- Read the invite code as the superuser: RLS hides invites from non-members, and Bob is not one yet.
select code as invite_code from public.household_invites
  where household_id = (select id from public.households where name = 'Commit Flat')
  order by created_at desc limit 1 \gset

begin;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.join_household(:'invite_code', 'Bob');
commit;

-- Valid: a shared expense whose shares sum to the total. Must commit.
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.expenses (household_id, created_by, scope, description, amount_paise, paid_by)
  select id, 'aaaaaaaa-0000-0000-0000-000000000001', 'shared', 'Commit valid', 1000, 'aaaaaaaa-0000-0000-0000-000000000001'
  from public.households where name = 'Commit Flat';
insert into public.expense_shares (expense_id, user_id, share_paise)
  select e.id, v.user_id, v.share
  from public.expenses e,
       (values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 500::bigint),
               ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 500::bigint)) as v(user_id, share)
  where e.description = 'Commit valid';
commit;

-- Invalid: shares sum to 800 against a 1000 total. The commit must fail.
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.expenses (household_id, created_by, scope, description, amount_paise, paid_by)
  select id, 'aaaaaaaa-0000-0000-0000-000000000001', 'shared', 'Commit bad sum', 1000, 'aaaaaaaa-0000-0000-0000-000000000001'
  from public.households where name = 'Commit Flat';
insert into public.expense_shares (expense_id, user_id, share_paise)
  select e.id, v.user_id, v.share
  from public.expenses e,
       (values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 400::bigint),
               ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 400::bigint)) as v(user_id, share)
  where e.description = 'Commit bad sum';
commit;

-- Invalid: an expense with no shares at all. The commit must fail.
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.expenses (household_id, created_by, scope, description, amount_paise, paid_by)
  select id, 'aaaaaaaa-0000-0000-0000-000000000001', 'shared', 'Commit no shares', 1000, 'aaaaaaaa-0000-0000-0000-000000000001'
  from public.households where name = 'Commit Flat';
commit;

-- Verify what actually persisted.
reset role;
do $$
declare
  n bigint;
begin
  select count(*) into n from public.expenses where description = 'Commit valid';
  if n <> 1 then raise exception 'FAIL: valid expense persisted % times, expected 1', n; end if;

  select count(*) into n from public.expense_shares s
    join public.expenses e on e.id = s.expense_id where e.description = 'Commit valid';
  if n <> 2 then raise exception 'FAIL: valid expense has % shares, expected 2', n; end if;

  select count(*) into n from public.expenses where description in ('Commit bad sum', 'Commit no shares');
  if n <> 0 then raise exception 'FAIL: % invalid expense(s) persisted', n; end if;

  raise notice 'COMMIT-PATH CHECKS PASSED';
end $$;

-- Clean up everything this script wrote.
delete from public.expenses where created_by in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
delete from public.households where name = 'Commit Flat';
delete from auth.users where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
