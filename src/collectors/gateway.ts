import { runCommand } from "../proc.js";

/**
 * Resolve the IPv4 default gateway via `ip route`.
 * Returns null when there is no default route or the command is unavailable.
 */
export async function detectGateway(): Promise<string | null> {
  try {
    const result = await runCommand(
      "ip",
      ["-4", "route", "show", "default"],
      3_000,
    );
    const match = result.stdout.match(/default via (\S+)/);
    return match?.[1] ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Gateway auto-detect failed: ${message}`);
    return null;
  }
}

export async function resolveGatewayTarget(
  configured: string,
): Promise<string | null> {
  if (configured !== "auto") {
    return configured;
  }
  return detectGateway();
}
