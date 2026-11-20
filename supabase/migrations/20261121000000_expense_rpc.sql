-- Atomic create/update for expenses together with their shares.
--
-- Shares must be written in the same transaction as the expense: the deferred
-- check requires that every expense has shares summing to its total at COMMIT.
-- Separate PostgREST calls would each commit on their own and fail. This function
-- runs as the caller (SECURITY INVOKER), so every RLS policy still applies.

create or replace function public.upsert_expense(
  p_expense_id uuid,
  p_household_id uuid,
  p_scope public.expense_scope,
  p_description text,
  p_amount_paise bigint,
  p_paid_by uuid,
  p_split_method public.split_method,
  p_expense_date date,
  p_shares jsonb
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
      paid_by, split_method, expense_date
    )
    values (
      p_household_id, auth.uid(), p_scope, p_description, p_amount_paise,
      p_paid_by, p_split_method, p_expense_date
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
        updated_at = now()
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

revoke all on function public.upsert_expense(uuid, uuid, public.expense_scope, text, bigint, uuid, public.split_method, date, jsonb) from public, anon;
grant execute on function public.upsert_expense(uuid, uuid, public.expense_scope, text, bigint, uuid, public.split_method, date, jsonb) to authenticated;
