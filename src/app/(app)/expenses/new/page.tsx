import type { Metadata } from "next";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { requireOnboarded } from "@/lib/data/context";
import { todayInIndia } from "@/lib/dates/india";

export const metadata: Metadata = { title: "Add expense" };

export default async function NewExpensePage() {
  const ctx = await requireOnboarded();
  return <ExpenseForm me={ctx.me} members={ctx.members} today={todayInIndia()} />;
}
