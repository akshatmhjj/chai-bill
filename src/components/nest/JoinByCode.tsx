"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinNestAction } from "@/app/(app)/nests/actions";
import { Button } from "@/components/ui/Button";

/** Type or paste a code; joins the nest it belongs to. Spaces, dashes and capitals are fine. */
export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function join(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinNestAction({ code });
      if (!result.ok) return setError(result.error);
      router.push(`/n/${result.id}?welcome=1`);
    });
  }

  return (
    <form onSubmit={join} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3 shadow-soft">
      <label htmlFor="join-code" className="px-1 text-sm font-semibold text-ink-2">
        Have a code?
      </label>
      <div className="flex gap-2">
        <input
          id="join-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="k7qx-m9tn"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="h-12 min-w-0 flex-1 rounded-ctl border border-line bg-canvas px-3 font-mono text-base outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <Button type="submit" loading={pending} disabled={code.trim().length < 8} aria-label="Join nest">
          <ArrowRight className="size-5" aria-hidden />
        </Button>
      </div>
      {error && <p role="alert" className="px-1 text-sm text-negative">{error}</p>}
    </form>
  );
}
