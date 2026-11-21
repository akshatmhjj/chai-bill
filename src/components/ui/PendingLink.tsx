"use client";

import Link, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";

/** Shows a spinner the moment a link is tapped, until the next page arrives. Taps never feel ignored. */
function Pending({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </>
  );
}

export function PendingLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={className}>
      <Pending>{children}</Pending>
    </Link>
  );
}
