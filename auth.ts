import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { db } from "@/lib/db";

const isProd = process.env.NODE_ENV === "production";
const onVercel = process.env.VERCEL === "1";

if (isProd || onVercel) {
  const missing: string[] = [];
  if (!process.env.AUTH_SECRET?.trim()) missing.push("AUTH_SECRET");
  if (!process.env.DISCORD_CLIENT_ID?.trim()) missing.push("DISCORD_CLIENT_ID");
  if (!process.env.DISCORD_CLIENT_SECRET?.trim()) {
    missing.push("DISCORD_CLIENT_SECRET");
  }
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (missing.length > 0) {
    console.error(
      "[auth] Missing env (fix in Vercel → Settings → Environment Variables):",
      missing.join(", "),
    );
  }
  const origin =
    process.env.AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!origin) {
    console.warn(
      "[auth] AUTH_URL and NEXT_PUBLIC_SITE_URL are both unset — set one to your public origin (e.g. https://arivix.org) for reliable OAuth cookies.",
    );
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: {
    error: "/auth/error",
  },
  /** Local: always. Production: set AUTH_DEBUG=1 on Vercel while troubleshooting. */
  debug:
    process.env.NODE_ENV === "development" || process.env.AUTH_DEBUG === "1",
  logger: {
    error(error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("[auth]", err.message, err.cause ?? err.stack);
    },
    warn(code) {
      console.warn("[auth]", code);
    },
  },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
