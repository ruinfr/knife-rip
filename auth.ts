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
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  /** Set AUTH_DEBUG=1 on Vercel temporarily to see full Auth errors in Function logs. */
  debug: process.env.AUTH_DEBUG === "1",
  logger: {
    error(error) {
      console.error("[auth]", error);
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
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
