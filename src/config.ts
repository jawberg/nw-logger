import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { AppConfig } from "./types.js";

const DEFAULTS: AppConfig = {
  intervalMs: 30_000,
  speedtestIntervalMs: 1_800_000,
  pingCount: 5,
  pingTimeoutSec: 1,
  httpTimeoutMs: 10_000,
  dnsTimeoutMs: 5_000,
  gateway: "auto",
  internet1: "1.1.1.1",
  internet2: "8.8.8.8",
  dnsQuery: "cloudflare.com",
  httpUrl: "https://www.cloudflare.com/cdn-cgi/trace",
  dbPath: "./data/network.db",
  speedtestCommand: "speedtest",
  dashboardHost: "0.0.0.0",
  dashboardPort: 8080,
};

function asFiniteNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function mergeConfig(raw: Record<string, unknown>): AppConfig {
  return {
    intervalMs: asFiniteNumber(raw.intervalMs, DEFAULTS.intervalMs),
    speedtestIntervalMs: asFiniteNumber(
      raw.speedtestIntervalMs,
      DEFAULTS.speedtestIntervalMs,
    ),
    pingCount: asFiniteNumber(raw.pingCount, DEFAULTS.pingCount),
    pingTimeoutSec: asFiniteNumber(raw.pingTimeoutSec, DEFAULTS.pingTimeoutSec),
    httpTimeoutMs: asFiniteNumber(raw.httpTimeoutMs, DEFAULTS.httpTimeoutMs),
    dnsTimeoutMs: asFiniteNumber(raw.dnsTimeoutMs, DEFAULTS.dnsTimeoutMs),
    gateway: asString(raw.gateway, DEFAULTS.gateway),
    internet1: asString(raw.internet1, DEFAULTS.internet1),
    internet2: asString(raw.internet2, DEFAULTS.internet2),
    dnsQuery: asString(raw.dnsQuery, DEFAULTS.dnsQuery),
    httpUrl: asString(raw.httpUrl, DEFAULTS.httpUrl),
    dbPath: asString(raw.dbPath, DEFAULTS.dbPath),
    speedtestCommand: asString(raw.speedtestCommand, DEFAULTS.speedtestCommand),
    dashboardHost: asString(raw.dashboardHost, DEFAULTS.dashboardHost),
    dashboardPort: asFiniteNumber(raw.dashboardPort, DEFAULTS.dashboardPort),
  };
}

function applyEnvOverrides(config: AppConfig): AppConfig {
  const env = process.env;
  return mergeConfig({
    ...config,
    intervalMs: env.NW_INTERVAL_MS ?? config.intervalMs,
    speedtestIntervalMs:
      env.NW_SPEEDTEST_INTERVAL_MS ?? config.speedtestIntervalMs,
    pingCount: env.NW_PING_COUNT ?? config.pingCount,
    pingTimeoutSec: env.NW_PING_TIMEOUT_SEC ?? config.pingTimeoutSec,
    httpTimeoutMs: env.NW_HTTP_TIMEOUT_MS ?? config.httpTimeoutMs,
    dnsTimeoutMs: env.NW_DNS_TIMEOUT_MS ?? config.dnsTimeoutMs,
    gateway: env.NW_GATEWAY ?? config.gateway,
    internet1: env.NW_INTERNET1 ?? config.internet1,
    internet2: env.NW_INTERNET2 ?? config.internet2,
    dnsQuery: env.NW_DNS_QUERY ?? config.dnsQuery,
    httpUrl: env.NW_HTTP_URL ?? config.httpUrl,
    dbPath: env.NW_DB_PATH ?? config.dbPath,
    speedtestCommand: env.NW_SPEEDTEST_COMMAND ?? config.speedtestCommand,
    dashboardHost: env.NW_DASHBOARD_HOST ?? config.dashboardHost,
    dashboardPort: env.NW_DASHBOARD_PORT ?? config.dashboardPort,
  });
}

function resolveConfigPath(): string | null {
  if (process.env.NW_CONFIG) {
    return path.resolve(process.env.NW_CONFIG);
  }
  const cwdConfig = path.resolve(process.cwd(), "config.json");
  if (existsSync(cwdConfig)) {
    return cwdConfig;
  }
  return null;
}

export function loadConfig(): AppConfig {
  const configPath = resolveConfigPath();
  let fileConfig: Record<string, unknown> = {};
  if (configPath) {
    if (!existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    fileConfig = JSON.parse(readFileSync(configPath, "utf8")) as Record<
      string,
      unknown
    >;
    console.log(`Loaded config from ${configPath}`);
  } else {
    console.log("No config.json found; using defaults (copy config.example.json)");
  }
  return applyEnvOverrides(mergeConfig(fileConfig));
}
