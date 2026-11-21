"use client";

import { motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createNestAction } from "../../nests/actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

const IDEAS = ["4B Koramangala", "The Ghar", "Chai & Chaos", "Flat 302", "Our Little Nest"];

export function NewNestForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createNestAction({ name });
      if (!result.ok) return setError(result.error);
      router.push(`/n/${result.id}/invite?new=1`);
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link href="/" className="inline-flex w-fit items-center gap-1 rounded-lg px-1 py-1 text-sm font-semibold text-ink-2 hover:bg-sunken">
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">Name your nest.</h1>
        <p className="text-ink-2">Something everyone in it will recognise. You can change it later.</p>
      </div>

      <form onSubmit={create} noValidate className="flex flex-col gap-5">
        <Field label="Nest name" name="name" placeholder="4B Koramangala" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} error={error} />
        <div className="flex flex-wrap gap-2" aria-label="Name ideas">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setName(idea)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-2 transition-transform hover:bg-surface-2 active:scale-95"
            >
              {idea}
            </button>
          ))}
        </div>
        <Button type="submit" size="lg" full loading={pending} disabled={!name.trim()}>
          Make the nest
          {!pending && <ArrowRight className="size-5" aria-hidden />}
        </Button>
      </form>
    </motion.div>
  );
}
