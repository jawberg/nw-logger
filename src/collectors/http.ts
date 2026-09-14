import type { HttpResult } from "../types.js";

const FAILED_HTTP: HttpResult = { httpMs: null, httpStatus: 0 };

export async function measureHttp(
  url: string,
  timeoutMs: number,
): Promise<HttpResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    await response.arrayBuffer();
    return {
      httpMs: performance.now() - started,
      httpStatus: response.status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`HTTP ${url} failed: ${message}`);
    return FAILED_HTTP;
  } finally {
    clearTimeout(timer);
  }
}
