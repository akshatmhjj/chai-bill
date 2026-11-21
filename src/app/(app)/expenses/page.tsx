import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { buttonStyles } from "@/components/ui/Button";
import { requireOnboarded } from "@/lib/data/context";
import { loadExpenses, loadMonthStats } from "@/lib/data/queries";
import { monthStartInIndia, todayInIndia } from "@/lib/dates/india";
import { namesList } from "@/lib/people";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const [{ open }, ctx] = await Promise.all([searchParams, requireOnboarded()]);
  const [expenses, month] = await Promise.all([loadExpenses(), loadMonthStats(ctx, monthStartInIndia())]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Expenses"
        subtitle={ctx.others.length ? namesList([ctx.me.name, ...ctx.others.map((m) => m.name)]) : ctx.household.name}
        me={ctx.me}
        action={
          <div className="hidden lg:block">
            <Link href="/expenses/new" className={buttonStyles({ size: "sm" })}>
              <Plus className="size-4" aria-hidden />
              Add expense
            </Link>
          </div>
        }
      />
      <ExpenseList expenses={expenses} me={ctx.me} members={ctx.members} seenAt={ctx.seenAt} today={todayInIndia()} month={month} openId={open} />
    </div>
  );
}
