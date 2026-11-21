import { isCategoryKey, type CategoryKey } from "@/lib/categories";
import { buildHouseholdSummary, type HouseholdSummary } from "@/lib/money/summary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OnboardedContext } from "./context";

export interface ExpenseShareView {
  userId: string;
  paise: number;
  basisPoints: number | null;
}

export interface ExpenseView {
  id: string;
  scope: "shared" | "personal";
  description: string;
  amountPaise: number;
  expenseDate: string;
  paidBy: string;
  createdBy: string;
  createdAt: string;
  category: CategoryKey | null;
  splitMethod: "equal" | "amount" | "percent";
  shares: ExpenseShareView[];
}

export interface SettlementView {
  id: string;
  fromUser: string;
  toUser: string;
  amountPaise: number;
  method: "upi" | "cash" | "other";
  reference: string | null;
  note: string | null;
  settledOn: string;
  createdBy: string;
  createdAt: string;
}

export interface ShoppingItemView {
  id: string;
  name: string;
  quantity: string | null;
  status: "open" | "bought";
  addedBy: string;
  boughtBy: string | null;
  createdAt: string;
  boughtAt: string | null;
}

export interface ActivityView {
  id: number;
  kind: string;
  actorId: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const EXPENSE_COLUMNS =
  "id, scope, description, amount_paise, expense_date, paid_by, created_by, created_at, category, split_method, expense_shares(user_id, share_paise, basis_points)";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows are untyped here; each loader maps them to a typed view. */
function toExpense(row: any): ExpenseView {
  return {
    id: row.id,
    scope: row.scope,
    description: row.description,
    amountPaise: row.amount_paise,
    expenseDate: row.expense_date,
    paidBy: row.paid_by,
    createdBy: row.created_by,
    createdAt: row.created_at,
    category: isCategoryKey(row.category) ? row.category : null,
    splitMethod: row.split_method,
    shares: (row.expense_shares ?? []).map((s: any) => ({ userId: s.user_id, paise: s.share_paise, basisPoints: s.basis_points })),
  };
}

function toSettlement(row: any): SettlementView {
  return {
    id: row.id,
    fromUser: row.from_user,
    toUser: row.to_user,
    amountPaise: row.amount_paise,
    method: row.method,
    reference: row.reference,
    note: row.note,
    settledOn: row.settled_on,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toShoppingItem(row: any): ShoppingItemView {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    status: row.status,
    addedBy: row.added_by,
    boughtBy: row.bought_by,
    createdAt: row.created_at,
    boughtAt: row.bought_at,
  };
}

function toActivity(row: any): ActivityView {
  return {
    id: row.id,
    kind: row.kind,
    actorId: row.actor_id,
    entityId: row.entity_id,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Newest first. RLS decides which rows: shared ones for the flat, personal ones only for their creator. */
export async function loadExpenses(limit = 100): Promise<ExpenseView[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .is("deleted_at", null)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(toExpense);
}

export async function loadExpense(id: string): Promise<ExpenseView | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("expenses").select(EXPENSE_COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle();
  return data ? toExpense(data) : null;
}

export async function loadSettlements(householdId: string, limit = 50): Promise<SettlementView[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("settlements")
    .select("id, from_user, to_user, amount_paise, method, reference, note, settled_on, created_by, created_at")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .order("settled_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(toSettlement);
}

export async function loadShopping(householdId: string): Promise<ShoppingItemView[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("shopping_items")
    .select("id, name, quantity, status, added_by, bought_by, created_at, bought_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(toShoppingItem);
}

export async function loadActivity(householdId: string, limit = 80): Promise<ActivityView[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("activity_events")
    .select("id, kind, actor_id, entity_id, payload, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  return (data ?? []).map(toActivity);
}

/** Balances, the settle-up plan and the "why" behind each balance. Shared expenses only. */
export async function loadSummary(ctx: OnboardedContext): Promise<HouseholdSummary> {
  const supabase = await createSupabaseServerClient();
  const [{ data: expenseRows }, { data: settlementRows }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, paid_by, amount_paise, expense_shares(user_id, share_paise)")
      .eq("household_id", ctx.household.id)
      .eq("scope", "shared")
      .is("deleted_at", null),
    supabase.from("settlements").select("id, from_user, to_user, amount_paise").eq("household_id", ctx.household.id).is("deleted_at", null),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return buildHouseholdSummary({
    members: ctx.members.map((m) => m.userId),
    expenses: (expenseRows ?? []).map((e: any) => ({
      id: e.id,
      payerId: e.paid_by,
      totalPaise: e.amount_paise,
      shares: (e.expense_shares ?? []).map((s: any) => ({ memberId: s.user_id, paise: s.share_paise })),
    })),
    settlements: (settlementRows ?? []).map((s: any) => ({
      id: s.id,
      fromId: s.from_user,
      toId: s.to_user,
      paise: s.amount_paise,
    })),
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** What the flat spent together since `monthStart`, and the part that is this person's. */
export async function loadMonthStats(ctx: OnboardedContext, monthStart: string): Promise<{ totalPaise: number; yourSharePaise: number }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("expenses")
    .select("amount_paise, expense_shares(user_id, share_paise)")
    .eq("household_id", ctx.household.id)
    .eq("scope", "shared")
    .is("deleted_at", null)
    .gte("expense_date", monthStart);

  let totalPaise = 0;
  let yourSharePaise = 0;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  for (const row of (data ?? []) as any[]) {
    totalPaise += row.amount_paise;
    for (const share of row.expense_shares ?? []) {
      if (share.user_id === ctx.userId) yourSharePaise += share.share_paise;
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { totalPaise, yourSharePaise };
}
