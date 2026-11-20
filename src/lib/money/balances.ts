/**
 * Balance derivation and settlement suggestions (docs/SPEC.md sections 2.3, 2.4).
 * Balances are always recomputed from expenses and settlements; never stored.
 *
 * Sign convention: positive net = the household owes that member;
 * negative net = that member owes the household.
 */
import { assertPaise, MoneyError, type Paise } from "./paise";
import type { MemberId, ShareResult } from "./split";

export interface ExpenseRecord {
  id: string;
  payerId: MemberId;
  totalPaise: Paise;
  shares: ShareResult[];
}

export interface SettlementRecord {
  id: string;
  fromId: MemberId;
  toId: MemberId;
  paise: Paise;
}

export type Balances = Record<MemberId, Paise>;

export interface Transfer {
  from: MemberId;
  to: MemberId;
  paise: Paise;
}

/**
 * net(m) = paid(m) - owed(m) + sent(m) - received(m), over shared expenses and
 * non-deleted settlements. Callers pass only household rows (personal expenses
 * are excluded by the caller, per the spec).
 *
 * Throws if an expense's shares do not sum to its total, if a row references a
 * member outside `members`, or if a settlement is not between two different members.
 */
export function computeBalances(
  members: MemberId[],
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[],
): Balances {
  if (members.length === 0) {
    throw new MoneyError("balances need at least one member");
  }
  if (new Set(members).size !== members.length) {
    throw new MoneyError("members must be unique");
  }

  const net: Balances = {};
  for (const member of members) net[member] = 0;

  const requireMember = (id: MemberId, context: string) => {
    if (!(id in net)) throw new MoneyError(`${context} references unknown member ${id}`);
  };

  for (const expense of expenses) {
    assertPaise(expense.totalPaise, `expense ${expense.id} total`);
    requireMember(expense.payerId, `expense ${expense.id} payer`);

    const sharesSum = expense.shares.reduce((acc, s) => acc + s.paise, 0);
    if (sharesSum !== expense.totalPaise) {
      throw new MoneyError(
        `expense ${expense.id} shares sum to ${sharesSum} but total is ${expense.totalPaise}`,
      );
    }

    net[expense.payerId] += expense.totalPaise;
    for (const share of expense.shares) {
      requireMember(share.memberId, `expense ${expense.id} share`);
      net[share.memberId] -= share.paise;
    }
  }

  for (const settlement of settlements) {
    assertPaise(settlement.paise, `settlement ${settlement.id} amount`);
    if (settlement.paise === 0) {
      throw new MoneyError(`settlement ${settlement.id} must be greater than zero`);
    }
    requireMember(settlement.fromId, `settlement ${settlement.id} from`);
    requireMember(settlement.toId, `settlement ${settlement.id} to`);
    if (settlement.fromId === settlement.toId) {
      throw new MoneyError(`settlement ${settlement.id} is from a member to themselves`);
    }
    // The payer of a settlement has paid down what they owe, so their net rises.
    net[settlement.fromId] += settlement.paise;
    net[settlement.toId] -= settlement.paise;
  }

  return net;
}

/**
 * Greedy settlement plan: repeatedly match the largest creditor with the largest
 * debtor. Ties are broken by member id so the output is deterministic. Each
 * transfer is a positive amount; the list is empty when everyone is square.
 *
 * Throws if the nets do not sum to zero.
 */
export function settleUp(balances: Balances): Transfer[] {
  const total = Object.values(balances).reduce((acc, v) => acc + v, 0);
  if (total !== 0) {
    throw new MoneyError(`balances must sum to zero, got ${total}`);
  }

  const byAmountThenId = (a: [MemberId, Paise], b: [MemberId, Paise]) =>
    b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

  const creditors = Object.entries(balances).filter(([, v]) => v > 0).sort(byAmountThenId);
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0)
    .map(([id, v]): [MemberId, Paise] => [id, -v])
    .sort(byAmountThenId);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const [creditor, owed] = creditors[ci];
    const [debtor, debt] = debtors[di];
    const paise = Math.min(owed, debt);
    transfers.push({ from: debtor, to: creditor, paise });

    creditors[ci] = [creditor, owed - paise];
    debtors[di] = [debtor, debt - paise];
    if (creditors[ci][1] === 0) ci++;
    if (debtors[di][1] === 0) di++;
  }
  return transfers;
}
