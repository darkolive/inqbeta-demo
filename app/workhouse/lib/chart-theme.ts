import type { ChartConfig } from "@/components/ui/chart";
import {
  CONTRIBUTION_CATEGORIES,
  contributionCategoryDataKey,
} from "./contribution-pattern-data";

/**
 * Skeleton foreground hierarchy for participation / history bank charts.
 * Tokens resolve on `.workhouse-surface` (see semantic-identity.css).
 *
 * Debug — series → CSS variable → chart series:
 *   primary   → --wh-chart-series-primary   → --color-primary-700-300   → exchange, balance, received
 *   secondary → --wh-chart-series-secondary → --color-secondary-700-300 → support, sent
 *   tertiary  → --wh-chart-series-tertiary  → --color-surface-950-50    → community
 */
export const WORKHOUSE_CHART_SERIES = {
  primary: "var(--wh-chart-series-primary)",
  secondary: "var(--wh-chart-series-secondary)",
  tertiary: "var(--wh-chart-series-tertiary)",
  sent: "var(--wh-chart-series-sent)",
} as const;

const PARTICIPATION_SERIES_COLORS = [
  WORKHOUSE_CHART_SERIES.primary,
  WORKHOUSE_CHART_SERIES.secondary,
  WORKHOUSE_CHART_SERIES.tertiary,
] as const;

export const participationChartConfig = CONTRIBUTION_CATEGORIES.reduce<ChartConfig>(
  (config, category, index) => {
    const key = contributionCategoryDataKey(category);
    config[key] = {
      label: category,
      color: PARTICIPATION_SERIES_COLORS[index] ?? WORKHOUSE_CHART_SERIES.primary,
    };
    return config;
  },
  {},
);

export const assetActivityChartConfig = {
  received: {
    label: "Action received",
    color: WORKHOUSE_CHART_SERIES.primary,
  },
  sent: {
    label: "Action sent",
    color: WORKHOUSE_CHART_SERIES.sent,
  },
} satisfies ChartConfig;

export const creditBalanceChartConfig = {
  balance: {
    label: "Balance",
    color: WORKHOUSE_CHART_SERIES.primary,
  },
} satisfies ChartConfig;
