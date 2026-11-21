import { Money } from "@/components/ui/Money";
import type { MemberBreakdown } from "@/lib/money/summary";

/** Why the balance is what it is, in plain arithmetic: what you paid, your share, and payments either way. */
export function BreakdownCard({ breakdown }: { breakdown: MemberBreakdown }) {
  const net = breakdown.net;
  const rows: { label: string; hint: string; paise: number; sign: "+" | "−" | "" }[] = [
    { label: "You paid for", hint: "shared expenses you covered", paise: breakdown.paid, sign: "" },
    { label: "Your share of everything", hint: "your part of all shared expenses", paise: breakdown.owed, sign: "−" },
    { label: "Payments you sent", hint: "money you've paid others in the nest", paise: breakdown.sent, sign: "+" },
    { label: "Payments you received", hint: "money others have paid you", paise: breakdown.received, sign: "−" },
  ];

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
      <dl className="flex flex-col divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <dt className="font-semibold">{row.label}</dt>
              <dd className="text-xs text-ink-3">{row.hint}</dd>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 tabular text-ink-2">
              <span aria-hidden className="w-3 text-center text-ink-3">{row.sign}</span>
              <Money paise={row.paise} className="font-semibold text-ink" />
            </span>
          </div>
        ))}
      </dl>
      <div className="mt-1 flex items-center justify-between rounded-xl bg-sunken px-3.5 py-3">
        <span className="font-semibold">{net < 0 ? "You owe overall" : net > 0 ? "You're owed overall" : "Balance"}</span>
        <Money paise={Math.abs(net)} className={`font-display text-2xl font-semibold ${net < 0 ? "text-negative" : net > 0 ? "text-positive" : "text-ink"}`} />
      </div>
    </div>
  );
}
