/**
 * Household summary: who owes whom, from shared expenses and settlements.
 * Personal expenses must be excluded by the caller. Pure, no I/O.
 */
import { computeBalances, settleUp, type Balances, type ExpenseRecord, type SettlementRecord, type Transfer } from "./balances";
import type { Paise } from "./paise";
import type { MemberId } from "./split";

/** The pieces behind one person's balance, so the screen can explain "why". */
export interface MemberBreakdown {
  /** Total of shared expenses this person paid. */
  paid: Paise;
  /** This person's share of all shared expenses. */
  owed: Paise;
  /** Payments this person has made to roommates. */
  sent: Paise;
  /** Payments this person has received. */
  received: Paise;
  /** paid - owed + sent - received. Positive means the flat owes them. */
  net: Paise;
}

export interface HouseholdSummary {
  balances: Balances;
  transfers: Transfer[];
  breakdown: Record<MemberId, MemberBreakdown>;
}

export function buildHouseholdSummary(input: {
  members: MemberId[];
  expenses: ExpenseRecord[];
  settlements: SettlementRecord[];
}): HouseholdSummary {
  // computeBalances validates every row (unknown members, shares that do not add up, bad amounts).
  const balances = computeBalances(input.members, input.expenses, input.settlements);

  const breakdown: Record<MemberId, MemberBreakdown> = {};
  for (const member of input.members) {
    breakdown[member] = { paid: 0, owed: 0, sent: 0, received: 0, net: balances[member] };
  }
  for (const expense of input.expenses) {
    breakdown[expense.payerId].paid += expense.totalPaise;
    for (const share of expense.shares) breakdown[share.memberId].owed += share.paise;
  }
  for (const settlement of input.settlements) {
    breakdown[settlement.fromId].sent += settlement.paise;
    breakdown[settlement.toId].received += settlement.paise;
  }

  return { balances, transfers: settleUp(balances), breakdown };
}
