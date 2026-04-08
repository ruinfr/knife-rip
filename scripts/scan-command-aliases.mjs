import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cmdsRoot = path.join(__dirname, "..", "bot", "src", "commands");
const claimed = new Map();
const dups = [];

function extractCommandBlocks(fileContent) {
  const blocks = [];
  const re = /export const (\w+)\s*:\s*KnifeCommand\s*=\s*\{([\s\S]*?)\n\};/g;
  let m;
  while ((m = re.exec(fileContent)) !== null) {
    blocks.push({ exportName: m[1], body: m[2] });
  }
  if (blocks.length === 0 && fileContent.includes("KnifeCommand")) {
    const one = /\{([\s\S]*)\}\s*;?\s*$/m.exec(fileContent);
    if (one) blocks.push({ exportName: "?", body: one[1] });
  }
  return blocks;
}

function parseName(body) {
  const n = /name:\s*"([^"]+)"/.exec(body);
  return n ? n[1] : null;
}

function parseAliases(body) {
  const am = /aliases:\s*\[([\s\S]*?)\]/m.exec(body);
  if (!am) return [];
  return [...am[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

function claim(trigger, meta) {
  const k = trigger.toLowerCase();
  const prev = claimed.get(k);
  if (prev && prev.primary !== meta.primary)
    dups.push({ trigger: k, was: prev, now: meta });
  else if (!prev) claimed.set(k, meta);
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith(".ts")) {
      const s = fs.readFileSync(p, "utf8");
      if (!s.includes("KnifeCommand")) continue;
      const blocks = extractCommandBlocks(s);
      for (const { exportName, body } of blocks) {
        const primary = parseName(body);
        if (!primary) continue;
        const meta = { primary, exportName, file: path.relative(cmdsRoot, p) };
        claim(primary, meta);
        for (const a of parseAliases(body)) claim(a, meta);
      }
    }
  }
}

walk(cmdsRoot);
for (const d of dups) console.log(JSON.stringify(d, null, 0));
console.error("duplicate trigger count:", dups.length);
process.exit(dups.length ? 1 : 0);
