"use client";

import { AnimatePresence, motion } from "motion/react";
import { PartyPopper, RefreshCw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { StepDots } from "@/components/ui/StepDots";
import type { AvatarKey } from "@/lib/avatars";
import { avatarOrDefault } from "@/lib/avatars";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createInviteAction } from "../actions";

interface Props {
  householdId: string;
  householdName: string;
  userId: string;
  me: { name: string; avatar: AvatarKey };
  code: string | null;
}

/** Listens for the roommate joining this flat. Resolves their name and avatar from the new rows. */
function useRoommateJoin(householdId: string, userId: string, onJoin: (person: { name: string; avatar: AvatarKey }) => void) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    const channel = supabase.channel(`invite-wait-${householdId}`);
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "household_members", filter: `household_id=eq.${householdId}` },
      async (change) => {
        const row = change.new as { user_id: string; display_name: string };
        if (row.user_id === userId) return;
        const { data } = await supabase.from("profiles").select("avatar_key").eq("user_id", row.user_id).maybeSingle();
        onJoin({ name: row.display_name, avatar: avatarOrDefault(data?.avatar_key) });
      },
    );
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (!cancelled) channel.subscribe();
    })();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // onJoin is intentionally not a dependency: it only sets state and navigates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, userId]);
}

export function InviteStep({ householdId, householdName, userId, me, code: initialCode }: Props) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [joined, setJoined] = useState<{ name: string; avatar: AvatarKey } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useRoommateJoin(householdId, userId, (person) => {
    setJoined(person);
    setTimeout(() => router.push("/"), 2400);
  });

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
    const text = `Join ${householdName} on Chai Bill. Open the app, choose "Join with a code" and paste this: ${code}`;
    try {
      await navigator.share({ title: "Join my flat on Chai Bill", text });
    } catch {
      // Cancelled or unsupported: the copy button is right there.
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const groups = code ? (code.match(/.{1,8}/g) ?? [code]) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col gap-6"
    >
      <div className="space-y-3">
        <StepDots step={3} labels={["You", "Your flat", "Invite"]} />
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">{householdName} is ready.</h1>
        <p className="text-ink-2">Now bring your roommate in. Send them this code. It works once.</p>
      </div>

      {/* The two of you: your avatar, and a placeholder that fills in when they join. */}
      <div className="flex items-center justify-center gap-5 py-2">
        <Avatar avatar={me.avatar} size={76} ring="surface" className="shadow-lift" />
        <div className="flex h-0.5 w-10 items-center justify-center" aria-hidden>
          <motion.div
            className="h-0.5 w-full rounded-full bg-line-strong"
            animate={joined ? { backgroundColor: "var(--positive)" } : undefined}
          />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {joined ? (
            <motion.div
              key="joined"
              initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 14 }}
            >
              <Avatar avatar={joined.avatar} size={76} ring="surface" className="shadow-lift" />
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              exit={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              className="flex size-[76px] items-center justify-center rounded-full border-2 border-dashed border-line-strong text-3xl text-ink-3"
              aria-label="Waiting for your roommate"
            >
              ?
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {joined ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 rounded-card bg-positive-soft px-5 py-6 text-center"
          >
            <PartyPopper className="size-7 text-positive" aria-hidden />
            <p className="font-display text-2xl font-semibold text-positive">{joined.name} joined!</p>
            <p className="text-sm text-ink-2">Taking you to your flat…</p>
          </motion.div>
        ) : (
          <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <div className="rounded-card border border-dashed border-line-strong bg-surface p-5 text-center shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-3">Invite code</p>
              {code ? (
                <p aria-label={`Invite code ${code}`} className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[17px] font-semibold tracking-wider text-ink">
                  {groups.map((group, i) => (
                    <span key={i}>{group}</span>
                  ))}
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-3">No active code. Make a new one.</p>
              )}
              <p className="mt-3 text-xs text-ink-3">Valid for 7 days · works once</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
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
            {error && (
              <p role="alert" className="text-center text-sm text-negative">
                {error}
              </p>
            )}
            <p className="flex items-center justify-center gap-2 text-sm text-ink-3">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              Waiting for your roommate to join…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-2">
        <Button variant="secondary" size="lg" full onClick={() => router.push("/")}>
          Continue to my flat
        </Button>
        <p className="mt-2 text-center text-xs text-ink-3">You can invite them later from your profile.</p>
      </div>
    </motion.div>
  );
}
