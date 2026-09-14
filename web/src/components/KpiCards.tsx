import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fmtHttpStatus, fmtMbps, fmtMs, fmtTime } from "@/lib/format";
import type { LatestResponse } from "@/types";

type Props = {
  data: LatestResponse | null;
};

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      ) : null}
    </Card>
  );
}

export function KpiCards({ data }: Props) {
  const latest = data?.latest;
  const speed = data?.lastSpeedtest;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <Metric
        label="Gateway ping"
        value={fmtMs(latest?.gateway_ping_ms)}
        hint={
          latest
            ? `Loss ${latest.gateway_packet_loss ?? "—"}% · ${fmtTime(latest.timestamp)}`
            : "Geen data"
        }
      />
      <Metric
        label="Internet 1.1.1.1"
        value={fmtMs(latest?.internet1_ping_ms)}
        hint={
          latest
            ? `Loss ${latest.internet1_packet_loss ?? "—"}%`
            : undefined
        }
      />
      <Metric
        label="Internet 8.8.8.8"
        value={fmtMs(latest?.internet2_ping_ms)}
        hint={
          latest
            ? `Loss ${latest.internet2_packet_loss ?? "—"}%`
            : undefined
        }
      />
      <Metric
        label="DNS lookup"
        value={fmtMs(latest?.dns_ms)}
        hint={latest ? "cloudflare.com" : undefined}
      />
      <Metric
        label="HTTP check"
        value={
          latest
            ? `${fmtHttpStatus(latest.http_status)} · ${fmtMs(latest.http_ms)}`
            : "—"
        }
      />
      <Metric
        label="Laatste speedtest"
        value={
          speed
            ? `↓ ${fmtMbps(speed.wan_download_mbps)} · ↑ ${fmtMbps(speed.wan_upload_mbps)}`
            : "—"
        }
        hint={speed ? fmtTime(speed.timestamp) : "Nog geen speedtest"}
      />
    </div>
  );
}
