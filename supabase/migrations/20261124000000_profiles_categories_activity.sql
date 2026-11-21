-- Redesign support: profiles (name + avatar), unread-activity tracking, expense categories,
-- and "expense edited" events in the activity feed.
--
-- Everything here is additive. No existing policy is loosened.

-- ---------------------------------------------------------------------------
-- 1. Profiles: one row per person, readable by them and by people they share a flat with.
--    Written only through update_profile(), never directly.
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_key text not null check (avatar_key in (
    'chai', 'mango', 'samosa', 'plant', 'moon', 'sun', 'cloud', 'cat', 'fox', 'panda'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Defence in depth: clients never write this table directly, and anon never touches it.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;

create or replace function public.shares_household_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members me
    join public.household_members other on other.household_id = me.household_id
    where me.user_id = auth.uid()
      and other.user_id = p_user
  );
$$;

create policy profiles_select on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.shares_household_with(user_id));

-- Creates or updates the caller's profile, and keeps their flat display name in step.
create or replace function public.update_profile(p_display_name text, p_avatar_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text := trim(coalesce(p_display_name, ''));
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'name must be 1 to 40 characters' using errcode = '22023';
  end if;

  insert into public.profiles (user_id, display_name, avatar_key)
  values (v_user, v_name, p_avatar_key)
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        avatar_key = excluded.avatar_key,
        updated_at = now();

  update public.household_members set display_name = v_name where user_id = v_user;
end;
$$;

revoke all on function public.update_profile(text, text) from public, anon;
grant execute on function public.update_profile(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Unread activity: each member records how far through the feed they have read.
--    "Unread" is exactly: events by someone else, created after this timestamp.
-- ---------------------------------------------------------------------------
alter table public.household_members
  add column activity_seen_at timestamptz not null default now();

-- Moves the marker forward only (never back), never into the future, and only for the caller.
create or replace function public.mark_activity_seen(p_household uuid, p_until timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.household_members
  set activity_seen_at = greatest(activity_seen_at, least(p_until, now()))
  where household_id = p_household
    and user_id = auth.uid();
$$;

revoke all on function public.mark_activity_seen(uuid, timestamptz) from public, anon;
grant execute on function public.mark_activity_seen(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Expense categories (optional) and the upsert function that carries them.
-- ---------------------------------------------------------------------------
alter table public.expenses
  add column category text check (category in (
    'groceries', 'food', 'rent', 'utilities', 'transport', 'household', 'fun', 'health', 'other'
  ));

drop function public.upsert_expense(uuid, uuid, public.expense_scope, text, bigint, uuid, public.split_method, date, jsonb);

create or replace function public.upsert_expense(
  p_expense_id uuid,
  p_household_id uuid,
  p_scope public.expense_scope,
  p_description text,
  p_amount_paise bigint,
  p_paid_by uuid,
  p_split_method public.split_method,
  p_expense_date date,
  p_shares jsonb,
  p_category text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := p_expense_id;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_expense_id is null then
    insert into public.expenses (
      household_id, created_by, scope, description, amount_paise,
      paid_by, split_method, expense_date, category
    )
    values (
      p_household_id, auth.uid(), p_scope, p_description, p_amount_paise,
      p_paid_by, p_split_method, p_expense_date, p_category
    )
    returning id into v_id;
  else
    update public.expenses
    set household_id = p_household_id,
        scope = p_scope,
        description = p_description,
        amount_paise = p_amount_paise,
        paid_by = p_paid_by,
        split_method = p_split_method,
        expense_date = p_expense_date,
        category = p_category,
        -- clock_timestamp() so an edit is always distinguishable from the insert, even in one transaction.
        updated_at = clock_timestamp()
    where id = p_expense_id
      and deleted_at is null
    returning id into v_id;

    if v_id is null then
      raise exception 'expense not found' using errcode = 'P0002';
    end if;

    delete from public.expense_shares where expense_id = v_id;
  end if;

  insert into public.expense_shares (expense_id, user_id, share_paise, basis_points)
  select v_id,
         (s->>'user_id')::uuid,
         (s->>'share_paise')::bigint,
         nullif(s->>'basis_points', '')::integer
  from jsonb_array_elements(p_shares) as s;

  return v_id;
end;
$$;

revoke all on function public.upsert_expense(uuid, uuid, public.expense_scope, text, bigint, uuid, public.split_method, date, jsonb, text) from public, anon;
grant execute on function public.upsert_expense(uuid, uuid, public.expense_scope, text, bigint, uuid, public.split_method, date, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Activity feed: log edits, and carry category and payer in the payload.
-- ---------------------------------------------------------------------------
alter table public.activity_events drop constraint activity_events_kind_check;
alter table public.activity_events add constraint activity_events_kind_check check (kind in (
  'expense_added', 'expense_edited', 'expense_deleted',
  'settlement_recorded', 'settlement_deleted',
  'shopping_added', 'shopping_bought', 'shopping_reopened', 'shopping_deleted'
));

create or replace function public.log_expense_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.scope <> 'shared' then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
    values (new.household_id, auth.uid(), 'expense_added', new.id,
            jsonb_build_object('description', new.description, 'amount_paise', new.amount_paise,
                               'category', new.category, 'paid_by', new.paid_by));
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
      values (new.household_id, auth.uid(), 'expense_deleted', new.id,
              jsonb_build_object('description', new.description, 'amount_paise', new.amount_paise,
                                 'category', new.category, 'paid_by', new.paid_by));
    elsif old.deleted_at is null and new.deleted_at is null and new.updated_at is distinct from old.updated_at then
      insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
      values (new.household_id, auth.uid(), 'expense_edited', new.id,
              jsonb_build_object('description', new.description, 'amount_paise', new.amount_paise,
                                 'category', new.category, 'paid_by', new.paid_by));
    end if;
  end if;
  return null;
end;
$$;

drop trigger expenses_activity on public.expenses;
create trigger expenses_activity
  after insert or update of deleted_at, updated_at on public.expenses
  for each row execute function public.log_expense_activity();

-- ---------------------------------------------------------------------------
-- 5. Realtime: a roommate joining, and avatar or name changes, should show up live.
--    Both tables stay protected by their RLS policies.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.household_members, public.profiles;
  end if;
end;
$$;
