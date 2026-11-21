/**
 * Human wording for times and days. Pure and relative-import only so it is easy to test.
 * Dates are YYYY-MM-DD strings in India time, matching how expenses are stored.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "just now", "5 min ago", "3 h ago", "Yesterday", then a short date. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const d = new Date(then);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "Today", "Yesterday", "Mon 16 Nov", or "16 Nov 2025" for another year. */
export function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  const diffDays = Math.round((parseDay(today).getTime() - parseDay(day).getTime()) / 86_400_000);
  if (diffDays === 1) return "Yesterday";
  const date = parseDay(day);
  const base = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  if (date.getUTCFullYear() !== parseDay(today).getUTCFullYear()) return `${base} ${date.getUTCFullYear()}`;
  return `${WEEKDAYS[date.getUTCDay()]} ${base}`;
}

/** A calendar day (YYYY-MM-DD, India time) for a timestamp, for grouping the activity feed. */
export function dayOfTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso));
}

export function greetingFor(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
