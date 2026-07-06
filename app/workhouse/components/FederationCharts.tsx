"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AssetShareEntry, FederationTimePoint } from "../lib/types";

const PIE_SLICE_COLORS = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#64748b",
];

const wealthChartConfig = {
  wealth: {
    label: "Wealth",
    color: "var(--color-primary-950-50)",
  },
} satisfies ChartConfig;

export function buildWealthChartSeries(points: FederationTimePoint[]) {
  return points.map((point) => ({
    date: point.timestamp,
    wealth: point.value,
  }));
}

export function buildPieChartSeries(shares: AssetShareEntry[]) {
  return shares.map((share, index) => ({
    key: `slice${index}`,
    asset: share.asset,
    count: share.count,
    share: share.share,
  }));
}

function formatChartDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function wealthYDomain(values: number[]): [number, number] {
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;
  if (max === min) {
    return [0, Math.max(max + 1, 2)];
  }
  return [Math.max(0, min - 1), max + Math.ceil(max * 0.1) + 1];
}

function ensureLineChartPoints<T>(data: T[]): T[] {
  if (data.length === 1) {
    return [data[0], data[0]];
  }
  return data;
}

function buildPieChartConfig(shares: AssetShareEntry[]): ChartConfig {
  return shares.reduce<ChartConfig>((config, share, index) => {
    config[`slice${index}`] = {
      label: share.asset,
      color: PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length],
    };
    return config;
  }, {});
}

export function FederationLineChart({
  points,
  label,
  valueLabel = "Wealth",
  chartConfig = wealthChartConfig,
  dataKey = "wealth",
}: {
  points: FederationTimePoint[];
  label: string;
  valueLabel?: string;
  chartConfig?: ChartConfig;
  dataKey?: string;
}) {
  const chartData = useMemo(
    () =>
      ensureLineChartPoints(
        points.map((point) => ({
          date: point.timestamp,
          [dataKey]: point.value,
        })),
      ),
    [points, dataKey],
  );
  const yDomain = useMemo(
    () =>
      wealthYDomain(
        chartData.map((point) => Number(point[dataKey as keyof typeof point])),
      ),
    [chartData, dataKey],
  );

  if (!points.length) {
    return <p>Not enough data yet.</p>;
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-40 w-full min-h-40"
      aria-label={label}
    >
      <LineChart
        data={chartData}
        accessibilityLayer
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={formatChartDate}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          tickMargin={4}
          allowDecimals={false}
          domain={yDomain}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const timestamp = payload?.[0]?.payload?.date;
                return timestamp ? formatChartDate(String(timestamp)) : "";
              }}
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums">
                  {valueLabel}: {String(value)}
                </span>
              )}
            />
          }
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={`var(--color-${dataKey})`}
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 0 }}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

export function FederationPieChart({ shares }: { shares: AssetShareEntry[] }) {
  const chartData = useMemo(() => buildPieChartSeries(shares), [shares]);
  const chartConfig = useMemo(() => buildPieChartConfig(shares), [shares]);

  if (!shares.length) {
    return <p>No completed action exchanges yet.</p>;
  }

  return (
    <div className="grid gap-4">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square h-44 w-full max-w-56"
        aria-label="Most exchanged actions"
      >
        <PieChart accessibilityLayer>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="asset"
                labelKey="asset"
                formatter={(value, _name, item) => {
                  const count = item.payload?.count;
                  const share = item.payload?.share;
                  const percent =
                    typeof share === "number"
                      ? `${Math.round(share * 100)}%`
                      : "";
                  return (
                    <span className="font-mono font-medium tabular-nums">
                      {typeof count === "number" ? count : value}
                      {percent ? ` (${percent})` : ""}
                    </span>
                  );
                }}
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="asset"
            innerRadius={0}
            strokeWidth={1}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={entry.key}
                fill={`var(--color-${entry.key})`}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="grid list-none gap-1">
        {shares.map((share, index) => (
          <li key={share.asset} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length],
                }}
                aria-hidden
              />
              <span>{share.asset}</span>
            </span>
            <span className="font-semibold tabular-nums">
              {share.count} ({Math.round(share.share * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
