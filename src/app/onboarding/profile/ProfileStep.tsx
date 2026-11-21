"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AvatarPicker, AvatarStage } from "@/components/avatar/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { StepDots } from "@/components/ui/StepDots";
import type { AvatarKey } from "@/lib/avatars";
import { haptic } from "@/lib/haptics";
import { saveProfileAction } from "../actions";

export function ProfileStep({ suggestedName, suggestedAvatar }: { suggestedName: string; suggestedAvatar: AvatarKey }) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [avatar, setAvatar] = useState<AvatarKey>(suggestedAvatar);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveProfileAction({ name, avatar });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/onboarding/flat");
    });
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
        <StepDots step={1} labels={["You", "Your flat", "Invite"]} />
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">Who&apos;s this?</h1>
        <p className="text-ink-2">Pick the face your roommate will see next to everything you add.</p>
      </div>

      <AvatarStage avatar={avatar} name={name} />

      <Field
        label="Your name"
        name="name"
        autoComplete="given-name"
        placeholder="Akshat"
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-ink-2">Choose an avatar</p>
        <AvatarPicker
          value={avatar}
          onChange={(next) => {
            haptic();
            setAvatar(next);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}

      <div className="mt-auto pt-2">
        <Button type="submit" size="lg" full loading={pending}>
          Continue
          {!pending && <ArrowRight className="size-5" aria-hidden />}
        </Button>
      </div>
    </motion.form>
  );
}
