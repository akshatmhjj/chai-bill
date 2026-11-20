-- Chai Bill: initial schema, RLS, realtime and activity feed.
-- Source of truth for the data model: docs/SPEC.md (sections 2, 3).
-- Money is stored as integer paise (bigint). Currency is INR only.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.expense_scope as enum ('personal', 'shared');
create type public.split_method as enum ('equal', 'amount', 'percent');
create type public.settlement_method as enum ('upi', 'cash', 'other');
create type public.shopping_status as enum ('open', 'bought');

-- ---------------------------------------------------------------------------
-- Households and membership
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on public.household_members (user_id);

create table public.household_invites (
  code text primary key default replace(gen_random_uuid()::text, '-', ''),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- Helper: membership check used by every policy.
-- SECURITY DEFINER avoids recursive RLS evaluation on household_members.
-- ---------------------------------------------------------------------------
create or replace function public.is_household_member(p_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household
      and hm.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Expenses and shares
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  scope public.expense_scope not null,
  description text not null check (char_length(description) between 1 and 120),
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  paid_by uuid not null references auth.users (id) on delete restrict,
  split_method public.split_method not null default 'equal',
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- shared expenses belong to a household; personal expenses do not.
  constraint expenses_scope_household_ck
    check ((scope = 'shared') = (household_id is not null)),
  -- personal expenses are paid by, and belong to, their creator.
  constraint expenses_personal_owner_ck
    check (scope = 'shared' or (paid_by = created_by))
);

create index expenses_household_idx on public.expenses (household_id, expense_date desc)
  where scope = 'shared';
create index expenses_personal_idx on public.expenses (created_by, expense_date desc)
  where scope = 'personal';

create table public.expense_shares (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  share_paise bigint not null check (share_paise >= 0),
  basis_points integer check (basis_points between 0 and 10000),
  primary key (expense_id, user_id)
);

create index expense_shares_user_idx on public.expense_shares (user_id);

-- Every expense must have at least one share, and shares must sum to the total.
-- Deferred so that an expense and its shares can be written in one transaction.
create or replace function public.check_expense_shares_sum()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_expense uuid;
  v_total bigint;
  v_sum bigint;
  v_count integer;
begin
  -- Branch on the table: the NEW record has no `expense_id` on expenses, and no `id` on expense_shares.
  if tg_table_name = 'expenses' then
    v_expense := new.id;
  elsif tg_op = 'DELETE' then
    v_expense := old.expense_id;
  else
    v_expense := new.expense_id;
  end if;

  select amount_paise into v_total from public.expenses where id = v_expense;
  if v_total is null then
    -- parent expense is gone (cascade delete in the same transaction): nothing to check.
    return null;
  end if;

  select coalesce(sum(share_paise), 0), count(*)
    into v_sum, v_count
  from public.expense_shares
  where expense_id = v_expense;

  if v_count = 0 then
    raise exception 'expense % has no shares', v_expense using errcode = 'check_violation';
  end if;

  if v_sum <> v_total then
    raise exception 'expense % shares sum to % paise but amount is % paise', v_expense, v_sum, v_total
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger expenses_shares_sum_ck
  after insert or update of amount_paise on public.expenses
  deferrable initially deferred
  for each row execute function public.check_expense_shares_sum();

create constraint trigger expense_shares_sum_ck
  after insert or update or delete on public.expense_shares
  deferrable initially deferred
  for each row execute function public.check_expense_shares_sum();

-- ---------------------------------------------------------------------------
-- Settlements
-- ---------------------------------------------------------------------------
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete restrict,
  to_user uuid not null references auth.users (id) on delete restrict,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  method public.settlement_method not null,
  reference text check (char_length(reference) <= 80),
  note text check (char_length(note) <= 280),
  settled_on date not null default current_date,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint settlements_distinct_parties_ck check (from_user <> to_user)
);

create index settlements_household_idx on public.settlements (household_id, settled_on desc);

-- ---------------------------------------------------------------------------
-- Shopping list
-- ---------------------------------------------------------------------------
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity text check (char_length(quantity) <= 40),
  status public.shopping_status not null default 'open',
  added_by uuid not null references auth.users (id) on delete restrict,
  bought_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  bought_at timestamptz,
  constraint shopping_bought_ck check (
    (status = 'bought') = (bought_by is not null and bought_at is not null)
  )
);

create index shopping_items_household_idx on public.shopping_items (household_id, status, created_at);

-- ---------------------------------------------------------------------------
-- Activity feed (written only by triggers)
-- ---------------------------------------------------------------------------
create table public.activity_events (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'expense_added', 'expense_deleted',
    'settlement_recorded', 'settlement_deleted',
    'shopping_added', 'shopping_bought', 'shopping_reopened'
  )),
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_household_idx on public.activity_events (household_id, created_at desc);

create or replace function public.log_expense_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.scope = 'shared' then
    insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
    values (new.household_id, auth.uid(), 'expense_added', new.id,
            jsonb_build_object('description', new.description, 'amount_paise', new.amount_paise));
  elsif tg_op = 'UPDATE' and new.scope = 'shared'
        and old.deleted_at is null and new.deleted_at is not null then
    insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
    values (new.household_id, auth.uid(), 'expense_deleted', new.id,
            jsonb_build_object('description', new.description, 'amount_paise', new.amount_paise));
  end if;
  return null;
end;
$$;

create trigger expenses_activity
  after insert or update of deleted_at on public.expenses
  for each row execute function public.log_expense_activity();

create or replace function public.log_settlement_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
    values (new.household_id, auth.uid(), 'settlement_recorded', new.id,
            jsonb_build_object('from_user', new.from_user, 'to_user', new.to_user,
                               'amount_paise', new.amount_paise, 'method', new.method));
  elsif tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then
    insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
    values (new.household_id, auth.uid(), 'settlement_deleted', new.id,
            jsonb_build_object('amount_paise', new.amount_paise));
  end if;
  return null;
end;
$$;

create trigger settlements_activity
  after insert or update of deleted_at on public.settlements
  for each row execute function public.log_settlement_activity();

create or replace function public.log_shopping_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
    values (new.household_id, auth.uid(), 'shopping_added', new.id,
            jsonb_build_object('name', new.name));
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
    values (new.household_id, auth.uid(),
            case when new.status = 'bought' then 'shopping_bought' else 'shopping_reopened' end,
            new.id, jsonb_build_object('name', new.name));
  end if;
  return null;
end;
$$;

create trigger shopping_activity
  after insert or update of status on public.shopping_items
  for each row execute function public.log_shopping_activity();

-- ---------------------------------------------------------------------------
-- RPCs: the only way to create households or join them.
-- ---------------------------------------------------------------------------
create or replace function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.households (name, created_by)
  values (trim(p_name), v_user)
  returning id into v_household;

  insert into public.household_members (household_id, user_id, display_name)
  values (v_household, v_user, trim(p_display_name));

  return v_household;
end;
$$;

create or replace function public.create_household_invite(p_household uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_household_member(p_household) then
    raise exception 'not a member of this household' using errcode = '42501';
  end if;

  insert into public.household_invites (household_id, created_by)
  values (p_household, auth.uid())
  returning code into v_code;

  return v_code;
end;
$$;

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.household_invites%rowtype;
  v_members integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_invite
  from public.household_invites
  where code = p_code
  for update;

  if not found or v_invite.used_at is not null or v_invite.expires_at < now() then
    raise exception 'invite is invalid or expired' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.household_members
             where household_id = v_invite.household_id and user_id = v_user) then
    return v_invite.household_id;
  end if;

  -- v1 cap: a household has exactly two members.
  select count(*) into v_members
  from public.household_members
  where household_id = v_invite.household_id;

  if v_members >= 2 then
    raise exception 'household is full' using errcode = 'P0001';
  end if;

  insert into public.household_members (household_id, user_id, display_name)
  values (v_invite.household_id, v_user, trim(p_display_name));

  update public.household_invites
  set used_at = now(), used_by = v_user
  where code = v_invite.code;

  return v_invite.household_id;
end;
$$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.create_household_invite(uuid) from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;
alter table public.shopping_items enable row level security;
alter table public.activity_events enable row level security;

revoke all on all tables in schema public from anon;

-- households: readable by members. Writes only via create_household().
create policy households_select on public.households
  for select to authenticated
  using (public.is_household_member(id));

-- household_members: readable by members of the same household. No direct writes.
create policy household_members_select on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

-- household_invites: visible to members of the household; created via RPC only.
create policy household_invites_select on public.household_invites
  for select to authenticated
  using (public.is_household_member(household_id));

-- expenses: personal rows belong to their creator; shared rows to household members.
create policy expenses_select on public.expenses
  for select to authenticated
  using (
    (scope = 'personal' and created_by = auth.uid())
    or (scope = 'shared' and public.is_household_member(household_id))
  );

create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (scope = 'personal' and household_id is null and paid_by = auth.uid())
      or (scope = 'shared'
          and public.is_household_member(household_id)
          and exists (
            select 1 from public.household_members hm
            where hm.household_id = expenses.household_id
              and hm.user_id = expenses.paid_by
          ))
    )
  );

create policy expenses_update on public.expenses
  for update to authenticated
  using (
    (scope = 'personal' and created_by = auth.uid())
    or (scope = 'shared' and public.is_household_member(household_id))
  )
  with check (
    (scope = 'personal' and created_by = auth.uid() and paid_by = auth.uid() and household_id is null)
    or (scope = 'shared'
        and public.is_household_member(household_id)
        and exists (
          select 1 from public.household_members hm
          where hm.household_id = expenses.household_id
            and hm.user_id = expenses.paid_by
        ))
  );

-- expense_shares: follow the parent expense's visibility. Share users must be
-- the personal owner, or members of the shared household.
create policy expense_shares_select on public.expense_shares
  for select to authenticated
  using (exists (select 1 from public.expenses e where e.id = expense_shares.expense_id));

create policy expense_shares_write on public.expense_shares
  for all to authenticated
  using (exists (select 1 from public.expenses e where e.id = expense_shares.expense_id))
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_shares.expense_id
        and (
          (e.scope = 'personal' and expense_shares.user_id = e.created_by)
          or (e.scope = 'shared' and exists (
                select 1 from public.household_members hm
                where hm.household_id = e.household_id
                  and hm.user_id = expense_shares.user_id))
        )
    )
  );

-- settlements: members read; a member records settlements between two members;
-- only the creator may soft-delete (set deleted_at).
create policy settlements_select on public.settlements
  for select to authenticated
  using (public.is_household_member(household_id));

create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_household_member(household_id)
    and exists (select 1 from public.household_members hm
                where hm.household_id = settlements.household_id and hm.user_id = settlements.from_user)
    and exists (select 1 from public.household_members hm
                where hm.household_id = settlements.household_id and hm.user_id = settlements.to_user)
  );

create policy settlements_update on public.settlements
  for update to authenticated
  using (created_by = auth.uid() and public.is_household_member(household_id))
  with check (created_by = auth.uid() and public.is_household_member(household_id));

-- shopping_items: any member can read, add, buy/reopen, and remove.
create policy shopping_items_select on public.shopping_items
  for select to authenticated
  using (public.is_household_member(household_id));

create policy shopping_items_insert on public.shopping_items
  for insert to authenticated
  with check (added_by = auth.uid() and public.is_household_member(household_id));

create policy shopping_items_update on public.shopping_items
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy shopping_items_delete on public.shopping_items
  for delete to authenticated
  using (public.is_household_member(household_id));

-- activity_events: readable by members. No client writes; triggers insert as definer.
create policy activity_events_select on public.activity_events
  for select to authenticated
  using (public.is_household_member(household_id));

-- Column-level grants: clients cannot touch the activity feed directly.
revoke insert, update, delete on public.activity_events from authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: publish household data so subscribers get changes (RLS still applies).
-- Guarded so the migration also runs on a plain Postgres without Supabase.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.expenses,
      public.expense_shares,
      public.settlements,
      public.shopping_items,
      public.activity_events;
  end if;
end;
$$;
