/**
 * Skeleton design-system convention tests for Workhouse.
 *
 * These tests verify shared styling conventions and abstractions, not implementation details.
 * They protect meaningful architectural patterns rather than auditing source code.
 *
 * Run with: npm test skeleton-styling-audit
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("@skeletonlabs/skeleton-react", () => ({
  Pagination: vi.fn(() => null),
}));

const WORKHOUSE_DIR = "app/workhouse";
const SEMANTIC_CSS = join(process.cwd(), `${WORKHOUSE_DIR}/semantic-identity.css`);
const CHART_THEME = join(process.cwd(), `${WORKHOUSE_DIR}/lib/chart-theme.ts`);
const FEDERATION_CHARTS = join(process.cwd(), `${WORKHOUSE_DIR}/components/FederationCharts.tsx`);

describe("Shared styling abstractions", () => {
  it("semantic-identity.css defines chart series variables for light/dark themes", () => {
    const css = readFileSync(SEMANTIC_CSS, "utf-8");
    // Primary, secondary, tertiary for line/bar charts
    expect(css).toContain("--wh-chart-series-primary:");
    expect(css).toContain("--wh-chart-series-secondary:");
    expect(css).toContain("--wh-chart-series-tertiary:");
    // Extended palette for pie charts
    expect(css).toContain("--wh-chart-series-4:");
    expect(css).toContain("--wh-chart-series-5:");
    expect(css).toContain("--wh-chart-series-6:");
  });

  it("semantic-identity.css uses Skeleton theme variables (not hardcoded hex)", () => {
    const css = readFileSync(SEMANTIC_CSS, "utf-8");
    // Uses Skeleton CSS variables
    expect(css).toContain("--color-primary-");
    expect(css).toContain("--color-secondary-");
    expect(css).toContain("--color-surface-");
    // No hardcoded hex in CSS rules
    const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(cssWithoutComments).not.toMatch(/#(?:[0-9a-fA-F]{3}){1,2}\b/);
  });

  it("chart-theme.ts exports semantic series mapping", () => {
    const content = readFileSync(CHART_THEME, "utf-8");
    // Exports semantic series constants that components can import
    expect(content).toContain("WORKHOUSE_CHART_SERIES");
    expect(content).toContain("primary:");
    expect(content).toContain("secondary:");
    expect(content).toContain("tertiary:");
  });

  it("FederationCharts.tsx uses semantic palette (not hardcoded hex)", () => {
    const content = readFileSync(FEDERATION_CHARTS, "utf-8");
    // Should use semantic CSS variables, not raw hex colors
    expect(content).toContain("var(--wh-chart-series-");
    // Should NOT have the old hardcoded palette
    expect(content).not.toContain('"#6366f1"');
    expect(content).not.toContain('"#22c55e"');
    expect(content).not.toContain('"#f59e0b"');
    expect(content).not.toContain('"#64748b"');
  });

  it("carousel anchor has increased font size", () => {
    const css = readFileSync(SEMANTIC_CSS, "utf-8");
    // Anchor font is now substantially larger
    expect(css).toContain("clamp(2.6rem");
    expect(css).toContain("13vw");
    expect(css).toContain("5.25rem");
  });
});

describe("Test imports work", () => {
  it("can import vitest", () => {
    expect(typeof vi.fn()).toBe("function");
  });
});
