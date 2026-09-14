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
  gateway: { label: "Gateway", color: "var(--chart-1)" },
  internet1: { label: "1.1.1.1", color: "var(--chart-2)" },
  internet2: { label: "8.8.8.8", color: "var(--chart-3)" },
  dns: { label: "DNS", color: "var(--chart-4)" },
  http: { label: "HTTP", color: "var(--chart-5)" },
} satisfies ChartConfig;

type Props = {
  samples: Sample[];
};

export function LatencyChart({ samples }: Props) {
  const data = samples.map((s) => ({
    time: s.timestamp,
    label: new Date(s.timestamp).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
    gateway: s.gateway_ping_ms,
    internet1: s.internet1_ping_ms,
    internet2: s.internet2_ping_ms,
    dns: s.dns_ms,
    http: s.http_ms,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latency</CardTitle>
        <CardDescription>Ping, DNS en HTTP in milliseconden</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis tickLine={false} axisLine={false} width={48} unit=" ms" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="gateway"
              stroke="var(--color-gateway)"
              dot={false}
              strokeWidth={2}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="internet1"
              stroke="var(--color-internet1)"
              dot={false}
              strokeWidth={2}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="internet2"
              stroke="var(--color-internet2)"
              dot={false}
              strokeWidth={2}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="dns"
              stroke="var(--color-dns)"
              dot={false}
              strokeWidth={2}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="http"
              stroke="var(--color-http)"
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
