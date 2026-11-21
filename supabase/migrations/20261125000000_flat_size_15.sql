-- A flat can now hold up to 15 people (it was capped at 2 in v1).
--
-- The cap lives in one function so it can change without rewriting join_household().
-- Every person still joins with their own single-use invite code.

create or replace function public.household_member_cap()
returns integer
language sql
immutable
set search_path = public
as $$
  select 15;
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

  select count(*) into v_members
  from public.household_members
  where household_id = v_invite.household_id;

  if v_members >= public.household_member_cap() then
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

revoke all on function public.household_member_cap() from public, anon;
grant execute on function public.household_member_cap() to authenticated;
