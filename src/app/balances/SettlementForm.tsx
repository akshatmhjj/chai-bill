"use client";

import { useActionState } from "react";
import type { SettlementActionState } from "./actions";

interface Props {
  others: { userId: string; displayName: string }[];
  action: (prev: SettlementActionState, formData: FormData) => Promise<SettlementActionState>;
  defaultTo?: string;
  defaultAmount?: string;
  today: string;
}

const inputClass = "rounded-md border border-neutral-300 px-3 py-2 text-base";

export function SettlementForm({ others, action, defaultTo, defaultAmount, today }: Props) {
  const [state, formAction, pending] = useActionState<SettlementActionState, FormData>(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Paid to
        <select name="to" defaultValue={defaultTo} required className={inputClass}>
          {others.map((o) => (
            <option key={o.userId} value={o.userId}>{o.displayName}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Amount (₹)
          <input name="amount" inputMode="decimal" required defaultValue={defaultAmount} placeholder="0.00" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input name="settledOn" type="date" required defaultValue={today} className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Method
        <select name="method" defaultValue="upi" className={inputClass}>
          <option value="upi">UPI</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        UPI reference (optional)
        <input name="reference" maxLength={80} placeholder="Transaction ID" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Note (optional)
        <input name="note" maxLength={280} className={inputClass} />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60">
        {pending ? "Saving…" : "Record payment"}
      </button>
    </form>
  );
}
