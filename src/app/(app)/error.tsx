"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { IllustrationQuiet } from "@/components/brand/Illustrations";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/** A friendly fallback when a screen fails to load. Nothing the person did is lost. */
export default function ErrorState({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      illustration={<IllustrationQuiet className="w-48" animated={false} />}
      title="That didn't load"
      description="Something went wrong on our side. Your data is safe. Give it another go."
      action={
        <Button onClick={reset}>
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </Button>
      }
    />
  );
}
