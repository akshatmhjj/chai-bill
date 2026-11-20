-- Checks for public.upsert_expense: create, atomic edit, rejection and RLS.
-- Commits for real (the deferred share check only runs at COMMIT), then cleans up.
--
--   psql "$DB_URL" -f supabase/tests/expense_rpc.sql
--
-- Expected: the valid create and edit commit, the bad sum and an outsider's write
-- fail (those errors are expected output), and the final DO block prints
-- "EXPENSE RPC CHECKS PASSED".

insert into auth.users (id, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'rpc-alice@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'rpc-bob@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'rpc-carol@test.local');

begin;
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.create_household('RPC Flat', 'Alice');
select public.create_household_invite(id) from public.households where name = 'RPC Flat';
commit;

select code as invite_code from public.household_invites
  where household_id = (select id from public.households where name = 'RPC Flat')
  order by created_at desc limit 1 \gset

begin;
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.join_household(:'invite_code', 'Bob');
commit;

-- Create a shared expense, 1000 paise, 600 / 400 by exact amount. Must commit.
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.upsert_expense(
  null,
  (select id from public.households where name = 'RPC Flat'),
  'shared', 'RPC create', 1000,
  'bbbbbbbb-0000-0000-0000-000000000001', 'amount', current_date,
  '[{"user_id":"bbbbbbbb-0000-0000-0000-000000000001","share_paise":600,"basis_points":null},
    {"user_id":"bbbbbbbb-0000-0000-0000-000000000002","share_paise":400,"basis_points":null}]'::jsonb
) \gset expense_
commit;

-- Bob edits it, switching to percentages (70 / 30). Must commit and replace the shares.
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.upsert_expense(
  :'expense_upsert_expense'::uuid,
  (select id from public.households where name = 'RPC Flat'),
  'shared', 'RPC edited', 1000,
  'bbbbbbbb-0000-0000-0000-000000000001', 'percent', current_date,
  '[{"user_id":"bbbbbbbb-0000-0000-0000-000000000001","share_paise":700,"basis_points":7000},
    {"user_id":"bbbbbbbb-0000-0000-0000-000000000002","share_paise":300,"basis_points":3000}]'::jsonb
);
commit;

-- Shares that do not sum to the total must fail at COMMIT.
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.upsert_expense(
  :'expense_upsert_expense'::uuid,
  (select id from public.households where name = 'RPC Flat'),
  'shared', 'RPC bad sum', 1000,
  'bbbbbbbb-0000-0000-0000-000000000001', 'amount', current_date,
  '[{"user_id":"bbbbbbbb-0000-0000-0000-000000000001","share_paise":500,"basis_points":null}]'::jsonb
);
commit;

-- An outsider cannot edit the expense: RLS hides it, so the function raises "not found".
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.upsert_expense(
  :'expense_upsert_expense'::uuid,
  (select id from public.households where name = 'RPC Flat'),
  'shared', 'RPC outsider', 1000,
  'bbbbbbbb-0000-0000-0000-000000000001', 'equal', current_date,
  '[{"user_id":"bbbbbbbb-0000-0000-0000-000000000001","share_paise":1000,"basis_points":null}]'::jsonb
);
commit;

reset role;
do $$
declare
  n bigint;
  v_desc text;
  v_method text;
  v_shares bigint;
  v_bp bigint;
begin
  select description, split_method::text into v_desc, v_method from public.expenses where description like 'RPC %' and deleted_at is null;
  if v_desc <> 'RPC edited' then raise exception 'FAIL: expected edited description, got %', v_desc; end if;
  if v_method <> 'percent' then raise exception 'FAIL: expected split_method percent, got %', v_method; end if;

  select count(*), coalesce(sum(s.share_paise), 0), coalesce(sum(s.basis_points), 0)
    into n, v_shares, v_bp
  from public.expense_shares s join public.expenses e on e.id = s.expense_id
  where e.description = 'RPC edited';
  if n <> 2 then raise exception 'FAIL: expected 2 shares after the edit, got %', n; end if;
  if v_shares <> 1000 then raise exception 'FAIL: shares sum to %, expected 1000', v_shares; end if;
  if v_bp <> 10000 then raise exception 'FAIL: basis points sum to %, expected 10000', v_bp; end if;

  select count(*) into n from public.expenses where description in ('RPC bad sum', 'RPC outsider');
  if n <> 0 then raise exception 'FAIL: % rejected write(s) persisted', n; end if;

  raise notice 'EXPENSE RPC CHECKS PASSED';
end $$;

delete from public.expenses where created_by in ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');
delete from public.households where name = 'RPC Flat';
delete from auth.users where id in ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003');
