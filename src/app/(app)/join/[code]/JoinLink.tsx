"use client";

import { motion } from "motion/react";
import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { joinNestAction } from "../../nests/actions";
import { Button } from "@/components/ui/Button";
import { IllustrationBasket } from "@/components/brand/Illustrations";
import { CODE_COOKIE } from "@/lib/nests/invite";

/**
 * Remembers the code in a short-lived cookie before anything else, so signing in (which leaves the
 * site for an email) brings the person back here.
 */
export function JoinLink({ code, state }: { code: string; state: "signed-out" | "no-profile" | "ready" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    document.cookie = `${CODE_COOKIE}=${encodeURIComponent(`/join/${code}`)}; path=/; max-age=1800; samesite=lax`;
  }, [code]);

  function join() {
    setError(null);
    startTransition(async () => {
      const result = await joinNestAction({ code });
      if (!result.ok) return setError(result.error);
      document.cookie = `${CODE_COOKIE}=; path=/; max-age=0`;
      router.push(`/n/${result.id}?welcome=1`);
    });
  }

  return (
    <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <IllustrationBasket className="w-56" />
      <div className="space-y-2">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-ink">
          <Users className="size-4" aria-hidden /> You&apos;ve been invited
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">Come and join the nest.</h1>
        <p className="text-ink-2">Split the bills, settle up, and keep the shopping list in one place.</p>
      </div>

      {error && <p role="alert" className="text-sm text-negative">{error}</p>}

      {state === "ready" && (
        <Button size="lg" full onClick={join} loading={pending}>
          Join this nest
          {!pending && <ArrowRight className="size-5" aria-hidden />}
        </Button>
      )}
      {state === "no-profile" && (
        <Link href="/onboarding/profile" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-base font-semibold text-on-accent shadow-soft">
          Set up your profile first <ArrowRight className="size-5" aria-hidden />
        </Link>
      )}
      {state === "signed-out" && (
        <Link href="/login" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-base font-semibold text-on-accent shadow-soft">
          Sign in to join <ArrowRight className="size-5" aria-hidden />
        </Link>
      )}
      <p className="text-xs text-ink-3">Code: {code}</p>
    </motion.main>
  );
}
