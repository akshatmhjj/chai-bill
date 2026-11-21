import type { Metadata } from "next";
import { CircleCheck, Receipt, Scale, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { ActivityItem } from "@/components/activity/ActivityItem";
import { NewSinceCard } from "@/components/activity/NewSinceCard";
import { Avatar } from "@/components/avatar/Avatar";
import { BalanceHero } from "@/components/balances/BalanceHero";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { InviteCard } from "@/components/household/InviteCard";
import { WelcomeCard } from "@/components/household/WelcomeCard";
import { PageHeader } from "@/components/nav/PageHeader";
import { AnimatedList } from "@/components/ui/AnimatedList";
import { Money } from "@/components/ui/Money";
import { Section } from "@/components/ui/Section";
import { requireOnboarded } from "@/lib/data/context";
import { loadActivity, loadExpenses, loadMonthStats, loadShopping, loadSummary } from "@/lib/data/queries";
import { hourInIndia, monthStartInIndia, todayInIndia } from "@/lib/dates/india";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstName, greetingFor } from "@/lib/time";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [{ welcome }, ctx] = await Promise.all([searchParams, requireOnboarded()]);
  const today = todayInIndia();

  const [summary, expenses, month, shopping, activity] = await Promise.all([
    loadSummary(ctx),
    loadExpenses(30),
    loadMonthStats(ctx, monthStartInIndia()),
    loadShopping(ctx.household.id),
    loadActivity(ctx.household.id, 30),
  ]);

  const mine = summary.breakdown[ctx.userId];
  const hasHistory = mine.paid > 0 || mine.owed > 0 || mine.sent > 0 || mine.received > 0;
  const recentExpenses = expenses.filter((e) => e.scope === "shared").slice(0, 4);
  const openItems = shopping.filter((i) => i.status === "open");
  const unseen = activity.filter((e) => e.actorId !== ctx.userId && e.createdAt > ctx.seenAt);

  // Only needed while the flat has one person.
  let inviteCode: string | null = null;
  if (!ctx.roommate) {
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

  const actions = [
    { href: "/expenses/new", label: "Add expense", icon: Receipt, primary: true },
    { href: "/balances?settle=1", label: "Settle up", icon: Scale, primary: false },
    { href: "/shopping?add=1", label: "Add to list", icon: ShoppingBasket, primary: false },
  ];

  return (
    <>
      <PageHeader
        title={`${greetingFor(hourInIndia())}, ${firstName(ctx.me.name)}`}
        subtitle={ctx.roommate ? `${ctx.household.name} · with ${ctx.roommate.name}` : ctx.household.name}
        me={ctx.me}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          {welcome === "1" && <WelcomeCard householdName={ctx.household.name} members={ctx.members} />}

          {ctx.roommate ? (
            <div className="flex flex-col gap-3">
              <BalanceHero me={ctx.me} roommate={ctx.roommate} netPaise={mine.net} today={today} hasHistory={hasHistory} detailsHref="/balances" />
              <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-ink-3">
                <span>
                  Together this month <Money paise={month.totalPaise} className="font-semibold text-ink-2" />
                </span>
                <span aria-hidden>·</span>
                <span>
                  Your share <Money paise={month.yourSharePaise} className="font-semibold text-ink-2" />
                </span>
              </p>
            </div>
          ) : (
            <section className="rounded-card border border-line bg-gradient-to-br from-accent-soft/60 via-surface to-surface p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-4">
                <Avatar avatar={ctx.me.avatar} size={64} ring="surface" className="shadow-soft" />
                <span aria-hidden className="h-0.5 w-8 rounded-full bg-line-strong" />
                <span aria-label="Your roommate hasn't joined yet" className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-line-strong text-2xl text-ink-3">?</span>
              </div>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">Your flat is ready</h2>
              <p className="mt-1 text-ink-2">Invite your roommate to start splitting. You can add expenses in the meantime.</p>
              <div className="mt-4">
                <InviteCard householdId={ctx.household.id} householdName={ctx.household.name} code={inviteCode} />
              </div>
            </section>
          )}

          <nav aria-label="Quick actions" className="grid grid-cols-3 gap-3">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center text-[13px] font-semibold transition-transform active:scale-95 ${
                    a.primary ? "border-transparent bg-accent text-on-accent shadow-soft hover:bg-accent-hover" : "border-line bg-surface text-ink hover:bg-surface-2"
                  }`}
                >
                  <Icon className="size-6" aria-hidden />
                  {a.label}
                </Link>
              );
            })}
          </nav>

          {ctx.roommate && unseen.length > 0 && (
            <NewSinceCard events={unseen.slice(0, 3)} total={unseen.length} me={ctx.userId} members={ctx.members} householdId={ctx.household.id} roommateName={ctx.roommate.name} />
          )}

          <Section title="Recent expenses" href="/expenses">
            {recentExpenses.length === 0 ? (
              <div className="rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-8 text-center">
                <p className="font-display text-lg font-semibold">Nothing spent together yet</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-ink-3">The first shared expense you add shows up here, with who paid and how it was split.</p>
              </div>
            ) : (
              <AnimatedList
                className="divide-y divide-line rounded-card border border-line bg-surface px-4 shadow-soft"
                items={recentExpenses.map((expense) => ({
                  id: expense.id,
                  node: (
                    <Link href={`/expenses?open=${expense.id}`} className="block">
                      <ExpenseRow
                        expense={expense}
                        me={ctx.userId}
                        members={ctx.members}
                        isNew={expense.createdBy !== ctx.userId && expense.createdAt > ctx.seenAt}
                      />
                    </Link>
                  ),
                }))}
              />
            )}
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-8">
          <Section title="Shopping" href="/shopping" linkLabel="Open list">
            <Link href="/shopping" className="block rounded-card border border-line bg-surface p-4 shadow-soft transition-colors hover:bg-surface-2">
              {openItems.length === 0 ? (
                <p className="flex items-center gap-2 font-semibold text-positive">
                  <CircleCheck className="size-5" aria-hidden />
                  All stocked up
                </p>
              ) : (
                <>
                  <p className="font-display text-2xl font-semibold">{openItems.length} to buy</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {openItems.slice(0, 5).map((item) => (
                      <span key={item.id} className="rounded-full bg-sunken px-2.5 py-1 text-sm font-medium text-ink-2">
                        {item.name}
                      </span>
                    ))}
                    {openItems.length > 5 && <span className="rounded-full px-2 py-1 text-sm text-ink-3">+{openItems.length - 5} more</span>}
                  </div>
                </>
              )}
            </Link>
          </Section>

          <Section title="Recent activity" href="/activity">
            {activity.length === 0 ? (
              <p className="rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-6 text-center text-sm text-ink-3">Nothing has happened yet.</p>
            ) : (
              <AnimatedList
                className="divide-y divide-line rounded-card border border-line bg-surface px-3 shadow-soft"
                items={activity.slice(0, 4).map((event) => ({
                  id: event.id,
                  node: <ActivityItem event={event} me={ctx.userId} members={ctx.members} compact />,
                }))}
              />
            )}
          </Section>
        </aside>
      </div>
    </>
  );
}
