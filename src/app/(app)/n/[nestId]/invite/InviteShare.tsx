"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, RefreshCw, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState, useTransition } from "react";
import { refreshInviteAction } from "@/app/(app)/nests/actions";
import { Button } from "@/components/ui/Button";
import { formatInviteCode, joinLink } from "@/lib/nests/invite";

/**
 * The invite screen: a short code, a QR for people standing next to you, and a link to share.
 * Making a fresh code (the refresh button) invalidates the old one, so the QR can be reset any time.
 */
export function InviteShare({ nestId, nestName, initialCode }: { nestId: string; nestName: string; initialCode: string | null }) {
  const [code, setCode] = useState(initialCode);
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setOrigin(window.location.origin), []);

  const link = code && origin ? joinLink(origin, code) : null;

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#2b2018", light: "#ffffff" }, errorCorrectionLevel: "M" })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [link]);

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Couldn't copy on this device. Select the text and copy it by hand.");
    }
  }

  async function share() {
    if (!link) return;
    try {
      await navigator.share({ title: `Join ${nestName} on Chai Bill`, url: link });
    } catch {
      // Cancelled, or not supported here: the copy buttons are right there.
    }
  }

  function refresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshInviteAction(nestId);
      if (!result.ok) return setError(result.error);
      setCode(result.code);
    });
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-5 rounded-card border border-line bg-surface p-6 text-center shadow-soft">
        <div className="flex size-56 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-soft">
          <AnimatePresence mode="wait" initial={false}>
            {qr ? (
              <motion.img key={qr} src={qr} alt={`QR code to join ${nestName}`} width={224} height={224} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="size-full" />
            ) : (
              <div className="text-sm text-ink-3">{code ? "Drawing the code…" : "No active code yet"}</div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-sm text-ink-2">Point a phone camera at this, or open the link below.</p>

        <div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-3">Short code</p>
          <p aria-label={code ? `Invite code ${formatInviteCode(code)}` : "No code"} className="mt-1 font-mono text-3xl font-bold tracking-[0.12em] text-ink">
            {code ? formatInviteCode(code) : "—"}
          </p>
        </div>

        <div className="flex w-full flex-wrap justify-center gap-2.5">
          {code && (
            <Button variant="secondary" onClick={() => copy(formatInviteCode(code), "code")}>
              {copied === "code" ? <Check className="size-4 text-positive" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied === "code" ? "Copied" : "Copy code"}
            </Button>
          )}
          {link && (
            <Button variant="secondary" onClick={() => copy(link, "link")}>
              {copied === "link" ? <Check className="size-4 text-positive" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied === "link" ? "Link copied" : "Copy link"}
            </Button>
          )}
          {link && canShare && (
            <Button onClick={share}>
              <Share2 className="size-4" aria-hidden /> Share
            </Button>
          )}
        </div>

        <div className="w-full border-t border-line pt-4">
          <Button variant="ghost" onClick={refresh} loading={pending}>
            {!pending && <RefreshCw className="size-4" aria-hidden />}
            Make a new code
          </Button>
          <p className="mt-1 text-xs text-ink-3">The old code and QR stop working straight away. Use this if it has been shared too widely.</p>
        </div>
        {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      </section>

      <p className="text-center text-sm text-ink-3">
        A code works for any number of people until you make a new one, and it lasts 7 days.
      </p>
    </div>
  );
}
