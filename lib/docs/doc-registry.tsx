import { fundamentalsPages } from "./content/fundamentals";
import { featurePages } from "./content/features";
import { referencePages } from "./content/reference";
import type { DocsSlug } from "./nav-config";
import { DOCS_SLUGS } from "./nav-config";
import type { DocPageDefinition } from "./types";

const merged = {
  ...fundamentalsPages,
  ...featurePages,
  ...referencePages,
};

export const DOC_PAGE_BY_SLUG = merged as Record<DocsSlug, DocPageDefinition>;

export function getDocPage(slug: string): DocPageDefinition | undefined {
  if ((DOCS_SLUGS as readonly string[]).includes(slug)) {
    return DOC_PAGE_BY_SLUG[slug as DocsSlug];
  }
  return undefined;
}

/** Introduction at `/docs` (not part of slug routing). */
export const DOCS_OVERVIEW: DocPageDefinition = {
  title: "Documentation",
  description:
    "Guides for Arivix — moderation, utilities, automation, and premium workflows.",
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      content: (
        <>
          <p>
            Welcome to Arivix&apos;s documentation. These guides mirror the product you run
            today: prefix commands, the web dashboard, and Arivix Pro
            entitlements tied to <a href="https://arivix.org">arivix.org</a>.
          </p>
          <p>
            Start with <a href="/docs/getting-started">Getting started</a>, skim{" "}
            <a href="/docs/security">Security</a> before handing bot tokens to new staff, then
            branch into the feature areas that match how your community operates.
          </p>
        </>
      ),
    },
    {
      id: "quick-links",
      title: "Quick links",
      content: (
        <>
          <ul>
            <li>
              <a href="/commands">Commands</a> — auto-synced catalog
            </li>
            <li>
              <a href="/tools/embed">Embed builder</a> — Pro scripts
            </li>
            <li>
              <a href="/dashboard">Dashboard</a> — signed-in guild tools
            </li>
            <li>
              <a href="/docs/billing">Billing &amp; premium</a>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "how-to-use-docs",
      title: "How to use these docs",
      content: (
        <>
          <p>
            Use the left navigation to jump between pillars, or press{" "}
            <kbd className="rounded border border-white/15 bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-accent-strong">
              Ctrl
            </kbd>{" "}
            +{" "}
            <kbd className="rounded border border-white/15 bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-accent-strong">
              K
            </kbd>{" "}
            /{" "}
            <kbd className="rounded border border-white/15 bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-accent-strong">
              ⌘
            </kbd>
            +{" "}
            <kbd className="rounded border border-white/15 bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-accent-strong">
              K
            </kbd>{" "}
            to search every article title. Deep sections expose an &quot;On this page&quot;
            table of contents on wide screens.
          </p>
        </>
      ),
    },
  ],
};
