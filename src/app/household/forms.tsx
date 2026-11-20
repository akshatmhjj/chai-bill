"use client";

import { useActionState, useState } from "react";
import {
  createHouseholdAction,
  createInviteAction,
  joinHouseholdAction,
  type ActionState,
} from "./actions";

const inputClass = "rounded-md border border-neutral-300 px-3 py-2 text-base";
const buttonClass = "rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60";

export function OnboardingForms() {
  return (
    <div className="flex flex-col gap-10">
      <CreateForm />
      <JoinForm />
    </div>
  );
}

function CreateForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createHouseholdAction, null);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Start a flat</h2>
      <form action={action} className="flex flex-col gap-3">
        <input name="householdName" placeholder="Flat name, e.g. 4B Koramangala" required className={inputClass} />
        <input name="displayName" placeholder="Your name" required className={inputClass} />
        {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending} className={buttonClass}>
          Create flat
        </button>
      </form>
    </section>
  );
}

function JoinForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(joinHouseholdAction, null);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Join a flat</h2>
      <p className="text-sm text-neutral-600">Ask your roommate for an invite code.</p>
      <form action={action} className="flex flex-col gap-3">
        <input name="code" placeholder="Invite code" required autoComplete="off" className={inputClass} />
        <input name="displayName" placeholder="Your name" required className={inputClass} />
        {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending} className={buttonClass}>
          Join flat
        </button>
      </form>
    </section>
  );
}

export function InviteButton({ householdId }: { householdId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    setError(null);
    const result = await createInviteAction(householdId);
    setBusy(false);
    if (result?.error) setError(result.error);
    else if (result?.code) setCode(result.code);
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={onClick} disabled={busy} className={buttonClass}>
        {busy ? "Creating invite…" : "Create invite code"}
      </button>
      {code && (
        <p className="break-all rounded-md bg-neutral-100 p-3 font-mono text-sm">
          {code}
          <span className="block pt-1 font-sans text-xs text-neutral-600">
            Single use, valid for 7 days. Your roommate enters it under &ldquo;Join a flat&rdquo;.
          </span>
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
