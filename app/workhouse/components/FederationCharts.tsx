"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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

export function FederationActivityList({
  shares,
}: {
  shares: AssetShareEntry[];
}) {
  const topActions = shares.filter((share) => !share.isOther);
  const otherActions = shares.find((share) => share.isOther);

  if (!topActions.length) {
    return <p>No completed action exchanges yet.</p>;
  }

  return (
    <div className="mx-4">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Action</th>
            <th scope="col" className="text-right">
              Exchanges
            </th>
            <th scope="col" className="text-right">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {topActions.map((share) => (
            <tr key={share.asset}>
              <td>{share.asset}</td>
              <td className="text-right font-semibold tabular-nums">
                {share.count}
              </td>
              <td className="text-right font-semibold tabular-nums">
                {Math.round(share.share * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
        {otherActions ? (
          <tfoot>
            <tr>
              <td>Other completed actions</td>
              <td className="text-right font-semibold tabular-nums">
                {otherActions.count}
              </td>
              <td className="text-right font-semibold tabular-nums">
                {Math.round(otherActions.share * 100)}%
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
