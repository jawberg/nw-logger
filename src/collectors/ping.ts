import { runCommand } from "../proc.js";
import type { PingResult } from "../types.js";

const LOSS_RE = /([\d.]+)% packet loss/;
const RTT_RE = /rtt min\/avg\/max\/(?:mdev|stddev) = [\d.]+\/([\d.]+)\//;

export function parsePingOutput(output: string): PingResult | null {
  const lossMatch = output.match(LOSS_RE);
  if (!lossMatch) {
    return null;
  }
  const packetLoss = Number(lossMatch[1]);
  const rttMatch = output.match(RTT_RE);
  const pingMs = rttMatch ? Number(rttMatch[1]) : null;
  return {
    pingMs: Number.isFinite(pingMs) ? pingMs : null,
    packetLoss: Number.isFinite(packetLoss) ? packetLoss : 100,
  };
}

const FAILED_PING: PingResult = { pingMs: null, packetLoss: 100 };

export async function pingHost(
  host: string,
  count: number,
  timeoutSec: number,
): Promise<PingResult> {
  const timeoutMs = (count * (timeoutSec + 1) + 3) * 1000;
  try {
    const result = await runCommand(
      "ping",
      ["-c", String(count), "-W", String(timeoutSec), "-q", host],
      timeoutMs,
    );
    const parsed = parsePingOutput(`${result.stdout}\n${result.stderr}`);
    return parsed ?? FAILED_PING;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`ping ${host} failed: ${message}`);
    return FAILED_PING;
  }
}
