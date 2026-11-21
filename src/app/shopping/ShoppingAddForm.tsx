"use client";

import { useActionState } from "react";
import type { ShoppingActionState } from "./actions";

const inputClass = "rounded-md border border-neutral-300 px-3 py-2 text-base";

export function ShoppingAddForm({
  action,
}: {
  action: (prev: ShoppingActionState, formData: FormData) => Promise<ShoppingActionState>;
}) {
  const [state, formAction, pending] = useActionState<ShoppingActionState, FormData>(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input name="name" required maxLength={120} placeholder="Add an item" className={`${inputClass} flex-1`} />
        <input name="quantity" maxLength={40} placeholder="Qty" className={`${inputClass} w-24`} />
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60">
        {pending ? "Adding…" : "Add to list"}
      </button>
    </form>
  );
}
