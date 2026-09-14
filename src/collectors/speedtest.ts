import { runCommand } from "../proc.js";
import type { SpeedtestResult } from "../types.js";

const FAILED_SPEEDTEST: SpeedtestResult = {
  downloadMbps: null,
  uploadMbps: null,
};

type OoklaJson = {
  download?: { bandwidth?: number };
  upload?: { bandwidth?: number };
};

function bytesPerSecToMbps(bandwidth: number | undefined): number | null {
  if (typeof bandwidth !== "number" || !Number.isFinite(bandwidth)) {
    return null;
  }
  return (bandwidth * 8) / 1_000_000;
}

export async function runSpeedtest(
  command: string,
): Promise<SpeedtestResult> {
  try {
    const result = await runCommand(
      command,
      ["--accept-license", "--accept-gdpr", "--format=json"],
      180_000,
    );
    if (result.code !== 0) {
      console.error(
        `speedtest exited ${result.code}: ${result.stderr.trim() || result.stdout.trim()}`,
      );
      return FAILED_SPEEDTEST;
    }
    const parsed = JSON.parse(result.stdout) as OoklaJson;
    return {
      downloadMbps: bytesPerSecToMbps(parsed.download?.bandwidth),
      uploadMbps: bytesPerSecToMbps(parsed.upload?.bandwidth),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`speedtest failed: ${message}`);
    return FAILED_SPEEDTEST;
  }
}
