import type { DocPageDefinition } from "../types";

export const referencePages: Record<string, DocPageDefinition> = {
  resources: {
    title: "Resources",
    description: "Quick links across Arivix Properties.",
    sections: [
      {
        id: "site",
        title: "On this site",
        content: (
          <>
            <ul>
              <li>
                <a href="/commands">Commands</a> — synced catalog
              </li>
              <li>
                <a href="/tools/embed">Embed builder</a> — script output for Pro broadcasts
              </li>
              <li>
                <a href="/pricing">Pricing</a> — Arivix Pro checkout
              </li>
              <li>
                <a href="/status">Status</a> — bot presence snapshot
              </li>
              <li>
                <a href="/changelog">Changelog</a> — release notes
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "community",
        title: "Community",
        content: (
          <>
            <p id="community">
              Join the official Arivix hub for support, Pro role sync, and patch notes. Use{" "}
              <a href="/">the home page</a> Discord invite or run <code>.arivix</code> inside a
              server where Arivix is present for the canonical jump link.
            </p>
          </>
        ),
      },
    ],
  },
  scripting: {
    title: "Scripting",
    description: "Arivix embed scripts and variable substitution.",
    sections: [
      {
        id: "format",
        title: "Script format",
        content: (
          <>
            <p>
              Embed builder outputs{" "}
              <code>{"{embed}$v{ … }"}</code>-style payloads compatible with{" "}
              <code>.say</code>, <code>.createembed</code>, and webhook flows when JSON parsing
              is skipped. Variables like <code>{"{user}"}</code> expand from the invoker context.
            </p>
          </>
        ),
      },
      {
        id: "variables",
        title: "Variables",
        content: (
          <>
            <p>
              Reference the variable picker inside the embed builder for categories (user,
              member, guild, channel). Test in a staging channel before promoting to announcement
              destinations.
            </p>
          </>
        ),
      },
    ],
  },
  permissions: {
    title: "Permissions",
    description: "Discord scopes Arivix commonly expects.",
    sections: [
      {
        id: "baseline",
        title: "Baseline",
        content: (
          <>
            <p>
              Administrator bypasses granular checks — grant only to operators who truly need
              full control. Prefer composable permissions (Manage Messages, Moderate Members,
              Manage Roles) tied to documented commands.
            </p>
          </>
        ),
      },
      {
        id: "verification",
        title: "Verification",
        content: (
          <>
            <p>
              Arivix Pro commands may call the site entitlement API. Ensure{" "}
              <code>BOT_INTERNAL_SECRET</code> matches between Vercel and the bot host so
              premium gates behave consistently.
            </p>
          </>
        ),
      },
    ],
  },
  billing: {
    title: "Billing & premium",
    description: "Arivix Pro lifetime access and account linking.",
    sections: [
      {
        id: "purchase",
        title: "Purchase",
        content: (
          <>
            <p>
              Complete checkout on <a href="/pricing">pricing</a>. Lifetime Pro unlocks after
              Stripe webhooks mark your account — follow any post-payment prompts to link Discord.
            </p>
          </>
        ),
      },
      {
        id: "linking",
        title: "Role sync",
        content: (
          <>
            <p>
              Join the Arivix hub so automatic role sync can mirror Pro, Owner, or Developer
              tiers onto your account when configured by the operators.
            </p>
          </>
        ),
      },
    ],
  },
};
