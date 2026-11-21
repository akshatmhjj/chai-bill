import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { BalanceHero } from "@/components/balances/BalanceHero";
import { BreakdownCard } from "@/components/balances/BreakdownCard";
import { PaymentHistory } from "@/components/balances/PaymentHistory";
import { IllustrationQuiet } from "@/components/brand/Illustrations";
import { PageHeader } from "@/components/nav/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { requireOnboarded } from "@/lib/data/context";
import { loadSettlements, loadSummary } from "@/lib/data/queries";
import { todayInIndia } from "@/lib/dates/india";
import { OpenSettleButton } from "./OpenSettleButton";

export const metadata: Metadata = { title: "Settle up" };

export default async function BalancesPage({ searchParams }: { searchParams: Promise<{ settle?: string }> }) {
  const [{ settle }, ctx] = await Promise.all([searchParams, requireOnboarded()]);
  const [summary, settlements] = await Promise.all([loadSummary(ctx), loadSettlements(ctx.household.id)]);
  const today = todayInIndia();

  if (!ctx.roommate) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Settle up" me={ctx.me} />
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            illustration={<IllustrationQuiet className="w-52" />}
            title="Waiting for your roommate"
            description="Balances and payments appear here once they've joined. Share your invite code from your profile."
          />
        </div>
      </div>
    );
  }

  const mine = summary.breakdown[ctx.userId];
  const hasHistory = settlements.length > 0 || mine.paid > 0 || mine.owed > 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settle up" subtitle={`You and ${ctx.roommate.name}`} me={ctx.me} />
      <div className="flex flex-col gap-8">
        <BalanceHero me={ctx.me} roommate={ctx.roommate} netPaise={mine.net} today={today} hasHistory={hasHistory} autoOpenSettle={settle === "1"} />

        <Section title="Why this balance">
          <BreakdownCard breakdown={mine} roommateName={ctx.roommate.name} />
        </Section>

        <Section
          title="Payments"
          badge={settlements.length > 0 ? <span className="rounded-full bg-sunken px-2 py-0.5 text-sm font-semibold text-ink-3">{settlements.length}</span> : undefined}
        >
          {settlements.length === 0 ? (
            <div className="rounded-card border border-line bg-surface">
              <EmptyState
                title="No payments yet"
                description="When you pay each other back, it's recorded here with how, and when."
                action={
                  <OpenSettleButton me={ctx.me} roommate={ctx.roommate} owePaise={mine.net < 0 ? -mine.net : 0} today={today}>
                    <Plus className="size-4" aria-hidden />
                    Record a payment
                  </OpenSettleButton>
                }
              />
            </div>
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <OpenSettleButton me={ctx.me} roommate={ctx.roommate} owePaise={mine.net < 0 ? -mine.net : 0} today={today} variant="secondary" size="sm">
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
