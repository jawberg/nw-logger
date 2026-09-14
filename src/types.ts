export type AppConfig = {
  intervalMs: number;
  speedtestIntervalMs: number;
  pingCount: number;
  pingTimeoutSec: number;
  httpTimeoutMs: number;
  dnsTimeoutMs: number;
  gateway: string;
  internet1: string;
  internet2: string;
  dnsQuery: string;
  httpUrl: string;
  dbPath: string;
  speedtestCommand: string;
  dashboardHost: string;
  dashboardPort: number;
};

export type PingResult = {
  pingMs: number | null;
  packetLoss: number;
};

export type HttpResult = {
  httpMs: number | null;
  httpStatus: number;
};

export type SpeedtestResult = {
  downloadMbps: number | null;
  uploadMbps: number | null;
};

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
