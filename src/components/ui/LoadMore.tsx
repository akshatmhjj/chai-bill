"use client";

import Link, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";

function Pending({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </>
  );
}

/** Loads the next page of a list. A link, so it works without JavaScript and survives a refresh. */
export function LoadMore({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex justify-center pt-2">
      <Link href={href} scroll={false} className={buttonStyles({ variant: "secondary", size: "md" })}>
        <Pending>{label}</Pending>
      </Link>
    </div>
  );
}
