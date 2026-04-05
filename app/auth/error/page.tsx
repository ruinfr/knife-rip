import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import Link from "next/link";

/** User-safe copy only — no env names, hosts, or integration details. */
const errorCopy: Record<string, { title: string; body: string }> = {
  Configuration: {
    title: "Sign-in isn’t available",
    body:
      "We couldn’t complete sign-in right now. Please try again in a few minutes. If it keeps happening, the team may still be finishing setup.",
  },
  AccessDenied: {
    title: "Access denied",
    body: "You cancelled sign-in or this account can’t be used here.",
  },
  Verification: {
    title: "Link expired",
    body: "That sign-in link is no longer valid. Start sign-in again from the site.",
  },
  OAuthSignin: {
    title: "Sign-in didn’t start",
    body: "We couldn’t open the login window. Close any blockers and try again.",
  },
  OAuthCallbackError: {
    title: "Sign-in was interrupted",
    body:
      "Something went wrong after you approved access. Try signing in once more.",
  },
  OAuthCreateAccount: {
    title: "Couldn’t finish your account",
    body:
      "We couldn’t save your profile after login. Try again shortly; if it persists, contact support.",
  },
  AdapterError: {
    title: "Something went wrong",
    body: "We hit a problem saving your session. Please try again in a moment.",
  },
  CallbackRouteError: {
    title: "Sign-in failed",
    body: "The login step didn’t finish. Try signing in again.",
  },
  Default: {
    title: "Sign-in problem",
    body: "Something went wrong. Try again, or go home and start over.",
  },
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error: code } = await searchParams;
  const copy =
    (code && errorCopy[code]) ||
    (code
      ? {
          title: "Sign-in problem",
          body: "Something went wrong. Please try again.",
        }
      : errorCopy.Default);

  return (
    <PageShell
      title={copy.title}
      description={copy.body}
      maxWidth="narrow"
      prelude={
        <Link href="/" className="text-accent-strong hover:underline">
          ← Home
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <ButtonLink href="/" variant="primary" className="w-fit">
          Back to home
        </ButtonLink>
        <ButtonLink href="/dashboard" variant="secondary" className="w-fit">
          Try dashboard
        </ButtonLink>
      </div>
    </PageShell>
  );
}
