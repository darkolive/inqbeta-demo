"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AuditEntry } from "../lib/types";
import {
  buildContributionChartSeries,
  buildContributionEvents,
  buildContributionPatternSeries,
  CONTRIBUTION_CATEGORIES,
  CONTRIBUTION_PATTERN_EMPTY,
  CONTRIBUTION_PATTERN_INTRO,
  contributionCategoryDataKey,
  hasContributionPattern,
  type ContributionCategory,
} from "../lib/contribution-pattern-data";
import { participationChartConfig } from "../lib/chart-theme";

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

function participationYDomain(values: number[]): [number, number] {
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

export function ParticipationLineChart({
  points,
  ariaLabel,
}: {
  points: ReturnType<typeof buildContributionChartSeries>;
  ariaLabel: string;
}) {
  const chartData = useMemo(
    () => ensureLineChartPoints(points),
    [points],
  );
  const yDomain = useMemo(
    () =>
      participationYDomain(
        chartData.flatMap((point) => [
          point.exchange,
          point.support,
          point.community,
        ]),
      ),
    [chartData],
  );

  return (
    <ChartContainer
      config={participationChartConfig}
      className="aspect-auto h-48 w-full min-h-48"
      aria-label={ariaLabel}
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
          width={0}
          tickMargin={0}
          allowDecimals={false}
          domain={yDomain}
          hide
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
        {CONTRIBUTION_CATEGORIES.map((category: ContributionCategory) => {
          const key = contributionCategoryDataKey(category);
          return (
            <Line
              key={category}
              type="monotone"
              dataKey={key}
              name={category}
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          );
        })}
        <Legend
          verticalAlign="bottom"
          iconType="square"
          formatter={(value) => (
            <span className="text-sm opacity-80">{value}</span>
          )}
        />
      </LineChart>
    </ChartContainer>
  );
}

export function ContributionPatternSection({
  audit,
  helpReceipts,
}: {
  audit: AuditEntry[];
  helpReceipts: AuditEntry[];
}) {
  const events = useMemo(
    () => buildContributionEvents(audit, helpReceipts),
    [audit, helpReceipts],
  );
  const chartPoints = useMemo(() => {
    const series = buildContributionPatternSeries(events);
    return buildContributionChartSeries(series);
  }, [events]);

  return (
    <section className="mt-6 space-y-4">
      <p className="text-lg font-bold">My Participation</p>
      <div className="space-y-2 text-sm opacity-90">
        {CONTRIBUTION_PATTERN_INTRO.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {hasContributionPattern(events) ? (
        <ParticipationLineChart
          points={chartPoints}
          ariaLabel="Your participation pattern over time"
        />
      ) : (
        <p className="text-sm opacity-60">{CONTRIBUTION_PATTERN_EMPTY}</p>
      )}
    </section>
  );
}
