import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/avatar/Avatar";
import { BalanceHero } from "@/components/balances/BalanceHero";
import { BreakdownCard } from "@/components/balances/BreakdownCard";
import { PaymentHistory } from "@/components/balances/PaymentHistory";
import { IllustrationQuiet } from "@/components/brand/Illustrations";
import { PageHeader } from "@/components/nav/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { Section } from "@/components/ui/Section";
import { requireNest } from "@/lib/data/context";
import { loadSettlements, loadSummary } from "@/lib/data/queries";
import { todayInIndia } from "@/lib/dates/india";
import { namesList } from "@/lib/people";
import { transfersFor } from "@/lib/money/summary";
import { OpenSettleButton } from "./OpenSettleButton";

export const metadata: Metadata = { title: "Settle up" };

export default async function BalancesPage({ params, searchParams }: { params: Promise<{ nestId: string }>; searchParams: Promise<{ settle?: string }> }) {
  const { nestId } = await params;
  const [{ settle }, ctx] = await Promise.all([searchParams, requireNest(nestId)]);
  const today = todayInIndia();

  if (ctx.others.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Settle up" me={ctx.me} />
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            illustration={<IllustrationQuiet className="w-52" />}
            title="Waiting for your housemates"
            description="Balances and payments appear here once someone has joined. Share your invite code from your profile."
          />
        </div>
      </div>
    );
  }

  const [summary, settlements] = await Promise.all([loadSummary(ctx), loadSettlements(ctx.household.id)]);
  const mine = summary.breakdown[ctx.userId];
  const plan = transfersFor(ctx.userId, summary.transfers);
  const planned = Object.fromEntries(plan.pay.map((t) => [t.to, t.paise]));
  const hasHistory = settlements.length > 0 || mine.paid > 0 || mine.owed > 0;

  // Everyone in the flat, sorted: the people owed the most first, then the ones who owe.
  const standings = ctx.members
    .map((m) => ({ member: m, net: summary.breakdown[m.userId]?.net ?? 0 }))
    .sort((a, b) => b.net - a.net);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settle up" subtitle={namesList([ctx.me.name, ...ctx.others.map((m) => m.name)])} me={ctx.me} />
      <div className="flex flex-col gap-8">
        <BalanceHero
          me={ctx.me}
          others={ctx.others}
          pay={plan.pay}
          receive={plan.receive}
          netPaise={mine.net}
          today={today}
          hasHistory={hasHistory}
          autoOpenSettle={settle === "1"}
        />

        <Section title="Where everyone stands">
          <ul className="divide-y divide-line rounded-card border border-line bg-surface px-4 shadow-soft">
            {standings.map(({ member, net }) => (
              <li key={member.userId} className="flex items-center gap-3 py-3">
                <Avatar avatar={member.avatar} size={36} />
                <span className="min-w-0 flex-1 truncate font-semibold">{member.userId === ctx.userId ? "You" : member.name}</span>
                <span className={`text-sm ${net > 0 ? "text-positive" : net < 0 ? "text-negative" : "text-ink-3"}`}>
                  {net > 0 ? "owed " : net < 0 ? "owes " : "all square"}
                  {net !== 0 && <Money paise={Math.abs(net)} className="font-semibold" />}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Why your balance is this">
          <BreakdownCard breakdown={mine} />
        </Section>

        <Section
          title="Payments"
          badge={settlements.length > 0 ? <span className="rounded-full bg-sunken px-2 py-0.5 text-sm font-semibold text-ink-3">{settlements.length}</span> : undefined}
        >
          {settlements.length === 0 ? (
            <div className="rounded-card border border-line bg-surface">
              <EmptyState
                title="No payments yet"
                description="When people pay each other back, it's recorded here with how, and when."
                action={
                  <OpenSettleButton me={ctx.me} others={ctx.others} planned={planned} today={today}>
                    <Plus className="size-4" aria-hidden />
                    Record a payment
                  </OpenSettleButton>
                }
              />
            </div>
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <OpenSettleButton me={ctx.me} others={ctx.others} planned={planned} today={today} variant="secondary" size="sm">
                  <Plus className="size-4" aria-hidden />
                  Record a payment
                </OpenSettleButton>
              </div>
              <PaymentHistory settlements={settlements} me={ctx.me} members={ctx.members} seenAt={ctx.seenAt} today={today} />
            </>
          )}
        </Section>
      </div>
    </div>
  );
}
