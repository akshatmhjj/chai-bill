import type { Metadata } from "next";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { requireNest } from "@/lib/data/context";
import { todayInIndia } from "@/lib/dates/india";

export const metadata: Metadata = { title: "Add expense" };

export default async function NewExpensePage({ params }: { params: Promise<{ nestId: string }> }) {
  const { nestId } = await params;
  const ctx = await requireNest(nestId);
  return <ExpenseForm me={ctx.me} members={ctx.members} today={todayInIndia()} />;
}
