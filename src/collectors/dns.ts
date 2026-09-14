import { resolve4 } from "node:dns/promises";
import { withTimeout } from "../proc.js";

export async function measureDns(
  query: string,
  timeoutMs: number,
): Promise<number | null> {
  const started = performance.now();
  try {
    await withTimeout(
      resolve4(query),
      timeoutMs,
      `DNS lookup timed out after ${timeoutMs}ms`,
    );
    return performance.now() - started;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`DNS ${query} failed: ${message}`);
    return null;
  }
}
