"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/time";

/** "5 min ago", kept fresh while the screen is open. */
export function RelativeTime({ iso, className = "" }: { iso: string; className?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  // The server and the browser can disagree by a second or two, so the text is allowed to differ on hydration.
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {relativeTime(iso)}
    </time>
  );
}
