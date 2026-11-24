"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, nestHref } from "./items";

/**
 * Phones only: a way back to the nest's Home from any screen, and to the list of nests.
 * On Home itself it shows just the link to all nests. (Desktop has the sidebar for both.)
 */
export function MobileBack({ nestId }: { nestId: string }) {
  const pathname = usePathname();
  const onHome = isActive(pathname, nestId, "/");
  return (
    <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
      {onHome ? (
        <span />
      ) : (
        <Link href={nestHref(nestId, "/")} className="-ml-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-ink-2 active:bg-sunken">
          <ArrowLeft className="size-4" aria-hidden />
          Home
        </Link>
      )}
      <Link href="/" className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-ink-3 active:bg-sunken">
        All nests
      </Link>
    </div>
  );
}
