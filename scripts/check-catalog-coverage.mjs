/**
 * Verifies: (1) every registry export maps to a command `name`, (2) every canonical
 * catalog row matches a registered command with `site` metadata.
 *
 * The site merges canonical + DB; many bot commands may not have canonical rows yet.
 * Run: node scripts/check-catalog-coverage.mjs
 */
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const regPath = resolve(root, "bot/src/commands/registry.ts");
const canonPath = resolve(root, "lib/command-catalog-canonical.ts");
const cmdsDir = resolve(root, "bot/src/commands");

function walkTsFiles(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkTsFiles(p, acc);
    else if (ent.name.endsWith(".ts")) acc.push(p);
  }
  return acc;
}

function exportToPrimaryNames(fileContent) {
  const map = new Map();
  const re =
    /export const (\w+)\s*:\s*ArivixCommand\s*=\s*\{([\s\S]*?)\n\};/g;
  let m;
  while ((m = re.exec(fileContent)) !== null) {
    const exportName = m[1];
    const body = m[2];
    const nm = /name:\s*"([^"]+)"/.exec(body);
    if (nm) map.set(exportName, nm[1]);
  }
  return map;
}

const reg = readFileSync(regPath, "utf8");
const canon = readFileSync(canonPath, "utf8");

const registryNames = [
  ...reg.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*Command),$/gm),
].map((m) => m[1]);

const handoutNoSite = !readFileSync(
  resolve(root, "bot/src/commands/moderation/handout.ts"),
  "utf8",
).includes("site: {");

const canonNames = [...canon.matchAll(/^\s+name:\s*"([^"]+)"/gm)].map((m) => m[1]);
const canonSet = new Set(canonNames);

const noSiteCommands = new Set(handoutNoSite ? ["handout"] : []);

const nameByExport = new Map();
for (const fp of walkTsFiles(cmdsDir)) {
  const txt = readFileSync(fp, "utf8");
  if (!txt.includes("ArivixCommand")) continue;
  for (const [exp, primary] of exportToPrimaryNames(txt)) {
    nameByExport.set(exp, primary);
  }
}

/** Spread-only definition in remind.ts */
if (!nameByExport.has("remindersCommand")) {
  nameByExport.set("remindersCommand", "reminders");
}

const botSiteNames = new Set();
for (const exp of registryNames) {
  const cmd = nameByExport.get(exp);
  if (!cmd) {
    console.error("Unknown export in registry (no ArivixCommand match):", exp);
    process.exit(1);
  }
  if (noSiteCommands.has(cmd)) continue;
  botSiteNames.add(cmd);
}

const phantomCanon = [...canonSet].filter((n) => !botSiteNames.has(n)).sort();

console.log("Registry commands with site metadata:", botSiteNames.size);
console.log("Canonical rows:", canonSet.size);

if (phantomCanon.length) {
  console.error(
    "Canonical lists these names but no registered site command matches:",
    phantomCanon,
  );
  process.exit(1);
}

console.log("OK — canonical rows match live bot registry (site metadata).");
