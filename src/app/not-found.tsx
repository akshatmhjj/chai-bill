import Link from "next/link";
import { IllustrationReceipt } from "@/components/brand/Illustrations";
import { buttonStyles } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6">
      <EmptyState
        illustration={<IllustrationReceipt className="w-52" />}
        title="We couldn't find that"
        description="The page may have moved, or the link is out of date."
        action={
          <Link href="/" className={buttonStyles()}>
            Back to home
          </Link>
        }
      />
    </main>
  );
}
