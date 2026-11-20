/** Today's date in India as YYYY-MM-DD, so an expense logged after midnight IST gets the right day. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}
