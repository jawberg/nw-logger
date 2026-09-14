import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Sample } from "@/types";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const chartConfig = {
  download: { label: "Download", color: "var(--chart-1)" },
  upload: { label: "Upload", color: "var(--chart-2)" },
} satisfies ChartConfig;

type Props = {
  samples: Sample[];
};

export function SpeedtestChart({ samples }: Props) {
  const data = samples
    .filter(
      (s) => s.wan_download_mbps !== null || s.wan_upload_mbps !== null,
    )
    .map((s) => ({
      label: new Date(s.timestamp).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      download: s.wan_download_mbps,
      upload: s.wan_upload_mbps,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Speedtest</CardTitle>
        <CardDescription>
          WAN download/upload (ca. elke 30 min)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nog geen speedtest-resultaten in deze periode.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
            <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis tickLine={false} axisLine={false} width={48} unit=" Mbps" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="download"
                stroke="var(--color-download)"
                dot={{ r: 3 }}
                strokeWidth={2}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="upload"
                stroke="var(--color-upload)"
                dot={{ r: 3 }}
                strokeWidth={2}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
