"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { FederationTimePoint } from "../lib/types";

const chartConfig = {
  members: {
    label: "Members",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

export function buildMembershipChartSeries(
  points: FederationTimePoint[],
  totalMembers: number,
) {
  if (!points.length) {
    if (totalMembers <= 0) return [];
    return [{ date: new Date().toISOString(), members: totalMembers }];
  }

  const series = points.map((point) => ({
    date: point.timestamp,
    members: point.value,
  }));

  const lastIndex = series.length - 1;
  if (series[lastIndex].members !== totalMembers) {
    series[lastIndex] = { ...series[lastIndex], members: totalMembers };
  }

  return series;
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

function membershipYDomain(values: number[]): [number, number] {
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;
  if (max === min) {
    return [0, Math.max(max + 1, 2)];
  }
  return [Math.max(0, min - 1), max + 1];
}

function ensureLineChartPoints<T>(data: T[]): T[] {
  if (data.length === 1) {
    return [data[0], data[0]];
  }
  return data;
}

export function FederationMembershipChart({
  totalMembers,
  points,
}: {
  totalMembers: number;
  points: FederationTimePoint[];
}) {
  const chartData = useMemo(
    () => ensureLineChartPoints(buildMembershipChartSeries(points, totalMembers)),
    [points, totalMembers],
  );
  const yDomain = useMemo(
    () => membershipYDomain(chartData.map((point) => point.members)),
    [chartData],
  );
  const showChart = chartData.length >= 1;

  return (
    <div className="grid gap-6">
      <div className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 flex w-full items-center justify-between gap-4 px-4 py-3">
        <span className="font-semibold uppercase tracking-wide">
          TOTAL MEMBERS
        </span>
        <span className="text-3xl font-semibold tabular-nums">
          {totalMembers}
        </span>
      </div>

      {showChart ? (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-40 w-full min-h-40"
          aria-label="Membership over the last 48 hours"
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
              dataKey="members"
              stroke="var(--color-members)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <p>Membership growth appears as people join.</p>
      )}
    </div>
  );
}
