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
const LAYOUT_TSX = join(process.cwd(), "app/layout.tsx");
const GLOBALS_CSS = join(process.cwd(), "app/globals.css");
const PACKAGE_JSON = join(process.cwd(), "package.json");

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
    // Anchor font is reduced to fit CONSEQUENCE
    expect(css).toContain("clamp(2.1rem");
    expect(css).toContain("10.5vw");
    expect(css).toContain("4.2rem");
  });
});

describe("inQbeta theme configuration", () => {
  it("layout.tsx applies data-theme='inQbeta' to root html element", () => {
    const layout = readFileSync(LAYOUT_TSX, "utf-8");
    expect(layout).toContain('data-theme="inQbeta"');
  });

  it("globals.css defines [data-theme='inQbeta'] selector", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("[data-theme='inQbeta']");
  });

  it("globals.css imports @fontsource/lexend", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("@fontsource/lexend");
  });

  it("package.json includes @fontsource/lexend dependency", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf-8"));
    expect(pkg.dependencies).toHaveProperty("@fontsource/lexend");
  });

  it("inQbeta theme defines primary color palette tokens", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--color-primary-50:");
    expect(css).toContain("--color-primary-500:");
    expect(css).toContain("--color-primary-950:");
  });

  it("inQbeta theme defines secondary color palette tokens", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--color-secondary-50:");
    expect(css).toContain("--color-secondary-500:");
    expect(css).toContain("--color-secondary-950:");
  });

  it("inQbeta theme defines tertiary color palette tokens", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--color-tertiary-50:");
    expect(css).toContain("--color-tertiary-500:");
    expect(css).toContain("--color-tertiary-950:");
  });

  it("inQbeta theme defines success color palette tokens", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--color-success-50:");
    expect(css).toContain("--color-success-500:");
    expect(css).toContain("--color-success-950:");
  });

  it("inQbeta theme defines warning color palette tokens", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--color-warning-50:");
    expect(css).toContain("--color-warning-500:");
    expect(css).toContain("--color-warning-950:");
  });

  it("inQbeta theme defines error color palette tokens", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--color-error-50:");
    expect(css).toContain("--color-error-500:");
    expect(css).toContain("--color-error-950:");
  });

  it("inQbeta theme defines surface color palette tokens", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--color-surface-50:");
    expect(css).toContain("--color-surface-500:");
    expect(css).toContain("--color-surface-950:");
  });

  it("inQbeta theme defines scoop corner shape tokens", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--corner-shape-base: scoop");
    expect(css).toContain("--corner-shape-container: scoop");
  });

  it("inQbeta theme uses Lexend font for anchor typography", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--typo-anchor--font-family: 'Lexend', sans-serif");
  });

  it("inQbeta theme uses secondary color for headings", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--typo-heading--color-light: var(--color-secondary-500)");
    expect(css).toContain("--typo-heading--color-dark: var(--color-secondary-500)");
  });

  it("inQbeta theme uses primary color for anchors", () => {
    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--typo-anchor--color-light: var(--color-primary-500)");
    expect(css).toContain("--typo-anchor--color-dark: var(--color-primary-500)");
  });
});

describe("Test imports work", () => {
  it("can import vitest", () => {
    expect(typeof vi.fn()).toBe("function");
  });
});
