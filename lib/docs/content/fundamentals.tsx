import type { DocPageDefinition } from "../types";

export const fundamentalsPages: Record<string, DocPageDefinition> = {
  "getting-started": {
    title: "Getting started",
    description:
      "Invite Arivix, verify intents and permissions, and run your first commands safely.",
    sections: [
      {
        id: "introduction",
        title: "Introduction",
        content: (
          <>
            <p>
              Arivix is a prefix-first Discord bot focused on <strong>moderation</strong>,{" "}
              <strong>utilities</strong>, and <strong>community tools</strong>. Most actions
              are triggered with the default prefix <code>.</code> (customizable per server).
            </p>
            <p>
              Use the live <a href="/commands">commands catalog</a> for an always-up-to-date
              list synced from the bot. This guide covers hosting expectations; command syntax
              lives beside each entry there.
            </p>
          </>
        ),
      },
      {
        id: "invite",
        title: "Invite the bot",
        content: (
          <>
            <p>
              Add Arivix with the <code>bot</code> scope (and{" "}
              <code>applications.commands</code> if you rely on other slash integrations your
              host documents). Vanity scanning uses prefix <strong>.vanities</strong> /{" "}
              <strong>.vanity</strong> only.
            </p>
            <p>
              Place the bot role <strong>below</strong> roles it should assign and{" "}
              <strong>above</strong> roles it should manage, matching Discord&apos;s hierarchy
              rules.
            </p>
          </>
        ),
      },
      {
        id: "intents",
        title: "Intents & access",
        content: (
          <>
            <p>
              Arivix uses privileged intents where features require them — for example{" "}
              <strong>Message Content</strong> for prefix commands and <strong>Server Members</strong>{" "}
              for moderation and joins. Enable these in the Discord Developer Portal for your
              application, then re-authorize if prompted.
            </p>
            <p>
              The <a href="/dashboard">dashboard</a> surfaces guild-centric tools when you are
              signed in with Discord — keep your server selected when triaging settings.
            </p>
          </>
        ),
      },
    ],
  },
  customization: {
    title: "Customization",
    description: "Per-guild prefix, command visibility, and tuning Arivix without code changes.",
    sections: [
      {
        id: "prefix",
        title: "Command prefix",
        content: (
          <>
            <p>
              Use the <code>.prefix</code> command (where allowed) to view or set the guild
              prefix. Defaults to a dot; choose something your members can type reliably.
            </p>
          </>
        ),
      },
      {
        id: "command-rules",
        title: "Command rules",
        content: (
          <>
            <p>
              Staff can restrict which commands run in a server via command configuration
              modules exposed to moderators. Pair this with channel slowmodes or category
              rules for noisy commands.
            </p>
            <p>
              Arivix Pro features (for example <code>.say</code>, <code>.createembed</code>,{" "}
              <code>.remind</code>, <code>.vanity</code>) require entitlement verification when
              the bot is linked to the site API.
            </p>
          </>
        ),
      },
    ],
  },
  security: {
    title: "Security",
    description: "Keep tokens, dashboards, and staff workflows safe.",
    sections: [
      {
        id: "secrets",
        title: "Secrets & hosting",
        content: (
          <>
            <p>
              Never commit <code>DISCORD_BOT_TOKEN</code>, database URLs, or{" "}
              <code>BOT_INTERNAL_SECRET</code> to public repositories. Rotate credentials
              if a staff member leaves or a log leaks.
            </p>
          </>
        ),
      },
      {
        id: "least-privilege",
        title: "Least privilege",
        content: (
          <>
            <p>
              Grant Arivix only the permissions each feature needs. Over-powered bot roles make
              abuse more damaging if an account is compromised. Audit who can configure jails,
              webhooks, and broadcast-style commands.
            </p>
          </>
        ),
      },
    ],
  },
  antinuke: {
    title: "Antinuke",
    description: "What Arivix does and does not automate for destructive admin abuse.",
    sections: [
      {
        id: "scope",
        title: "Scope",
        content: (
          <>
            <p>
              Arivix is not a dedicated antinuke suite. It does provide strong{" "}
              <strong>moderation</strong>, <strong>jail workflows</strong>,{" "}
              <strong>slowmode</strong>, and <strong>lockdown-style</strong> tooling you can
              combine with disciplined staff roles and external monitoring.
            </p>
          </>
        ),
      },
      {
        id: "playbook",
        title: "Practical playbook",
        content: (
          <>
            <p>
              Split dangerous permissions across roles, require 2FA for admins, and maintain
              offline contacts for your host. Use audit-oriented commands and server logs to
              reconstruct timelines after incidents.
            </p>
          </>
        ),
      },
    ],
  },
  antiraid: {
    title: "Antiraid",
    description: "Slowing joins, freezing channels, and containing spikes.",
    sections: [
      {
        id: "tooling",
        title: "Arivix tooling",
        content: (
          <>
            <p>
              Apply <strong>slowmode</strong> to public channels, use <strong>lockdown</strong>{" "}
              patterns documented in moderation references, and route suspects through{" "}
              <strong>jail</strong> flows when your staff policies call for it.
            </p>
          </>
        ),
      },
      {
        id: "verification",
        title: "Verification layers",
        content: (
          <>
            <p>
              Discord&apos;s native verification levels and third-party gate bots complement
              Arivix focuses on post-join moderation once members are inside your rules
              channel.
            </p>
          </>
        ),
      },
    ],
  },
  automod: {
    title: "Automod",
    description: "Lightweight automation versus Discord&apos;s native AutoMod.",
    sections: [
      {
        id: "native",
        title: "Prefer native AutoMod",
        content: (
          <>
            <p>
              For keyword floods, spam heuristics, and mention raids, Discord&apos;s built-in
              AutoMod remains the first line of defense. Arivix augments staff workflows after
              a message exists (purges, cases, notes).
            </p>
          </>
        ),
      },
      {
        id: "restrict",
        title: "Command restrictions",
        content: (
          <>
            <p>
              Pair AutoMod with Arivix&apos;s per-command rules so utility commands cannot be
              abused in announcement channels or by fresh accounts if you configure blocks
              accordingly.
            </p>
          </>
        ),
      },
    ],
  },
  moderation: {
    title: "Moderation",
    description: "Cases, punishments, jails, and staff ergonomics.",
    sections: [
      {
        id: "actions",
        title: "Core actions",
        content: (
          <>
            <p>
              Arivix ships bans, kicks, timeouts, warns, purges, channel locks, nick enforcement,
              jail routing, and extended ban utilities (soft/temp/hard/queue workflows where
              enabled). Check <a href="/commands">commands</a> for exact triggers — many commands
              include short <strong>aliases</strong>.
            </p>
          </>
        ),
      },
      {
        id: "evidence",
        title: "Evidence & auditing",
        content: (
          <>
            <p>
              Maintain a mod-log channel, attach reasons, and use note/history commands for
              long-running investigations. Proof uploads and case logs help when decisions are
              reviewed later.
            </p>
          </>
        ),
      },
    ],
  },
  "fake-permissions": {
    title: "Fake permissions",
    description: "Why Discord shows permissions that do not take effect.",
    sections: [
      {
        id: "hierarchy",
        title: "Role hierarchy",
        content: (
          <>
            <p>
              A role may list <em>Manage Roles</em> yet fail to modify members above it in the
              role list. Always verify the bot&apos;s highest role placement relative to
              targets.
            </p>
          </>
        ),
      },
      {
        id: "denies",
        title: "Channel overwrites",
        content: (
          <>
            <p>
              Channel-specific denies override guild grants. If a command fails silently, inspect
              the channel&apos;s permission view for the bot member and for managed channels
              like jails or VoiceMaster temps.
            </p>
          </>
        ),
      },
    ],
  },
  "server-configuration": {
    title: "Server configuration",
    description: "Guild-wide settings, access control, and auditing hooks.",
    sections: [
      {
        id: "dashboard",
        title: "Dashboard & commands",
        content: (
          <>
            <p>
              Use the site <a href="/dashboard">dashboard</a> for authenticated flows and prefix
              commands for in-server toggles. Document your staff SOPs so owners know which
              interface is canonical per feature.
            </p>
          </>
        ),
      },
      {
        id: "audit",
        title: "Audit hygiene",
        content: (
          <>
            <p>
              Track successful and failed command attempts where logs are exposed, and scrub
              sensitive data before exporting transcripts. Arivix&apos;s denylist/allowlist
              controls help retire abusive guilds without deleting data unexpectedly.
            </p>
          </>
        ),
      },
    ],
  },
};
