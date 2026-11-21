/**
 * Money primitives. All amounts are integer paise (1 INR = 100 paise).
 * Pure functions only: no I/O, no framework imports.
 */

export type Paise = number;

export const PAISE_PER_RUPEE = 100;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Throws unless `value` is a safe, non-negative integer number of paise. */
export function assertPaise(value: number, label = "amount"): asserts value is Paise {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MoneyError(`${label} must be a non-negative integer number of paise, got ${value}`);
  }
}

/**
 * Parses a user-entered rupee string into paise.
 * Accepts "1234", "1234.5", "1,234.50", "₹ 99.99". Rejects negatives, more than
 * two decimals, exponents, and empty input.
 */
export function parseRupeesToPaise(input: string): Paise {
  const cleaned = input.replace(/[\s,]/g, "").replace(/^₹/, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    throw new MoneyError(`not a valid rupee amount: "${input}"`);
  }
  const rupees = Number(match[1]);
  const paiseFraction = Number((match[2] ?? "").padEnd(2, "0") || "0");
  const total = rupees * PAISE_PER_RUPEE + paiseFraction;
  if (!Number.isSafeInteger(total)) {
    throw new MoneyError(`amount too large: "${input}"`);
  }
  return total;
}

/**
 * Formats paise for display using Indian digit grouping, e.g. 12345650 -> "₹1,23,456.50".
 * Done with integer arithmetic so there is no float drift.
 */
export function formatINR(paise: Paise): string {
  if (!Number.isSafeInteger(paise)) {
    throw new MoneyError(`cannot format non-integer paise: ${paise}`);
  }
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / PAISE_PER_RUPEE);
  const fraction = abs % PAISE_PER_RUPEE;
  const grouped = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(rupees);
  return `${sign}₹${grouped}.${String(fraction).padStart(2, "0")}`;
}

/**
 * Like formatINR but drops ".00" for whole rupees: 150000 -> "₹1,500", 150050 -> "₹1,500.50".
 * Used where many amounts sit in a list and the trailing zeros are just noise.
 */
export function formatINRCompact(paise: Paise): string {
  const full = formatINR(paise);
  return full.endsWith(".00") ? full.slice(0, -3) : full;
}
