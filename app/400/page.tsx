import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bad request",
  robots: { index: false, follow: false },
};

/** Shown for malformed or invalid requests (via middleware). */
export default function BadRequestPage() {
  return (
    <PageShell
      title="That request doesn’t look right"
      description="The link or address may be incomplete or invalid. Double-check what you opened, or start from the home page."
      maxWidth="narrow"
      prelude={
        <Link href="/" className="text-accent-strong hover:underline">
          ← Home
        </Link>
      }
    >
      <p className="font-mono text-xs text-muted">400</p>
      <ButtonLink href="/" variant="primary" className="mt-4 w-fit">
        Go home
      </ButtonLink>
    </PageShell>
  );
}
