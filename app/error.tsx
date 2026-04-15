"use client";

import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-surface-elevated/80 text-edge">
        <Icon icon="mdi:alert-decagram-outline" className="size-8" aria-hidden />
      </span>
      <div>
        <h1 className="font-display text-xl font-bold text-accent-strong">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This page hit a snag. You can try again or head back home — your data
          is safe.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="motion-safe:transition rounded-full border border-blue-500/30 bg-blue-950/40 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-blue-400/40"
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-sm font-medium text-edge underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
