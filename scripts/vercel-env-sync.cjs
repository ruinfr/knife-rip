/**
 * Push local .env to the linked Vercel project (production + preview).
 * Set SYNC_PREVIEW=0 to push production only.
 *
 *   npm run vercel:env
 *
 * Requires: `vercel login` and linked project (.vercel/project.json).
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const projectFile = path.join(root, ".vercel", "project.json");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env — copy from .env.example and fill values.");
  process.exit(1);
}

if (!fs.existsSync(projectFile)) {
  console.error("Missing .vercel/project.json — run: npx vercel link");
  process.exit(1);
}

const { orgId } = JSON.parse(fs.readFileSync(projectFile, "utf8"));
const envExtra = { ...process.env, VERCEL_ORG_ID: orgId };

const raw = fs.readFileSync(envPath, "utf8");
const lines = raw.split(/\n/);

/** @type {Array<{ key: string, value: string }>} */
const pairs = [];

for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  const key = t.slice(0, eq).trim();
  let value = t.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
    value = value.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
  if (!key || value === "") continue;
  pairs.push({ key, value });
}

const sensitiveRe =
  /SECRET|TOKEN|PASSWORD|DATABASE_URL|WEBHOOK|INTERNAL|KEY$/i;

const targets =
  process.env.SYNC_PREVIEW === "0"
    ? ["production"]
    : ["production", "preview"];

function runAdd(key, value, target) {
  const sensitive =
    sensitiveRe.test(key) ||
    key === "DISCORD_CLIENT_SECRET" ||
    key === "STRIPE_SECRET_KEY";

  const args = ["vercel", "env", "add", key, target];
  if (sensitive) args.push("--sensitive");
  args.push("--value", value, "--yes", "--force");

  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: envExtra,
    shell: false,
  });
  if (r.status !== 0) {
    console.error(`Failed: ${key} → ${target}`);
    process.exit(r.status ?? 1);
  }
  console.log(`OK ${key} → ${target}`);
}

for (const { key, value } of pairs) {
  for (const target of targets) {
    runAdd(key, value, target);
  }
}

console.log("Done. Trigger a redeploy on Vercel to use new values.");
