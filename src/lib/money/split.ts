/**
 * Split engines. Every function returns one entry per participant, in the order
 * given, and the entries always sum to the total exactly.
 *
 * Rounding rule (docs/SPEC.md section 2.2): any leftover paise go to the payer.
 */
import { assertPaise, MoneyError, type Paise } from "./paise";

export type MemberId = string;

export interface ShareResult {
  memberId: MemberId;
  paise: Paise;
}

export const BASIS_POINTS_TOTAL = 10000;

function assertUniqueMembers(members: MemberId[]): void {
  if (members.length === 0) {
    throw new MoneyError("split needs at least one participant");
  }
  if (new Set(members).size !== members.length) {
    throw new MoneyError("participants must be unique");
  }
}

function assertPayerIncluded(payer: MemberId, members: MemberId[]): void {
  if (!members.includes(payer)) {
    throw new MoneyError("payer must be one of the participants for this split method");
  }
}

function assertPositiveTotal(total: Paise): void {
  assertPaise(total, "total");
  if (total === 0) {
    throw new MoneyError("total must be greater than zero");
  }
}

/**
 * Equal split among `participants`. Each gets floor(total / n); the remainder
 * (0 to n-1 paise) is added to the payer's share.
 */
export function splitEqual(total: Paise, participants: MemberId[], payer: MemberId): ShareResult[] {
  assertPositiveTotal(total);
  assertUniqueMembers(participants);
  assertPayerIncluded(payer, participants);

  const n = participants.length;
  const remainder = total % n;
  const base = (total - remainder) / n; // exact integer division

  return participants.map((memberId) => ({
    memberId,
    paise: memberId === payer ? base + remainder : base,
  }));
}

/**
 * Exact-amount split. The caller states each person's paise; the values must be
 * non-negative integers that sum to `total` exactly. No rounding is applied.
 */
export function splitByAmount(total: Paise, shares: ShareResult[]): ShareResult[] {
  assertPositiveTotal(total);
  assertUniqueMembers(shares.map((s) => s.memberId));
  for (const share of shares) {
    assertPaise(share.paise, `share for ${share.memberId}`);
  }
  const sum = shares.reduce((acc, s) => acc + s.paise, 0);
  if (sum !== total) {
    throw new MoneyError(`shares sum to ${sum} paise but total is ${total} paise`);
  }
  return shares.map((s) => ({ memberId: s.memberId, paise: s.paise }));
}

export interface BasisPointShare {
  memberId: MemberId;
  basisPoints: number;
}

/**
 * Percentage split in basis points (100 bp = 1%). Basis points must be integers
 * in [0, 10000] and sum to exactly 10000. Each share is floor(total * bp / 10000);
 * the remainder goes to the payer.
 */
export function splitByBasisPoints(
  total: Paise,
  shares: BasisPointShare[],
  payer: MemberId,
): ShareResult[] {
  assertPositiveTotal(total);
  const members = shares.map((s) => s.memberId);
  assertUniqueMembers(members);
  assertPayerIncluded(payer, members);

  let bpSum = 0;
  for (const share of shares) {
    if (!Number.isInteger(share.basisPoints) || share.basisPoints < 0 || share.basisPoints > BASIS_POINTS_TOTAL) {
      throw new MoneyError(`basis points for ${share.memberId} must be an integer in [0, 10000]`);
    }
    bpSum += share.basisPoints;
  }
  if (bpSum !== BASIS_POINTS_TOTAL) {
    throw new MoneyError(`basis points sum to ${bpSum}, must be ${BASIS_POINTS_TOTAL}`);
  }

  // BigInt keeps total * bp exact even for very large totals.
  const totalBig = BigInt(total);
  const bpTotalBig = BigInt(BASIS_POINTS_TOTAL);
  const results: ShareResult[] = shares.map((share) => ({
    memberId: share.memberId,
    paise: Number((totalBig * BigInt(share.basisPoints)) / bpTotalBig),
  }));

  const allocated = results.reduce((acc, r) => acc + r.paise, 0);
  const remainder = total - allocated;
  for (const result of results) {
    if (result.memberId === payer) {
      result.paise += remainder;
    }
  }
  return results;
}
