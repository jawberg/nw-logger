import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Sample } from "./types.js";

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  gateway_ping_ms REAL,
  gateway_packet_loss REAL,
  internet1_ping_ms REAL,
  internet1_packet_loss REAL,
  internet2_ping_ms REAL,
  internet2_packet_loss REAL,
  dns_ms REAL,
  http_ms REAL,
  http_status INTEGER,
  wan_download_mbps REAL,
  wan_upload_mbps REAL,
  wan_utilization_pct REAL,
  wan_errors INTEGER,
  wan_drops INTEGER
);

CREATE INDEX IF NOT EXISTS idx_samples_timestamp ON samples(timestamp);
`;

const INSERT_SQL = `
INSERT INTO samples (
  timestamp,
  gateway_ping_ms,
  gateway_packet_loss,
  internet1_ping_ms,
  internet1_packet_loss,
  internet2_ping_ms,
  internet2_packet_loss,
  dns_ms,
  http_ms,
  http_status,
  wan_download_mbps,
  wan_upload_mbps,
  wan_utilization_pct,
  wan_errors,
  wan_drops
) VALUES (
  @timestamp,
  @gateway_ping_ms,
  @gateway_packet_loss,
  @internet1_ping_ms,
  @internet1_packet_loss,
  @internet2_ping_ms,
  @internet2_packet_loss,
  @dns_ms,
  @http_ms,
  @http_status,
  @wan_download_mbps,
  @wan_upload_mbps,
  @wan_utilization_pct,
  @wan_errors,
  @wan_drops
)
`;

const SELECT_COLUMNS = `
  timestamp,
  gateway_ping_ms,
  gateway_packet_loss,
  internet1_ping_ms,
  internet1_packet_loss,
  internet2_ping_ms,
  internet2_packet_loss,
  dns_ms,
  http_ms,
  http_status,
  wan_download_mbps,
  wan_upload_mbps,
  wan_utilization_pct,
  wan_errors,
  wan_drops
`;

export const DEFAULT_MAX_POINTS = 500;

export type SampleStore = {
  insert(sample: Sample): void;
  all(): Sample[];
  latest(): Sample | null;
  latestSpeedtest(): Sample | null;
  queryRange(from: string, to: string, maxPoints?: number): Sample[];
  close(): void;
};

function round(value: number | null, digits: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function avg(values: (number | null)[], digits: number): number | null {
  const nums = values.filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  if (nums.length === 0) return null;
  return round(nums.reduce((a, b) => a + b, 0) / nums.length, digits);
}

function lastNonNull(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const value = values[i];
    if (value !== null && Number.isFinite(value)) return value;
  }
  return null;
}

export function downsample(
  rows: Sample[],
  maxPoints = DEFAULT_MAX_POINTS,
): Sample[] {
  if (rows.length <= maxPoints) return rows;
  const bucketSize = rows.length / maxPoints;
  const out: Sample[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucketSize));
    const bucket = rows.slice(start, end);
    if (bucket.length === 0) continue;
    const last = bucket[bucket.length - 1];
    out.push({
      timestamp: last.timestamp,
      gateway_ping_ms: avg(
        bucket.map((s) => s.gateway_ping_ms),
        3,
      ),
      gateway_packet_loss: avg(
        bucket.map((s) => s.gateway_packet_loss),
        1,
      ),
      internet1_ping_ms: avg(
        bucket.map((s) => s.internet1_ping_ms),
        3,
      ),
      internet1_packet_loss: avg(
        bucket.map((s) => s.internet1_packet_loss),
        1,
      ),
      internet2_ping_ms: avg(
        bucket.map((s) => s.internet2_ping_ms),
        3,
      ),
      internet2_packet_loss: avg(
        bucket.map((s) => s.internet2_packet_loss),
        1,
      ),
      dns_ms: avg(
        bucket.map((s) => s.dns_ms),
        3,
      ),
      http_ms: avg(
        bucket.map((s) => s.http_ms),
        3,
      ),
      http_status: lastNonNull(bucket.map((s) => s.http_status)),
      wan_download_mbps: lastNonNull(bucket.map((s) => s.wan_download_mbps)),
      wan_upload_mbps: lastNonNull(bucket.map((s) => s.wan_upload_mbps)),
      wan_utilization_pct: lastNonNull(
        bucket.map((s) => s.wan_utilization_pct),
      ),
      wan_errors: lastNonNull(bucket.map((s) => s.wan_errors)),
      wan_drops: lastNonNull(bucket.map((s) => s.wan_drops)),
    });
  }
  return out;
}

export function openStore(dbPath: string): SampleStore {
  mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(CREATE_SQL);

  const insertStmt = db.prepare(INSERT_SQL);
  const selectAllStmt = db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM samples
    ORDER BY timestamp ASC, id ASC
  `);
  const selectLatestStmt = db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM samples
    ORDER BY timestamp DESC, id DESC
    LIMIT 1
  `);
  const selectLatestSpeedtestStmt = db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM samples
    WHERE wan_download_mbps IS NOT NULL OR wan_upload_mbps IS NOT NULL
    ORDER BY timestamp DESC, id DESC
    LIMIT 1
  `);
  const selectRangeStmt = db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM samples
    WHERE timestamp >= @from AND timestamp <= @to
    ORDER BY timestamp ASC, id ASC
  `);

  return {
    insert(sample: Sample) {
      insertStmt.run(sample);
    },
    all() {
      return selectAllStmt.all() as Sample[];
    },
    latest() {
      return (selectLatestStmt.get() as Sample | undefined) ?? null;
    },
    latestSpeedtest() {
      return (selectLatestSpeedtestStmt.get() as Sample | undefined) ?? null;
    },
    queryRange(from: string, to: string, maxPoints = DEFAULT_MAX_POINTS) {
      const rows = selectRangeStmt.all({ from, to }) as Sample[];
      return downsample(rows, maxPoints);
    },
    close() {
      db.close();
    },
  };
}
