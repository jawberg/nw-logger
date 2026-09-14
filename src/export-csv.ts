import { writeFileSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { openStore } from "./db.js";
import type { Sample } from "./types.js";

const COLUMNS: (keyof Sample)[] = [
  "timestamp",
  "gateway_ping_ms",
  "gateway_packet_loss",
  "internet1_ping_ms",
  "internet1_packet_loss",
  "internet2_ping_ms",
  "internet2_packet_loss",
  "dns_ms",
  "http_ms",
  "http_status",
  "wan_download_mbps",
  "wan_upload_mbps",
  "wan_utilization_pct",
  "wan_errors",
  "wan_drops",
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toCsv(rows: Sample[]): string {
  const header = COLUMNS.join(",");
  const lines = rows.map((row) =>
    COLUMNS.map((col) => csvEscape(row[col])).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

const config = loadConfig();
const outPath = path.resolve(process.argv[2] ?? "samples.csv");
const store = openStore(config.dbPath);
try {
  const csv = toCsv(store.all());
  writeFileSync(outPath, csv, "utf8");
  console.log(`Wrote ${outPath}`);
} finally {
  store.close();
}
