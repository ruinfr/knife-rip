export type EmbedVariableCategoryId =
  | "user"
  | "member"
  | "server"
  | "channel"
  | "role"
  | "message"
  | "special";

export type EmbedVariableItem = {
  key: string;
  description: string;
};

export const EMBED_VARIABLE_CATEGORIES: {
  id: EmbedVariableCategoryId;
  label: string;
  items: EmbedVariableItem[];
}[] = [
  {
    id: "user",
    label: "User",
    items: [
      { key: "{user}", description: "User display name" },
      { key: "{user.id}", description: "User ID" },
      { key: "{user.name}", description: "Username" },
      { key: "{user.mention}", description: "User mention" },
      { key: "{user.avatar}", description: "Avatar URL" },
      { key: "{user.banner}", description: "Banner URL" },
      { key: "{user.tag}", description: "Tag / username" },
      { key: "{user.created_at}", description: "Account age (relative)" },
      {
        key: "{user.created_at_timestamp}",
        description: "Account created (unix s)",
      },
      { key: "{user.bot}", description: "Is bot (Yes/No)" },
    ],
  },
  {
    id: "member",
    label: "Member",
    items: [
      { key: "{member}", description: "Member display name" },
      { key: "{member.id}", description: "Member ID" },
      { key: "{member.name}", description: "Display name" },
      { key: "{member.nick}", description: "Nickname" },
      { key: "{member.mention}", description: "Member mention" },
      { key: "{member.avatar}", description: "Avatar URL" },
      { key: "{member.joined_at}", description: "Join age (relative)" },
      {
        key: "{member.joined_at_timestamp}",
        description: "Joined timestamp (unix s)",
      },
      { key: "{member.roles}", description: "Role mentions" },
      { key: "{member.role_count}", description: "Number of roles" },
    ],
  },
  {
    id: "server",
    label: "Server",
    items: [
      { key: "{guild.name}", description: "Server name" },
      { key: "{guild.id}", description: "Server ID" },
      { key: "{guild.icon}", description: "Server icon URL" },
      { key: "{guild.count}", description: "Member count" },
      { key: "{guild.member_count}", description: "Member count" },
      { key: "{guild.owner}", description: "Owner mention" },
      { key: "{guild.owner_id}", description: "Owner ID" },
      { key: "{guild.created_at}", description: "Server age (relative)" },
      { key: "{guild.boost_tier}", description: "Boost level" },
      { key: "{guild.boost_count}", description: "Boost count" },
    ],
  },
  {
    id: "channel",
    label: "Channel",
    items: [
      { key: "{channel.name}", description: "Channel name" },
      { key: "{channel.id}", description: "Channel ID" },
      { key: "{channel.mention}", description: "Channel mention" },
      { key: "{channel.topic}", description: "Channel topic" },
      { key: "{channel.created_at}", description: "Channel age" },
      { key: "{channel.parent_id}", description: "Category ID" },
      { key: "{channel.is_thread}", description: "Is thread (Yes/No)" },
    ],
  },
  {
    id: "role",
    label: "Role",
    items: [
      { key: "{role.id}", description: "Context role ID (future)" },
      { key: "{role.name}", description: "Context role name (future)" },
      { key: "{role.mention}", description: "Role mention (future)" },
      { key: "{role.color}", description: "Role color hex (future)" },
      { key: "{role.position}", description: "Role position (future)" },
    ],
  },
  {
    id: "message",
    label: "Message",
    items: [
      { key: "{message.id}", description: "Message ID" },
      { key: "{message.url}", description: "Message URL" },
      { key: "{message.content}", description: "Message content" },
      { key: "{message.created_at}", description: "Message age" },
    ],
  },
  {
    id: "special",
    label: "Special",
    items: [
      { key: "{timestamp}", description: "ISO timestamp (send time)" },
      { key: "$v", description: "New line inside a `{key: …}` value" },
    ],
  },
];
