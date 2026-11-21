/** Today's date in India as YYYY-MM-DD, so an expense logged after midnight IST gets the right day. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** The first day of the current month in India, as YYYY-MM-01. */
export function monthStartInIndia(now: Date = new Date()): string {
  return `${todayInIndia(now).slice(0, 7)}-01`;
}

/** The hour of day (0 to 23) in India. */
export function hourInIndia(now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(now);
  return Number(hour);
}
