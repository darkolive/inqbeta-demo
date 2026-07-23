"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AssetActivityPoint } from "../lib/balance-data";
import {
  assetActivityChartConfig,
  creditBalanceChartConfig,
} from "../lib/chart-theme";
import type { FederationTimePoint } from "../lib/types";
import { FederationLineChart } from "./FederationCharts";

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

function ensureLineChartPoints<T>(data: T[]): T[] {
  if (data.length === 1) {
    return [data[0], data[0]];
  }
  return data;
}

function activityYDomain(values: number[]): [number, number] {
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;
  if (max === min) {
    return [0, Math.max(max + 1, 2)];
  }
  return [Math.max(0, min - 1), max + 1];
}

export function BalanceCreditChart({
  points,
}: {
  points: FederationTimePoint[];
}) {
  return (
    <FederationLineChart
      points={points}
      label="Credit balance over time"
      valueLabel="Balance after exchange"
      chartConfig={creditBalanceChartConfig}
      dataKey="balance"
    />
  );
}

export function BalanceAssetActivityChart({
  points,
}: {
  points: AssetActivityPoint[];
}) {
  const chartData = useMemo(
    () =>
      ensureLineChartPoints(
        points.map((point) => ({
          date: point.timestamp,
          received: point.received,
          sent: point.sent,
        })),
      ),
    [points],
  );
  const yDomain = useMemo(
    () =>
      activityYDomain(
        chartData.flatMap((point) => [point.received, point.sent]),
      ),
    [chartData],
  );

  if (!points.length) {
    return <p>Action exchange rhythm appears as offers complete.</p>;
  }

  return (
    <div className="grid gap-2">
      <ChartContainer
        config={assetActivityChartConfig}
        className="aspect-auto h-40 w-full min-h-40"
        aria-label="Action exchange activity over time"
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
            width={28}
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
              />
            }
          />
          <Line
            type="monotone"
            dataKey="received"
            name="Action received"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="sent"
            name="Action sent"
            stroke="var(--color-secondary)"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="square"
            formatter={(value) => (
              <span className="text-sm opacity-80">{value}</span>
            )}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
