import type { DocPageDefinition } from "../types";

export const featurePages: Record<string, DocPageDefinition> = {
  automation: {
    title: "Automation",
    description: "Scheduled reminders, birthdays, autoroles, and passive reactions.",
    sections: [
      {
        id: "reminders",
        title: "Reminders",
        content: (
          <>
            <p>
              <strong>Arivix Pro</strong> unlocks <code>.remind</code> for personal DM reminders
              with rate limits — verify entitlement via <code>.billing</code> /{" "}
              <a href="/pricing">pricing</a>.
            </p>
          </>
        ),
      },
      {
        id: "birthday-autorole",
        title: "Birthday & autorole",
        content: (
          <>
            <p>
              Configure birthday celebrations and join-time autorole grants through the
              documented commands; keep timezone and duplicate-join edge cases in mind when
              testing.
            </p>
          </>
        ),
      },
    ],
  },
  roles: {
    title: "Roles",
    description: "Reaction roles, button roles, sticky grants, and timed roles.",
    sections: [
      {
        id: "self-service",
        title: "Self-service roles",
        content: (
          <>
            <p>
              Reaction and button role bindings let members opt into pings, colors, or access
              tiers. Ensure the bot can manage the destination roles and that channel slowmode
              won&apos;t frustrate legitimate clicks during raids.
            </p>
          </>
        ),
      },
      {
        id: "staff-roles",
        title: "Staff tooling",
        content: (
          <>
            <p>
              Temporary roles, mass movement tools, and strip-staff helpers support structured
              escalations. Pair with case reasons so every grant or removal is explainable.
            </p>
          </>
        ),
      },
    ],
  },
  messages: {
    title: "Messages",
    description: "Broadcasting, embeds, polls, purges, and recovery utilities.",
    sections: [
      {
        id: "broadcast",
        title: "Broadcasting",
        content: (
          <>
            <p>
              <code>.say</code> and <code>.createembed</code> accept structured embed scripts
              for Arivix Pro administrators — build scripts visually on{" "}
              <a href="/tools/embed">Embed builder</a>.
            </p>
          </>
        ),
      },
      {
        id: "snipe-poll",
        title: "Snipe & polls",
        content: (
          <>
            <p>
              Snipe buffers recover recently deleted messages for moderators. Polls publish
              interactive votes; tune permissions so only trusted ranks can spam them.
            </p>
          </>
        ),
      },
    ],
  },
  starboard: {
    title: "Starboard",
    description: "Status of starboard-style highlights in Arivix.",
    sections: [
      {
        id: "today",
        title: "Today",
        content: (
          <>
            <p>
              Arivix does not ship a dedicated starboard channel pipeline yet. Use Discord forum
              channels, dedicated highlight threads, or external starboard bots if you need
              automated reposting by emoji threshold.
            </p>
          </>
        ),
      },
    ],
  },
  voicemaster: {
    title: "VoiceMaster",
    description: "Temporary voice channels owned by members who create them.",
    sections: [
      {
        id: "setup",
        title: "Setup flow",
        content: (
          <>
            <p>
              VoiceMaster commands provision generator hubs, claim/unlock flows, and cleanup
              when owners leave. Ensure the bot has <strong>Manage Channels</strong> and{" "}
              <strong>Move Members</strong> where your documentation requires it.
            </p>
          </>
        ),
      },
    ],
  },
  levels: {
    title: "Levels",
    description: "Text and voice leaderboards without a RPG grind system.",
    sections: [
      {
        id: "leaderboards",
        title: "Leaderboards",
        content: (
          <>
            <p>
              <code>.lb</code> ranks message activity; <code>.vlb</code> ranks voice time.
              Milestones can stack with economy grants where those modules are enabled for your
              host.
            </p>
          </>
        ),
      },
    ],
  },
  "bump-reminder": {
    title: "Bump reminder",
    description: "Advertising bot bumps and growth tooling.",
    sections: [
      {
        id: "status",
        title: "Status",
        content: (
          <>
            <p>
              Arivix does not include a first-party Disboard-style bump reminder. Schedule
              manual reminders via staff rosters or consider complementary bots dedicated to
              growth analytics.
            </p>
          </>
        ),
      },
    ],
  },
  "reaction-triggers": {
    title: "Reaction triggers",
    description: "Emoji-driven automation for roles and logging.",
    sections: [
      {
        id: "roles",
        title: "Reaction roles",
        content: (
          <>
            <p>
              Map emojis on a stable message to grant or revoke roles. Prefer messages in
              low-churn channels and protect them with slowmode during raids.
            </p>
          </>
        ),
      },
    ],
  },
  "command-aliases": {
    title: "Command aliases",
    description: "Shorter triggers mapped to the same handlers.",
    sections: [
      {
        id: "catalog",
        title: "Discover aliases",
        content: (
          <>
            <p>
              The public commands page lists aliases beside each canonical name. Duplicate
              triggers are prevented during bot compile — if two commands conflict, the registry
              warns operators in logs.
            </p>
          </>
        ),
      },
    ],
  },
  logging: {
    title: "Logging",
    description: "Moderation paper trails, audits, and history viewers.",
    sections: [
      {
        id: "mod-log",
        title: "Moderation logs",
        content: (
          <>
            <p>
              Configure dedicated channels for cases, proofs, and punishment history. Use audit
              oriented commands to reconcile actions taken by multiple moderators across shifts.
            </p>
          </>
        ),
      },
    ],
  },
  miscellaneous: {
    title: "Miscellaneous",
    description: "Quality-of-life utilities that do not fit a single pillar.",
    sections: [
      {
        id: "highlights",
        title: "Highlights",
        content: (
          <>
            <p>
              AFK auto-replies, highlight keywords, server asset fetchers, and lightweight fun
              commands fill gaps between heavy moderation sessions. Browse the utility category
              on <a href="/commands">commands</a>.
            </p>
          </>
        ),
      },
    ],
  },
  music: {
    title: "Music",
    description: "Playback expectations.",
    sections: [
      {
        id: "status",
        title: "Status",
        content: (
          <>
            <p>
              Arivix is not a music bot. Use a dedicated music bot for queue management,
              ffmpeg hosting, and stable voice region performance.
            </p>
          </>
        ),
      },
    ],
  },
  giveaways: {
    title: "Giveaways",
    description: "Prize flows and eligibility tracking.",
    sections: [
      {
        id: "status",
        title: "Status",
        content: (
          <>
            <p>
              Arivix does not ship a full giveaway engine with rolling winners and legal
              disclaimers. Run giveaways manually with threads or integrate a specialized bot
              for Entrants/DM compliance.
            </p>
          </>
        ),
      },
    ],
  },
  counting: {
    title: "Counting",
    description: "Sequential number games.",
    sections: [
      {
        id: "status",
        title: "Status",
        content: (
          <>
            <p>
              Dedicated counting channels with reset rules are not a core Arivix feature. Use
              slowmode + a simple bot or forum thread to gate resets cleanly.
            </p>
          </>
        ),
      },
    ],
  },
  lastfm: {
    title: "Last.fm integrations",
    description: "Music stats and adjacent utilities.",
    sections: [
      {
        id: "music",
        title: "What Arivix offers",
        content: (
          <>
            <p>
              Arivix surfaces integrations like <code>.osu</code> for rhythm-game profiles.
              Traditional Last.fm scrobble commands are not bundled — use dedicated stats bots
              for chart generation.
            </p>
          </>
        ),
      },
    ],
  },
  utility: {
    title: "Utility",
    description: "Crypto, weather, images, Telegram snippets, and more.",
    sections: [
      {
        id: "families",
        title: "Command families",
        content: (
          <>
            <p>
              Explore crypto spot checks, gas oracles, transaction lookups, compression and media
              transforms, VoIP-friendly TTS, and social lookups. Many utilities require optional
              API keys documented in <code>.env.example</code>.
            </p>
          </>
        ),
      },
    ],
  },
};
