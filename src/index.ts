import { measureDns } from "./collectors/dns.js";
import { resolveGatewayTarget } from "./collectors/gateway.js";
import { measureHttp } from "./collectors/http.js";
import { pingHost } from "./collectors/ping.js";
import { runSpeedtest } from "./collectors/speedtest.js";
import { loadConfig } from "./config.js";
import { openStore } from "./db.js";
import { startDashboard } from "./http.js";
import { sleep } from "./proc.js";
import type { AppConfig, Sample, SpeedtestResult } from "./types.js";

function round(value: number | null, digits = 3): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

async function collectSample(
  config: AppConfig,
  speedtest: SpeedtestResult | null,
): Promise<Sample> {
  const gatewayHost = await resolveGatewayTarget(config.gateway);

  const [gateway, internet1, internet2, dnsMs, http] = await Promise.all([
    gatewayHost
      ? pingHost(gatewayHost, config.pingCount, config.pingTimeoutSec)
      : Promise.resolve({ pingMs: null, packetLoss: 100 }),
    pingHost(config.internet1, config.pingCount, config.pingTimeoutSec),
    pingHost(config.internet2, config.pingCount, config.pingTimeoutSec),
    measureDns(config.dnsQuery, config.dnsTimeoutMs),
    measureHttp(config.httpUrl, config.httpTimeoutMs),
  ]);

  if (!gatewayHost) {
    console.error("No IPv4 default gateway found this tick");
  }

  return {
    timestamp: new Date().toISOString(),
    gateway_ping_ms: round(gateway.pingMs),
    gateway_packet_loss: round(gateway.packetLoss, 1),
    internet1_ping_ms: round(internet1.pingMs),
    internet1_packet_loss: round(internet1.packetLoss, 1),
    internet2_ping_ms: round(internet2.pingMs),
    internet2_packet_loss: round(internet2.packetLoss, 1),
    dns_ms: round(dnsMs),
    http_ms: round(http.httpMs),
    http_status: http.httpStatus,
    wan_download_mbps: round(speedtest?.downloadMbps ?? null, 2),
    wan_upload_mbps: round(speedtest?.uploadMbps ?? null, 2),
    wan_utilization_pct: null,
    wan_errors: null,
    wan_drops: null,
  };
}

function formatTick(sample: Sample): string {
  const gw = sample.gateway_ping_ms ?? "null";
  const i1 = sample.internet1_ping_ms ?? "null";
  const i2 = sample.internet2_ping_ms ?? "null";
  const speed =
    sample.wan_download_mbps !== null
      ? ` down=${sample.wan_download_mbps} up=${sample.wan_upload_mbps}`
      : "";
  return (
    `${sample.timestamp} gw=${gw}ms/${sample.gateway_packet_loss}%` +
    ` i1=${i1}ms/${sample.internet1_packet_loss}%` +
    ` i2=${i2}ms/${sample.internet2_packet_loss}%` +
    ` dns=${sample.dns_ms ?? "null"}ms` +
    ` http=${sample.http_status}/${sample.http_ms ?? "null"}ms` +
    speed
  );
}

async function main(): Promise<void> {
  const config = loadConfig();
  const store = openStore(config.dbPath);
  const dashboard = await startDashboard({
    host: config.dashboardHost,
    port: config.dashboardPort,
    store,
  });
  const shutdown = new AbortController();

  const onSignal = (signal: string) => {
    console.log(`Received ${signal}, shutting down`);
    shutdown.abort();
  };
  process.on("SIGTERM", () => onSignal("SIGTERM"));
  process.on("SIGINT", () => onSignal("SIGINT"));

  let pendingSpeedtest: SpeedtestResult | null = null;
  let speedtestRunning = false;
  let lastSpeedtestStartedAt = 0;

  const startSpeedtestIfDue = () => {
    if (shutdown.signal.aborted || speedtestRunning) return;
    const due =
      lastSpeedtestStartedAt === 0 ||
      Date.now() - lastSpeedtestStartedAt >= config.speedtestIntervalMs;
    if (!due) return;

    speedtestRunning = true;
    lastSpeedtestStartedAt = Date.now();
    console.log("Starting speedtest");
    void runSpeedtest(config.speedtestCommand)
      .then((result) => {
        pendingSpeedtest = result;
        if (result.downloadMbps !== null) {
          console.log(
            `Speedtest done: down=${result.downloadMbps.toFixed(2)} Mbps` +
              ` up=${result.uploadMbps?.toFixed(2) ?? "null"} Mbps`,
          );
        }
      })
      .finally(() => {
        speedtestRunning = false;
      });
  };

  console.log(
    `nw-logger started: interval=${config.intervalMs}ms` +
      ` speedtest=${config.speedtestIntervalMs}ms db=${config.dbPath}` +
      ` dashboard=${config.dashboardHost}:${config.dashboardPort}`,
  );

  startSpeedtestIfDue();

  while (!shutdown.signal.aborted) {
    const tickStarted = Date.now();
    startSpeedtestIfDue();
    const speedtest = pendingSpeedtest;
    pendingSpeedtest = null;

    try {
      const sample = await collectSample(config, speedtest);
      store.insert(sample);
      console.log(formatTick(sample));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Tick failed: ${message}`);
    }

    const waitMs = Math.max(0, config.intervalMs - (Date.now() - tickStarted));
    try {
      await sleep(waitMs, shutdown.signal);
    } catch {
      break;
    }
  }

  await dashboard.close().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Dashboard close failed: ${message}`);
  });
  store.close();
  console.log("nw-logger stopped");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
