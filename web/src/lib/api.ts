import type { LatestResponse, PeriodKey, SamplesResponse } from "@/types";
import { PERIOD_MS } from "@/types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export function periodRange(period: PeriodKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - PERIOD_MS[period]);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function fetchLatest(): Promise<LatestResponse> {
  return getJson<LatestResponse>("/api/latest");
}

export function fetchSamples(from: string, to: string): Promise<SamplesResponse> {
  const params = new URLSearchParams({ from, to });
  return getJson<SamplesResponse>(`/api/samples?${params}`);
}
