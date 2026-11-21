-- A settlement records a payment the signed-in user made. Before this, any member could
-- record a payment from another member (only household membership was checked).
-- The payer must now be the caller.

drop policy if exists settlements_insert on public.settlements;

create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and from_user = auth.uid()
    and public.is_household_member(household_id)
    and exists (select 1 from public.household_members hm
                where hm.household_id = settlements.household_id and hm.user_id = settlements.to_user)
  );
