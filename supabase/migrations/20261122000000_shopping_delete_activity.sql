-- Log shopping-item deletions in the activity feed.
-- Shopping items are hard-deleted (there is no audit need to keep them), so the feed
-- entry carries the item name in its payload.

alter table public.activity_events drop constraint activity_events_kind_check;
alter table public.activity_events add constraint activity_events_kind_check check (kind in (
  'expense_added', 'expense_deleted',
  'settlement_recorded', 'settlement_deleted',
  'shopping_added', 'shopping_bought', 'shopping_reopened', 'shopping_deleted'
));

create or replace function public.log_shopping_delete_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_events (household_id, actor_id, kind, entity_id, payload)
  values (old.household_id, auth.uid(), 'shopping_deleted', old.id,
          jsonb_build_object('name', old.name));
  return null;
end;
$$;

create trigger shopping_delete_activity
  after delete on public.shopping_items
  for each row execute function public.log_shopping_delete_activity();
