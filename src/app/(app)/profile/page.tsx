import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Avatar } from "@/components/avatar/Avatar";
import { InviteCard } from "@/components/household/InviteCard";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { AVATARS } from "@/lib/avatars";
import { requireOnboarded } from "@/lib/data/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FLAT_SIZE_CAP } from "@/lib/people";
import { ProfileEditor } from "./ProfileEditor";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const ctx = await requireOnboarded();

  // While the flat has one person, show the newest still-usable invite.
  let inviteCode: string | null = null;
  if (ctx.members.length < FLAT_SIZE_CAP) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("household_invites")
      .select("code")
      .eq("household_id", ctx.household.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    inviteCode = (data?.code as string | undefined) ?? null;
  }

  const meta = AVATARS[ctx.me.avatar];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {/* Banner: the person's own colours, taken from their avatar. */}
      <section className="relative overflow-clip rounded-card bg-me-soft p-6 sm:p-8">
        <div aria-hidden className="absolute -right-10 -top-14 size-48 rounded-full bg-me/20" />
        <div aria-hidden className="absolute -bottom-16 left-1/3 size-44 rounded-full bg-me/15" />
        <div className="relative flex items-center gap-5">
          <Avatar avatar={ctx.me.avatar} size={96} ring="surface" animated className="shadow-lift" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-semibold leading-tight text-me-ink sm:text-4xl">{ctx.me.name}</h1>
            <p className="text-sm text-me-ink/80">
              {meta.name} · {meta.blurb}
            </p>
            <p className="mt-1 truncate text-sm text-me-ink/70">{ctx.email}</p>
          </div>
        </div>
        <div className="relative mt-5">
          <ProfileEditor name={ctx.me.name} avatar={ctx.me.avatar} />
        </div>
      </section>

      <Section title="Appearance">
        <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
          <ThemeToggle />
          <p className="mt-2.5 text-xs text-ink-3">Auto follows your device. The choice is remembered on this device.</p>
        </div>
      </Section>

      <Section title="Your flat">
        <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
          <p className="font-display text-xl font-semibold">{ctx.household.name}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {ctx.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3">
                <Avatar avatar={m.avatar} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {m.name}
                    {m.userId === ctx.userId && <span className="ml-2 rounded-full bg-me-soft px-2 py-0.5 text-xs font-semibold text-me-ink">You</span>}
                  </p>
                  <p className="text-xs text-ink-3">Joined {new Date(m.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</p>
                </div>
              </li>
            ))}
            {ctx.members.length < FLAT_SIZE_CAP && (
              <li className="flex items-center gap-3 text-ink-3">
                <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-line-strong">?</span>
                <p className="text-sm">Room for more people. Invite them below.</p>
              </li>
            )}
          </ul>
          {ctx.members.length < FLAT_SIZE_CAP && (
            <div className="mt-4">
              <InviteCard householdId={ctx.household.id} householdName={ctx.household.name} code={inviteCode} />
            </div>
          )}
        </div>
      </Section>

      <Section title="Account">
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft">
          <p className="text-sm text-ink-3">
            Signed in as <span className="font-semibold text-ink">{ctx.email}</span>
          </p>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </form>
        </div>
      </Section>
    </div>
  );
}
