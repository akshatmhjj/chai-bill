"use client";

import { RefreshCw, Share2 } from "lucide-react";
import { useState, useTransition } from "react";
import { createInviteAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";

/** The single-use invite code for the flat, with copy, share and "make a new one". */
export function InviteCard({ householdId, householdName, code: initialCode }: { householdId: string; householdName: string; code: string | null }) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function newCode() {
    setError(null);
    startTransition(async () => {
      const result = await createInviteAction({ householdId });
      if (!result.ok) return setError(result.error);
      setCode(result.code);
    });
  }

  async function share() {
    if (!code) return;
    try {
      await navigator.share({
        title: "Join my flat on Chai Bill",
        text: `Join ${householdName} on Chai Bill. Open the app, choose "Join with a code" and paste this: ${code}`,
      });
    } catch {
      // Cancelled or unsupported: the copy button is right there.
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const groups = code ? (code.match(/.{1,8}/g) ?? [code]) : [];

  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-3">Invite code</p>
      {code ? (
        <p aria-label={`Invite code ${code}`} className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[15px] font-semibold tracking-wide sm:grid-cols-4">
          {groups.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-ink-3">No active code. Make a new one.</p>
      )}
      <p className="mt-2 text-xs text-ink-3">Valid for 7 days · works once</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {code && <CopyButton text={code} label="Copy code" />}
        {code && canShare && (
          <Button variant="secondary" onClick={share}>
            <Share2 className="size-4" aria-hidden />
            Share
          </Button>
        )}
        <Button variant="ghost" onClick={newCode} loading={pending}>
          {!pending && <RefreshCw className="size-4" aria-hidden />}
          New code
        </Button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-negative">{error}</p>}
    </div>
  );
}
