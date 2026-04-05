import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import Link from "next/link";

export default function NotFound() {
  return (
    <PageShell
      title="Coming soon"
      description="This page isn’t ready yet — we’re still sharpening things. Check back later, or head home to see what’s live."
      maxWidth="narrow"
      prelude={
        <Link href="/" className="text-accent-strong hover:underline">
          ← Home
        </Link>
      }
    >
      <p className="text-sm text-muted">
        If you followed an old link, it may have moved. Use the header to find
        Commands, Pricing, and the dashboard.
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <ButtonLink href="/" variant="primary">
          Home
        </ButtonLink>
        <ButtonLink href="/commands" variant="secondary">
          Commands
        </ButtonLink>
        <ButtonLink href="/pricing" variant="secondary">
          Pricing
        </ButtonLink>
      </div>
    </PageShell>
  );
}
