/**
 * Vercel sets VERCEL=1 during build. Run migrations there only; local `npm run build` skips migrate.
 */
const { execSync } = require("node:child_process");

const env = { ...process.env, FORCE_COLOR: "0" };

if (process.env.VERCEL === "1") {
  console.log("[build] VERCEL=1 — running prisma migrate deploy…");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
}

execSync("npx prisma generate", { stdio: "inherit", env });
execSync("npx next build --webpack", { stdio: "inherit", env });
