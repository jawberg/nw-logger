import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { KpiCards } from "@/components/KpiCards";
import { LatencyChart } from "@/components/LatencyChart";
import { PacketLossChart } from "@/components/PacketLossChart";
import { SpeedtestChart } from "@/components/SpeedtestChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchLatest, fetchSamples, periodRange } from "@/lib/api";
import { fmtTime } from "@/lib/format";
import type { LatestResponse, PeriodKey, Sample } from "@/types";

const REFRESH_MS = 30_000;

export default function App() {
  const [period, setPeriod] = useState<PeriodKey>("24h");
  const [latest, setLatest] = useState<LatestResponse | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { from, to } = periodRange(period);
      const [latestRes, samplesRes] = await Promise.all([
        fetchLatest(),
        fetchSamples(from, to),
      ]);
      setLatest(latestRes);
      setSamples(samplesRes.samples);
      setUpdatedAt(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Activity className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Netwerk dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Ping, DNS, HTTP en speedtest metingen
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Tabs
              value={period}
              onValueChange={(value) => setPeriod(value as PeriodKey)}
            >
              <TabsList>
                <TabsTrigger value="1h">1u</TabsTrigger>
                <TabsTrigger value="6h">6u</TabsTrigger>
                <TabsTrigger value="24h">24u</TabsTrigger>
                <TabsTrigger value="7d">7d</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
              {updatedAt
                ? `Bijgewerkt ${fmtTime(updatedAt.toISOString())}`
                : "Laden…"}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <KpiCards data={latest} />

        <div className="grid gap-6 xl:grid-cols-1">
          <LatencyChart samples={samples} />
          <div className="grid gap-6 lg:grid-cols-2">
            <PacketLossChart samples={samples} />
            <SpeedtestChart samples={samples} />
          </div>
        </div>
      </main>
    </div>
  );
}
