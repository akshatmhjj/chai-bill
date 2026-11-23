import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { buttonStyles } from "@/components/ui/Button";
import { LoadMore } from "@/components/ui/LoadMore";
import { requireNest } from "@/lib/data/context";
import { loadExpense, loadExpenses, loadMonthStats } from "@/lib/data/queries";
import { monthStartInIndia, todayInIndia } from "@/lib/dates/india";
import { limitFromParam, takePage } from "@/lib/paging";
import { namesList } from "@/lib/people";

export const metadata: Metadata = { title: "Expenses" };

const PAGE_SIZE = 20;

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ nestId: string }>;
  searchParams: Promise<{ open?: string; limit?: string }>;
}) {
  const { nestId } = await params;
  const [{ open, limit: limitParam }, ctx] = await Promise.all([searchParams, requireNest(nestId)]);
  const limit = limitFromParam(limitParam, PAGE_SIZE);

  const [rows, month, openedExpense] = await Promise.all([
    loadExpenses(limit + 1),
    loadMonthStats(ctx, monthStartInIndia()),
    open ? loadExpense(open) : Promise.resolve(null),
  ]);
  const { items: expenses, hasMore } = takePage(rows, limit);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Expenses"
        subtitle={ctx.others.length ? namesList([ctx.me.name, ...ctx.others.map((m) => m.name)]) : ctx.household.name}
        me={ctx.me}
        action={
          <div className="hidden lg:block">
            <Link href={`/n/${nestId}/expenses/new`} className={buttonStyles({ size: "sm" })}>
              <Plus className="size-4" aria-hidden />
              Add expense
            </Link>
          </div>
        }
      />
      <ExpenseList
        expenses={expenses}
        me={ctx.me}
        members={ctx.members}
        seenAt={ctx.seenAt}
        today={todayInIndia()}
        month={month}
        openId={open}
        openedExpense={openedExpense}
      />
      {hasMore && <LoadMore href={`/n/${nestId}/expenses?limit=${limit + PAGE_SIZE}`} label="Show older expenses" />}
    </div>
  );
}
