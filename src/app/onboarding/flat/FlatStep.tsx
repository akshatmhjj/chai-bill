"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ClipboardPaste } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { StepDots } from "@/components/ui/StepDots";
import type { AvatarKey } from "@/lib/avatars";
import { createFlatAction, joinFlatAction } from "../actions";

type Mode = "start" | "join";

export function FlatStep({ name, avatar }: { name: string; avatar: AvatarKey }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("start");
  const [flatName, setFlatName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      if (mode === "start") {
        const result = await createFlatAction({ name: flatName });
        if (!result.ok) return setError(result.error);
        router.push("/onboarding/invite");
      } else {
        const result = await joinFlatAction({ code });
        if (!result.ok) return setError(result.error);
        router.push("/?welcome=1");
      }
    });
  }

  async function paste() {
    try {
      setCode(await navigator.clipboard.readText());
    } catch {
      setError("Couldn't read the clipboard. Paste the code into the box instead.");
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      noValidate
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col gap-6"
    >
      <div className="space-y-3">
        <StepDots step={2} labels={["You", "Your flat", "Invite"]} />
        <div className="flex items-center gap-3">
          <Avatar avatar={avatar} size={44} ring="surface" className="shadow-soft" />
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">Hi {name}.</h1>
        </div>
        <p className="text-ink-2">Start a flat for you and your roommate, or join the one they already made.</p>
      </div>

      <Segmented<Mode>
        label="Start or join"
        value={mode}
        onChange={(next) => {
          setMode(next);
          setError(null);
        }}
        options={[
          { value: "start", label: "Start a flat" },
          { value: "join", label: "Join with a code" },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        {mode === "start" ? (
          <motion.div key="start" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }} className="flex flex-col gap-3">
            <Field
              label="Flat name"
              name="flatName"
              placeholder="4B Koramangala"
              maxLength={60}
              hint="Something you'll both recognise."
              value={flatName}
              onChange={(e) => setFlatName(e.target.value)}
              error={error}
            />
          </motion.div>
        ) : (
          <motion.div key="join" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="flex flex-col gap-3">
            <Field
              label="Invite code"
              name="code"
              placeholder="Paste the code from your roommate"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono"
              hint="It's a long code, 32 characters. Paste it in."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              error={error}
              trailing={
                <button
                  type="button"
                  onClick={paste}
                  aria-label="Paste from clipboard"
                  className="flex size-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink active:scale-95"
                >
                  <ClipboardPaste className="size-5" aria-hidden />
                </button>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-2">
        <Button type="submit" size="lg" full loading={pending}>
          {mode === "start" ? "Create flat" : "Join flat"}
          {!pending && <ArrowRight className="size-5" aria-hidden />}
        </Button>
      </div>
    </motion.form>
  );
}
