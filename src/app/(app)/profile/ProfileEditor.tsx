"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { saveProfileAction } from "@/app/onboarding/actions";
import { AvatarPicker, AvatarStage } from "@/components/avatar/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { AvatarKey } from "@/lib/avatars";
import { haptic } from "@/lib/haptics";

/** Change your name and avatar. Your roommate sees the change straight away. */
export function ProfileEditor({ name: initialName, avatar: initialAvatar }: { name: string; avatar: AvatarKey }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState<AvatarKey>(initialAvatar);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openSheet() {
    setName(initialName);
    setAvatar(initialAvatar);
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveProfileAction({ name, avatar });
      if (!result.ok) return setError(result.error);
      toast({ title: "Profile updated" });
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={openSheet}>
        <Pencil className="size-4" aria-hidden />
        Edit profile
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Edit your profile"
        footer={
          <Button full size="lg" onClick={save} loading={pending} disabled={!name.trim()}>
            Save changes
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <AvatarStage avatar={avatar} name={name} size={96} />
          <Field label="Your name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <AvatarPicker
            value={avatar}
            onChange={(next) => {
              haptic();
              setAvatar(next);
            }}
          />
          {error && <p role="alert" className="text-sm text-negative">{error}</p>}
        </div>
      </Sheet>
    </>
  );
}
