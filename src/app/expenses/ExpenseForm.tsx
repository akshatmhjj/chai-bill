"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/money/paise";
import { parseExpenseForm, type ParseResult } from "@/lib/expenses/form";
import type { ExpenseActionState } from "./actions";

export interface MemberOption {
  userId: string;
  displayName: string;
}

export interface ExpenseInitial {
  scope: "shared" | "personal";
  description: string;
  amount: string;
  expenseDate: string;
  paidBy: string;
  splitMethod: "equal" | "amount" | "percent";
  participants: string[];
  exact: Record<string, string>;
  percent: Record<string, string>;
}

interface Props {
  members: MemberOption[];
  currentUserId: string;
  hasHousehold: boolean;
  action: (prev: ExpenseActionState, formData: FormData) => Promise<ExpenseActionState>;
  initial?: ExpenseInitial;
  submitLabel: string;
  today: string;
}

const inputClass = "rounded-md border border-neutral-300 px-3 py-2 text-base";

export function ExpenseForm({ members, currentUserId, hasHousehold, action, initial, submitLabel, today }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ExpenseActionState, FormData>(action, null);
  const [scope, setScope] = useState<"shared" | "personal">(initial?.scope ?? (hasHousehold ? "shared" : "personal"));
  const [method, setMethod] = useState<"equal" | "amount" | "percent">(initial?.splitMethod ?? "equal");
  const [preview, setPreview] = useState<ParseResult | null>(null);

  const names = new Map(members.map((m) => [m.userId, m.displayName]));
  const nameOf = (id: string) => names.get(id) ?? "Someone";

  function refresh() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    setScope(((data.get("scope") as string) || "shared") as "shared" | "personal");
    setMethod(((data.get("splitMethod") as string) || "equal") as "equal" | "amount" | "percent");
    setPreview(parseExpenseForm(data, currentUserId));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form ref={formRef} action={formAction} onChange={refresh} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select name="scope" defaultValue={scope} className={inputClass}>
          {hasHousehold && <option value="shared">Shared with the flat</option>}
          <option value="personal">Personal</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Description
        <input name="description" required maxLength={120} defaultValue={initial?.description} className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Amount (₹)
          <input name="amount" inputMode="decimal" required defaultValue={initial?.amount} placeholder="0.00" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input name="expenseDate" type="date" required defaultValue={initial?.expenseDate ?? today} className={inputClass} />
        </label>
      </div>

      {scope === "shared" && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Paid by
            <select name="paidBy" defaultValue={initial?.paidBy ?? currentUserId} className={inputClass}>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.displayName}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Split
            <select name="splitMethod" defaultValue={method} className={inputClass}>
              <option value="equal">Equal</option>
              <option value="amount">Exact amounts</option>
              <option value="percent">Percentages</option>
            </select>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1 text-sm">Who shares it</legend>
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="participants"
                  value={m.userId}
                  defaultChecked={initial ? initial.participants.includes(m.userId) : true}
                  className="h-4 w-4"
                />
                <span className="flex-1 text-sm">{m.displayName}</span>
                {method === "amount" && (
                  <input
                    name={`exact_${m.userId}`}
                    inputMode="decimal"
                    placeholder="₹"
                    defaultValue={initial?.exact[m.userId]}
                    className={`${inputClass} w-28`}
                  />
                )}
                {method === "percent" && (
                  <input
                    name={`percent_${m.userId}`}
                    inputMode="decimal"
                    placeholder="%"
                    defaultValue={initial?.percent[m.userId]}
                    className={`${inputClass} w-24`}
                  />
                )}
              </div>
            ))}
          </fieldset>
        </>
      )}

      <section aria-live="polite" className="rounded-md bg-neutral-100 p-3 text-sm">
        <p className="pb-1 font-medium">Split preview</p>
        {preview && !preview.ok && <p className="text-neutral-600">{preview.error}</p>}
        {preview?.ok && (
          <ul className="flex flex-col gap-1">
            {preview.expense.shares.map((s) => (
              <li key={s.userId} className="flex justify-between">
                <span>{nameOf(s.userId)}{s.userId === preview.expense.paidBy ? " (paid)" : ""}</span>
                <span className="font-mono">{formatINR(s.sharePaise)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-neutral-300 pt-1 font-medium">
              <span>Total</span>
              <span className="font-mono">{formatINR(preview.expense.amountPaise)}</span>
            </li>
          </ul>
        )}
      </section>

      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || (preview !== null && !preview.ok)}
        className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
