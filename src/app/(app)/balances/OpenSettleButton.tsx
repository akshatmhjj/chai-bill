"use client";

import { useState } from "react";
import { SettleSheet } from "@/components/balances/SettleSheet";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import type { Member } from "@/lib/data/context";

/** A button that opens the "record a payment" sheet, for places where the full balance hero isn't shown. */
export function OpenSettleButton({
  me,
  others,
  planned,
  today,
  children,
  variant = "primary",
  size = "md",
}: {
  me: Member;
  others: Member[];
  planned: Record<string, number>;
  today: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <SettleSheet open={open} onClose={() => setOpen(false)} me={me} others={others} planned={planned} today={today} />
    </>
  );
}
