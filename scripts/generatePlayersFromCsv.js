/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parsePriceToLakhs(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim().toLowerCase();
  if (!s) return 0;

  const cleaned = s.replace(/,/g, "");

  // Example formats: "6cr", "6.75cr", "1cr", "50L"
  const crMatch = cleaned.match(/([\d.]+)\s*cr\b/);
  if (crMatch) return Number(crMatch[1]) * 100;

  const lMatch = cleaned.match(/([\d.]+)\s*l\b/);
  if (lMatch) return Number(lMatch[1]);

  // Fallback: first number in the string.
  const numMatch = cleaned.match(/([\d.]+)/);
  if (numMatch) return Number(numMatch[1]);

  return 0;
}

function mapRole(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "BAT";

  if (s.includes("wicket")) return "WK";
  if (s.includes("bowl")) return "BOWL";
  if (s.includes("bat")) return "BAT";
  if (s.includes("all round")) return "AR";
  if (s.includes("all rounder")) return "AR";
  if (s.includes("all-round")) return "AR";
  if (s.includes("all")) return "AR";

  return "BAT";
}

function inferOverseas(country) {
  return String(country ?? "").trim().toUpperCase() !== "IND";
}

function main() {
  const projectRoot = process.cwd();
  const csvPath = path.join(projectRoot, "IPL dataset final.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at ${csvPath}`);
  }

  const csvText = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("CSV parsed but contained no rows.");
  }

  const players = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = r["Player"];
    const country = r["COUNTRY"];
    const team = r["TEAM"];
    const payingRole = r["Paying_Role"];
    const soldPrice = r["SOLD_PRICE"];

    if (!name || !country || !team) continue;

    const id = `${slugify(name)}_${slugify(country)}_${slugify(team)}`;
    const overseas = inferOverseas(country);
    const role = mapRole(payingRole);
    const basePriceLakhs = parsePriceToLakhs(soldPrice);

    players.push({
      id,
      name: String(name).trim(),
      role,
      overseas,
      basePriceLakhs,
    });
  }

  const byId = {};
  for (const p of players) {
    byId[p.id] = p;
  }

  const outPath = path.join(projectRoot, "src", "data", "playersFromCsv.ts");
  const content =
    `import type { AuctionPlayer } from "@/lib/auctionTypes";\n\n` +
    `export const CSV_PLAYERS: AuctionPlayer[] = ${JSON.stringify(players, null, 2)} as AuctionPlayer[];\n\n` +
    `export const CSV_PLAYERS_BY_ID: Record<string, AuctionPlayer> = ${JSON.stringify(byId, null, 2)};\n\n` +
    `export function getPlayerById(playerId: string) {\n` +
    `  return CSV_PLAYERS_BY_ID[playerId];\n` +
    `}\n`;

  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Generated ${players.length} players into ${path.relative(projectRoot, outPath)}`);
}

main();

