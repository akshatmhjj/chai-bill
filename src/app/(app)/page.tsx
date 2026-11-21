import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Avatar } from "@/components/avatar/Avatar";
import { HowItWorks } from "@/components/nest/HowItWorks";
import { JoinByCode } from "@/components/nest/JoinByCode";
import { Logo } from "@/components/brand/Logo";
import { ThemeQuickToggle } from "@/components/theme/ThemeToggle";
import { buttonStyles } from "@/components/ui/Button";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { requireProfile } from "@/lib/data/context";
import { namesList } from "@/lib/people";
import { personalStyle } from "@/lib/avatars";
import { firstName, greetingFor } from "@/lib/time";
import { hourInIndia } from "@/lib/dates/india";

export const metadata: Metadata = { title: "Your nests" };

export default async function NestsHome() {
  const person = await requireProfile();

  return (
    <div className="personal mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pb-16 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 lg:pt-10" style={personalStyle(person.profile.avatar)}>
      <header className="flex items-center justify-between gap-3">
        <Logo size={30} />
        <div className="flex items-center gap-1">
          <ThemeQuickToggle />
          <Link href="/profile" aria-label={`Profile, ${person.profile.name}`} className="rounded-full transition-transform active:scale-95">
            <Avatar avatar={person.profile.avatar} size={40} ring="surface" className="shadow-soft" />
          </Link>
        </div>
      </header>

      <section>
        <p className="text-sm font-semibold text-ink-3">
          {greetingFor(hourInIndia())}, {firstName(person.profile.name)}
        </p>
        <h1 className="font-display text-[2.1rem] font-semibold leading-tight tracking-tight">
          {person.nests.length === 0 ? "Let's set up your first nest." : "Your nests"}
        </h1>
        <p className="mt-1 text-ink-2">
          {person.nests.length === 0
            ? "A nest is a shared home for expenses, payments and a shopping list. Make one, or join one with a code."
            : "Pick a nest to open it. You can be in more than one."}
        </p>
      </section>

      {person.nests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {person.nests.map((nest) => (
            <li key={nest.id}>
              <Link href={`/n/${nest.id}`} className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-soft transition-transform active:scale-[0.99] hover:bg-surface-2">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-me-soft font-display text-2xl font-semibold text-me-ink">
                  {nest.name.trim().charAt(0).toUpperCase() || "N"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl font-semibold">{nest.name}</span>
                  <span className="block text-sm text-ink-3">
                    {nest.memberCount === 1 ? "Just you so far" : `${nest.memberCount} people`}
                  </span>
                </span>
                <ChevronRight className="size-5 text-ink-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/nests/new" className={buttonStyles({ size: "lg", className: "justify-start" })}>
          <Plus className="size-5" aria-hidden />
          Make a nest
        </Link>
        <JoinByCode />
      </div>

      <HowItWorks />

      <section className="rounded-card border border-line bg-surface p-5 shadow-soft">
        <h2 className="font-display text-xl font-semibold">Good to know</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm text-ink-2">
          <li>Every nest has its own expenses, payments, shopping list and feed. Nothing crosses over.</li>
          <li>Personal expenses are only yours, in any nest. Nobody else sees them.</li>
          <li>Up to 15 people per nest. Anyone with the code or QR can join until you refresh it.</li>
        </ul>
        {person.nests.length > 0 && (
          <p className="mt-3 text-sm text-ink-3">
            You&apos;re in {person.nests.length === 1 ? "one nest" : `${person.nests.length} nests`} with{" "}
            {namesList(person.nests.map((n) => n.name))}.
          </p>
        )}
      </section>

      <div className="flex justify-center">
        <SignOutButton />
      </div>
    </div>
  );
}
