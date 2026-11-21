import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { requireOnboarded } from "@/lib/data/context";
import { loadExpense } from "@/lib/data/queries";
import { todayInIndia } from "@/lib/dates/india";

export const metadata: Metadata = { title: "Edit expense" };

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOnboarded();

  // RLS hides expenses this person cannot see, so someone else's id (or a personal expense of
  // their roommate's) simply comes back empty.
  const expense = await loadExpense(id);
  if (!expense) notFound();
  if (expense.scope === "personal" && expense.createdBy !== ctx.userId) notFound();

  return <ExpenseForm me={ctx.me} members={ctx.members} today={todayInIndia()} expense={expense} />;
}
