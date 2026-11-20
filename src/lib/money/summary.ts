/**
 * Household summary: who owes whom, from shared expenses and settlements.
 * Personal expenses must be excluded by the caller. Pure, no I/O.
 */
import { computeBalances, settleUp, type Balances, type ExpenseRecord, type SettlementRecord, type Transfer } from "./balances";
import type { MemberId } from "./split";

export interface HouseholdSummary {
  balances: Balances;
  transfers: Transfer[];
}

export function buildHouseholdSummary(input: {
  members: MemberId[];
  expenses: ExpenseRecord[];
  settlements: SettlementRecord[];
}): HouseholdSummary {
  const balances = computeBalances(input.members, input.expenses, input.settlements);
  return { balances, transfers: settleUp(balances) };
}
