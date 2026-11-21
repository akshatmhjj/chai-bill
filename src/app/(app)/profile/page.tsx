import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LogOut, Plus } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Avatar } from "@/components/avatar/Avatar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { AVATARS, personalStyle } from "@/lib/avatars";
import { requireProfile } from "@/lib/data/context";
import { ProfileEditor } from "./ProfileEditor";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const person = await requireProfile();
  const meta = AVATARS[person.profile.avatar];

  return (
    <main className="personal mx-auto flex max-w-2xl flex-col gap-8 px-4 pb-16 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 lg:pt-10" style={personalStyle(person.profile.avatar)}>
      <Link href="/" className="inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-ink-3 hover:bg-sunken hover:text-ink">
        ← Your nests
      </Link>

      {/* Banner: the person's own colours, taken from their avatar. */}
      <section className="relative overflow-clip rounded-card bg-me-soft p-6 sm:p-8">
        <div aria-hidden className="absolute -right-10 -top-14 size-48 rounded-full bg-me/20" />
        <div aria-hidden className="absolute -bottom-16 left-1/3 size-44 rounded-full bg-me/15" />
        <div className="relative flex items-center gap-5">
          <Avatar avatar={person.profile.avatar} size={96} ring="surface" animated className="shadow-lift" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-semibold leading-tight text-me-ink sm:text-4xl">{person.profile.name}</h1>
            <p className="text-sm text-me-ink/80">
              {meta.name} · {meta.blurb}
            </p>
            <p className="mt-1 truncate text-sm text-me-ink/70">{person.email}</p>
          </div>
        </div>
        <div className="relative mt-5">
          <ProfileEditor name={person.profile.name} avatar={person.profile.avatar} />
        </div>
      </section>

      <Section title="Your nests">
        <div className="flex flex-col gap-3">
          {person.nests.length === 0 && <p className="text-sm text-ink-3">You&apos;re not in a nest yet.</p>}
          {person.nests.map((nest) => (
            <Link key={nest.id} href={`/n/${nest.id}`} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-soft hover:bg-surface-2">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-me-soft font-display text-xl font-semibold text-me-ink">
                {nest.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{nest.name}</span>
                <span className="block text-xs text-ink-3">{nest.memberCount} {nest.memberCount === 1 ? "person" : "people"}</span>
              </span>
              <ChevronRight className="size-5 text-ink-3" aria-hidden />
            </Link>
          ))}
          <div className="flex flex-wrap gap-2.5">
            <Link href="/nests/new" className={buttonStyles({ variant: "secondary" })}>
              <Plus className="size-4" aria-hidden /> Make a nest
            </Link>
          </div>
        </div>
      </Section>

      <Section title="Appearance">
        <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
          <ThemeToggle />
          <p className="mt-2.5 text-xs text-ink-3">Auto follows your device. The choice is remembered on this device.</p>
        </div>
      </Section>

      <Section title="Account">
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-soft">
          <p className="text-sm text-ink-3">
            Signed in as <span className="font-semibold text-ink">{person.email}</span>
          </p>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </form>
        </div>
      </Section>
    </main>
  );
}
