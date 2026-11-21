-- Nests: friendlier invites and several nests per person.
--
-- The table is still called households (renaming tables would churn every policy); the app now
-- calls them "nests". Changes here:
--   * invite codes are 8 readable characters (no 0/o/1/i/l), typed or scanned, shown as two groups of 4
--   * one code can be used by several people until it is refreshed or expires (a QR works for a room of people)
--   * making a new code revokes the old one
--   * joining is tolerant of spaces, dashes and capitals
-- Membership was already many-to-many; nothing about the cap or the policies changes.

alter table public.household_invites add column if not exists revoked_at timestamptz;

create or replace function public.new_invite_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  candidate text;
  attempt integer := 0;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.household_invites where code = candidate);
    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'could not make a unique invite code';
    end if;
  end loop;
  return candidate;
end;
$$;

alter table public.household_invites alter column code set default public.new_invite_code();

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

  -- A new code replaces the old one, so a refreshed QR stops working for anyone who only has the old one.
  update public.household_invites
  set revoked_at = now()
  where household_id = p_household
    and revoked_at is null
    and expires_at > now();

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
  v_clean text := lower(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  v_invite public.household_invites%rowtype;
  v_members integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_invite
  from public.household_invites
  where code = v_clean
  for update;

  if not found or v_invite.revoked_at is not null or v_invite.expires_at < now() then
    raise exception 'invite is invalid or expired' using errcode = 'P0001';
  end if;

  -- Already in this nest: just open it.
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

  return v_invite.household_id;
end;
$$;

revoke all on function public.new_invite_code() from public, anon, authenticated;
revoke all on function public.create_household_invite(uuid) from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
