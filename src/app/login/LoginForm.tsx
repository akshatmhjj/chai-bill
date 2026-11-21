"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Mail } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { IllustrationHome } from "@/components/brand/Illustrations";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loginSchema } from "@/lib/validation/household";

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(linkError ? "That link didn't work or has expired. Send yourself a new one." : null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);

    if (authError) {
      setError(authError.message);
      return;
    }
    setEmail(parsed.data.email);
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 pb-8 pt-6 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
      <div className="flex flex-1 flex-col lg:max-w-md">
        <div className="mb-6 lg:mb-12">
          <Logo size={36} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="-mx-2 mb-4 lg:hidden"
        >
          <IllustrationHome className="mx-auto w-full max-w-xs" />
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {sent ? (
            <motion.section
              key="sent"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
                <Mail className="size-7" aria-hidden />
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">Check your email</h1>
              <p className="text-ink-2">
                We sent a sign-in link to <strong className="text-ink">{email}</strong>. Open it on this device and you&apos;re in.
              </p>
              <p className="text-sm text-ink-3">Nothing there? Look in spam, or wait a minute and try again.</p>
              <div>
                <Button variant="ghost" onClick={() => setSent(false)}>
                  Use a different email
                </Button>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="form"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="space-y-3">
                <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight lg:text-5xl">
                  Your flat&apos;s little ledger.
                </h1>
                <p className="text-lg text-ink-2">
                  Split what you spend, settle up without the awkwardness, and keep the shopping list in one place. For the whole flat.
                </p>
              </div>

              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
                <Field
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                />
                <Button type="submit" size="lg" full loading={busy}>
                  Send sign-in link
                  {!busy && <ArrowRight className="size-5" aria-hidden />}
                </Button>
              </form>
              <p className="text-sm text-ink-3">No password to remember. We&apos;ll email you a link, and that&apos;s all it takes.</p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="hidden flex-1 lg:block"
      >
        <div className="rounded-[2rem] bg-accent-soft/60 p-10">
          <IllustrationHome className="w-full" />
        </div>
      </motion.div>
    </main>
  );
}
