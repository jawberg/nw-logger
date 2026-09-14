export type Sample = {
  timestamp: string;
  gateway_ping_ms: number | null;
  gateway_packet_loss: number | null;
  internet1_ping_ms: number | null;
  internet1_packet_loss: number | null;
  internet2_ping_ms: number | null;
  internet2_packet_loss: number | null;
  dns_ms: number | null;
  http_ms: number | null;
  http_status: number | null;
  wan_download_mbps: number | null;
  wan_upload_mbps: number | null;
  wan_utilization_pct: number | null;
  wan_errors: number | null;
  wan_drops: number | null;
};

export type LatestResponse = {
  latest: Sample | null;
  lastSpeedtest: Sample | null;
};

export type SamplesResponse = {
  from: string;
  to: string;
  count: number;
  samples: Sample[];
};

export type PeriodKey = "1h" | "6h" | "24h" | "7d";

export const PERIOD_MS: Record<PeriodKey, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};
