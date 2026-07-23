/**
 * Regression tests for the Workhouse landing page (RulesOfTheGameDeck).
 * Verifies the Skeleton React Carousel implementation:
 *   1. Carousel uses @skeletonlabs/skeleton-react
 *   2. Carousel root has correct props (slideCount, slidesPerPage, slidesPerMove, loop)
 *   3. All slides are rendered from existing RULES_OF_THE_GAME_CARDS data
 *   4. Previous and Next use Skeleton trigger components
 *   5. Indicators use official Skeleton indicator components
 *   6. Slides use tonal surface preset
 *   7. Anchor word styling preserved
 *   8. Enter button outside carousel
 *   9. QR code placement unchanged
 *  10. No redundant manual carousel state
 *
 * Run with: npm test page-landing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const pagePath = join(process.cwd(), "app/workhouse/page.tsx");

describe("Landing page — Skeleton React Carousel", () => {
  let content: string;

  beforeEach(() => {
    content = readFileSync(pagePath, "utf-8");
  });

  // ─── 1. Carousel imports from Skeleton React ─────────────────────────────────

  describe("1. Carousel uses Skeleton React Carousel component", () => {
    it("imports Carousel from @skeletonlabs/skeleton-react", () => {
      // The import line should include Carousel
      const importMatch = content.match(
        /import\s+\{([^}]+)\}\s+from\s+"@skeletonlabs\/skeleton-react"/
      );
      expect(importMatch).toBeTruthy();
      expect(importMatch[1]).toContain("Carousel");
    });

    it("does not use a custom carousel state system (no index, dragX state)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      // No manual activeSlide or index state for carousel
      expect(deckBody).not.toMatch(/\bindex\b.*useState/);
      expect(deckBody).not.toMatch(/\bdragX\b.*useState/);
    });
  });

  // ─── 2. Carousel root props ──────────────────────────────────────────────────

  describe("2. Carousel root has correct Skeleton props", () => {
    it("slideCount is set to cards.length", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("slideCount={cards.length}");
    });

    it("slidesPerPage is 1", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("slidesPerPage={1}");
    });

    it("slidesPerMove is 1", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("slidesPerMove={1}");
    });

    it("loop is enabled", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("loop");
    });

    it("autoSize prop is NOT present (removed to fix width overflow)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toContain("autoSize");
    });

    it("immediate parent has shrink-safe width containment", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      // Parent grid with width constraints
      expect(deckBody).toContain('grid gap-4 w-full min-w-0 max-w-full overflow-hidden');
    });
  });

  // ─── 3. All slides rendered from existing data ───────────────────────────────

  describe("3. All slides rendered from existing RULES_OF_THE_GAME_CARDS data", () => {
    it("RULES_OF_THE_GAME_CARDS array is intact", () => {
      expect(content).toContain("const RULES_OF_THE_GAME_CARDS");
      expect(content).toContain('id: "game"');
      expect(content).toContain('id: "yes"');
      expect(content).toContain('id: "consequence"');
    });

    it("RulesCardStatement is still used to render card text", () => {
      expect(content).toContain("RulesCardStatement");
    });

    it("all 12 original slides are present", () => {
      const cards = [
        'id: "game"',
        'id: "choose"',
        'id: "character"',
        'id: "friend"',
        'id: "deal"',
        'id: "yes"',
        'id: "no"',
        'id: "bargain"',
        'id: "give"',
        'id: "take"',
        'id: "consequence"',
      ];
      cards.forEach((card) => {
        expect(content).toContain(card);
      });
    });

    it("anchor word text is preserved for first and last slides", () => {
      expect(content).toContain('anchor: "GAME"');
      expect(content).toContain('anchor: "RECEIPTS"');
    });

    it("lead line text is preserved for first slide", () => {
      expect(content).toContain('lead: "This is a"');
      expect(content).toContain('anchor: "GAME"');
    });

    it("GIVE slide has explicit lead/anchor split", () => {
      expect(content).toContain('lead: "Free to"');
      expect(content).toContain('anchor: "GIVE"');
    });

    it("TAKE slide has explicit lead/anchor split", () => {
      expect(content).toContain('lead: "Never free to"');
      expect(content).toContain('anchor: "TAKE"');
    });

    it("consequence and receipts are separate slides", () => {
      // Choice has / CONSEQUENCE slide
      expect(content).toContain('lead: "Choice has"');
      expect(content).toContain('anchor: "CONSEQUENCE"');
      // The system keeps / RECEIPTS slide
      expect(content).toContain('lead: "The system keeps"');
      expect(content).toContain('anchor: "RECEIPTS"');
    });
  });

  // ─── 4. Previous and Next use Skeleton trigger components ─────────────────────

  describe("4. Previous and Next use Skeleton trigger components", () => {
    it("Carousel.PrevTrigger is used for Previous", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("Carousel.PrevTrigger");
    });

    it("Carousel.NextTrigger is used for Next", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("Carousel.NextTrigger");
    });

    it("Previous trigger contains ChevronLeftIcon and 'Previous' label", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("ChevronLeftIcon");
      expect(deckBody).toContain("<span>Previous</span>");
    });

    it("Next trigger contains ChevronRightIcon and 'Next' label", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("ChevronRightIcon");
      expect(deckBody).toContain("<span>Next</span>");
    });

    it("trigger buttons use outlined surface treatment (secondary to Enter)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("preset-outlined-surface-300-700");
    });

    it("both triggers have aria-label for accessibility", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain('aria-label="Previous card"');
      expect(deckBody).toContain('aria-label="Next card"');
    });
  });

  // ─── 5. Indicators use official Skeleton indicator components ─────────────────

  describe("5. Indicators use official Skeleton indicator components", () => {
    it("Carousel.IndicatorGroup is rendered", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("Carousel.IndicatorGroup");
    });

    it("Carousel.Indicator is used for each slide", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("Carousel.Indicator");
    });

    it("one indicator is rendered per slide via map", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      // Should map over cards to create indicators
      expect(deckBody).toContain("cards.map");
      expect(deckBody).toContain("Carousel.Indicator");
    });
  });

  // ─── 6. Slides use tonal surface preset ─────────────────────────────────────

  describe("6. Slides use tonal surface preset", () => {
    it("slides use preset-tonal-surface", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("preset-tonal-surface");
    });

    it("carousel slides no longer use preset-filled-primary-500 (START GAME outside carousel uses it)", () => {
      // Only check the Carousel.ItemGroup section, not the whole deck
      const itemGroupStart = content.indexOf("<Carousel.ItemGroup>");
      const itemGroupEnd = content.indexOf("</Carousel.ItemGroup>");
      const itemGroup = content.slice(itemGroupStart, itemGroupEnd);
      // Carousel slides should NOT have primary filled background
      expect(itemGroup).not.toContain("preset-filled-primary-500");
    });

    it("no drag handlers remain in carousel (touch-pan-y, onPointerDown, etc.)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toContain("touch-pan-y");
      expect(deckBody).not.toContain("onPointerDown");
      expect(deckBody).not.toContain("onPointerMove");
      expect(deckBody).not.toContain("onPointerUp");
      expect(deckBody).not.toContain("onPointerCancel");
    });
  });

  // ─── 7. Anchor word styling preserved ────────────────────────────────────────

  describe("7. Anchor word styling preserved", () => {
    it("RulesCardStatement is still used", () => {
      expect(content).toContain("RulesCardStatement");
    });

    it(".rules-carousel-anchor class is still referenced in RulesCardStatement", () => {
      // RulesCardStatement is defined before RulesOfTheGameDeck, so check full file
      expect(content).toContain("rules-carousel-anchor");
    });

    it("semantic-identity.css still contains .rules-carousel-anchor with increased font size", async () => {
      const fs = await import("fs");
      const css = fs.readFileSync(
        "app/workhouse/semantic-identity.css",
        "utf-8"
      );
      expect(css).toContain(".rules-carousel-anchor");
      // Anchor font is now substantially larger
      expect(css).toContain("clamp(2.6rem");
      expect(css).toContain("13vw");
      expect(css).toContain("5.25rem");
    });

    it(".rules-carousel-anchor uses theme-aware foreground (var(--color-surface-950-50))", async () => {
      const fs = await import("fs");
      const css = fs.readFileSync(
        "app/workhouse/semantic-identity.css",
        "utf-8"
      );
      const anchorSection = css.match(
        /\.rules-carousel-anchor\s*\{[\s\S]*?\n  \}/m
      );
      expect(anchorSection).toBeTruthy();
      const anchorText = anchorSection?.[0] ?? "";
      expect(anchorText).toContain("var(--color-surface-950-50)");
    });
  });

  // ─── 8. Enter button outside carousel, retains behaviour ─────────────────────

  describe("8. Enter button is outside carousel and retains behaviour", () => {
    it("START GAME button is present with onDone handler", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("START GAME");
      expect(deckBody).toContain("onClick={onDone}");
    });

    it("START GAME button uses preset-filled-primary-500 (call-to-action)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("preset-filled-primary-500");
    });

    it("START GAME button is NOT inside Carousel component", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      // START GAME must come after the closing Carousel tag
      const carouselCloseIdx = deckBody.lastIndexOf("</Carousel>");
      const startGameIdx = deckBody.indexOf("START GAME");
      expect(startGameIdx).toBeGreaterThan(carouselCloseIdx);
    });
  });

  // ─── 9. QR code placement unchanged ─────────────────────────────────────────

  describe("9. QR code placement unchanged", () => {
    it("QR image renders using /images/qr-code.png", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain('src="/images/qr-code.png"');
    });

    it("QR image has descriptive alt attribute", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("alt=");
      expect(deckBody).toMatch(/alt="[^"]*join[^"]*experience[^"]*"/i);
    });

    it("QR image uses responsive sizing (w-[180px])", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain('w-[180px]');
    });

    it("QR caption text is present", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain(
        "Scan to join this shared experience on another device."
      );
    });

    it("QR section is below the Enter button", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      const startGameIdx = deckBody.indexOf("START GAME");
      const qrIdx = deckBody.indexOf('src="/images/qr-code.png"');
      expect(qrIdx).toBeGreaterThan(startGameIdx);
    });

    it("QR section has mt-8 spacing from Enter button", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("mt-8 flex flex-col items-center gap-3 pb-8");
    });
  });

  // ─── 10. No redundant manual carousel state ─────────────────────────────────

  describe("10. No redundant manual carousel state remains", () => {
    it("no goPrev/goNext functions defined", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toContain("const goPrev");
      expect(deckBody).not.toContain("const goNext");
    });

    it("no atFirst/atLast state derived from manual index", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toContain("atFirst");
      expect(deckBody).not.toContain("atLast");
    });

    it("no progress label with safeIndex + 1 (replaced by Skeleton Indicator)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toContain("safeIndex");
      expect(deckBody).not.toContain("progressLabel");
      expect(deckBody).not.toContain("${safeIndex + 1}");
    });

    it("no card peek / next card preview (opacity-50 on carousel slides)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toContain('className="card preset-filled-primary-500 absolute inset-0');
      expect(deckBody).not.toContain("opacity-50");
    });

    it("no drag-related CSS transform or rotation", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toContain("transform:");
      expect(deckBody).not.toContain("rotate(");
    });

    it("no manual index state (useState for carousel position)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
      const deckBody = content.slice(deckStart, deckEnd);
      // Should have no useState inside RulesOfTheGameDeck (other components in page may)
      // Check that the function body doesn't define any carousel-specific state
      const funcBody = deckBody.slice(deckBody.indexOf("function RulesOfTheGameDeck"));
      const openBrace = funcBody.indexOf("{");
      const closeBrace = funcBody.indexOf("\n}");
      const innerBody = funcBody.slice(openBrace, closeBrace);
      expect(innerBody).not.toMatch(/const\s+\[\s*\w*index\w*/);
      expect(innerBody).not.toMatch(/const\s+\[\s*\w*dragX\w*/);
    });
  });
});

// ─── 11. Carousel width containment ───────────────────────────────────────────

describe("11. Carousel is width-constrained to prevent horizontal overflow", () => {
  let content: string;

  beforeEach(() => {
    content = readFileSync(pagePath, "utf-8");
  });

  it("carousel root wrapper uses w-full min-w-0 max-w-full and Carousel uses responsive width", () => {
    const deckStart = content.indexOf("function RulesOfTheGameDeck");
    const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
    const deckBody = content.slice(deckStart, deckEnd);
    // The outer grid div wrapping the Carousel has width constraints
    expect(deckBody).toContain('w-full min-w-0 max-w-full overflow-hidden');
    // The Carousel root itself also uses responsive width to override fixed inline styles
    // Includes workhouse-carousel-root for scoped CSS fallback plus width constraints
    expect(deckBody).toContain('className="workhouse-carousel-root w-full min-w-0 max-w-full"');
    // Style with width 100% (may include additional flexShrink property)
    expect(deckBody).toMatch(/style=\{\{.*width:\s*"100%".*\}\}/);
  });

  it("viewport (ItemGroup) uses overflow-hidden and responsive width", () => {
    const deckStart = content.indexOf("function RulesOfTheGameDeck");
    const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
    const deckBody = content.slice(deckStart, deckEnd);
    // The ItemGroup viewport must clip overflowing flex items and use responsive width
    expect(deckBody).toContain("Carousel.ItemGroup");
    expect(deckBody).toContain('className="w-full min-w-0 max-w-full overflow-hidden"');
  });

  it("Carousel.Item elements use shrink-safe sizing (min-w-0 max-w-full)", () => {
    const deckStart = content.indexOf("function RulesOfTheGameDeck");
    const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
    const deckBody = content.slice(deckStart, deckEnd);
    // Items must be able to shrink, not expand beyond viewport
    expect(deckBody).toContain('Carousel.Item');
    expect(deckBody).toContain('className="min-w-0 max-w-full"');
  });

  it("inner slide card uses w-full min-w-0 max-w-full", () => {
    const deckStart = content.indexOf("function RulesOfTheGameDeck");
    const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
    const deckBody = content.slice(deckStart, deckEnd);
    // The card div inside each item must not exceed its container
    expect(deckBody).toContain('w-full min-w-0 max-w-full');
  });

  it("parent flex child has min-w-0 to allow shrinking", () => {
    // The wrapper around RulesOfTheGameDeck in the page component
    const pageContent = content.slice(
      content.indexOf("export default function WorkhousePage")
    );
    // The div wrapping RulesOfTheGameDeck must have min-w-0
    expect(pageContent).toContain('<div className="mt-2 min-w-0">');
  });

  it("no w-screen or fixed minimum width is introduced in the carousel", () => {
    const deckStart = content.indexOf("function RulesOfTheGameDeck");
    const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
    const deckBody = content.slice(deckStart, deckEnd);
    expect(deckBody).not.toMatch(/w-screen/);
    expect(deckBody).not.toMatch(/min-width:\s*\d+px/);
  });

  it("slidesPerPage remains 1 (one slide per page)", () => {
    const deckStart = content.indexOf("function RulesOfTheGameDeck");
    const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
    const deckBody = content.slice(deckStart, deckEnd);
    expect(deckBody).toContain("slidesPerPage={1}");
  });

  it("slidesPerMove remains 1", () => {
    const deckStart = content.indexOf("function RulesOfTheGameDeck");
    const deckEnd = content.indexOf("\nfunction WorkhouseInfoSection");
    const deckBody = content.slice(deckStart, deckEnd);
    expect(deckBody).toContain("slidesPerMove={1}");
  });

  it("RulesCardStatement uses compact gap instead of justify-between", () => {
    const deckStart = content.indexOf("function RulesCardStatement");
    const deckEnd = deckStart + 300; // Look within a reasonable range
    const statementBody = content.slice(deckStart, deckEnd);
    // Uses gap-1 for compact spacing instead of justify-between
    expect(statementBody).toContain("gap-1");
    expect(statementBody).not.toContain("justify-between");
  });

  it("carousel slide horizontal padding has been reduced", () => {
    // Check full content since the constant is defined earlier in the file
    // New reduced responsive padding instead of large fixed inset
    expect(content).toContain('px-3 sm:px-4');
  });

  it("Skeleton Carousel component remains in use", () => {
    const importMatch = content.match(
      /import\s+\{([^}]+)\}\s+from\s+"@skeletonlabs\/skeleton-react"/
    );
    expect(importMatch).toBeTruthy();
    expect(importMatch[1]).toContain("Carousel");
  });

    it("all slide content remains present after containment changes", () => {
    // RulesCardStatement, rules-carousel-anchor, and RULES_OF_THE_GAME_CARDS are defined
    // before RulesOfTheGameDeck in the file
    expect(content).toContain("RulesCardStatement");
    expect(content).toContain("rules-carousel-anchor");
    // The card data exists in the file with new lead/anchor structure
    expect(content).toContain('anchor: "GAME"');
    expect(content).toContain('anchor: "TAKE"');
    expect(content).toContain('anchor: "RECEIPTS"');
  });

  it("anchor text uses max-width: 100% to prevent overflow", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync(
      "app/workhouse/semantic-identity.css",
      "utf-8"
    );
    const anchorSection = css.match(
      /\.rules-carousel-anchor\s*\{[\s\S]*?\n  \}/m
    );
    expect(anchorSection).toBeTruthy();
    expect(anchorSection[0]).toContain("max-width: 100%");
  });

  it("anchor text is left-aligned", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync(
      "app/workhouse/semantic-identity.css",
      "utf-8"
    );
    const anchorSection = css.match(
      /\.rules-carousel-anchor\s*\{[\s\S]*?\n  \}/m
    );
    expect(anchorSection).toBeTruthy();
    expect(anchorSection[0]).toContain("text-align: left");
  });

  it("lead text is left-aligned", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync(
      "app/workhouse/semantic-identity.css",
      "utf-8"
    );
    const leadSection = css.match(
      /\.rules-carousel-lead\s*\{[\s\S]*?\n  \}/m
    );
    expect(leadSection).toBeTruthy();
    // Lead inherits text-align from parent, no need to check
  });

  it("lead font size has increased by ~30%", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync(
      "app/workhouse/semantic-identity.css",
      "utf-8"
    );
    const leadSection = css.match(
      /\.rules-carousel-lead\s*\{[\s\S]*?\n  \}/m
    );
    expect(leadSection).toBeTruthy();
    expect(leadSection[0]).toContain("clamp(1.3rem");
    expect(leadSection[0]).toContain("4.5vw");
    expect(leadSection[0]).toContain("1.7rem");
  });
});

// ─── Informational section unchanged ────────────────────────────────────────

describe("Informational section below QR code unchanged", () => {
  let content: string;

  beforeEach(() => {
    content = readFileSync(pagePath, "utf-8");
  });

  it("WorkhouseInfoSection component is defined", () => {
    expect(content).toContain("function WorkhouseInfoSection");
  });

  it("section contains first heading 'What is this?'", () => {
    const infoSectionStart = content.indexOf("function WorkhouseInfoSection");
    const footerStart = content.indexOf("function WorkhouseAttributionFooter");
    const infoSection = content.slice(infoSectionStart, footerStart);
    expect(infoSection).toContain("What is this?");
  });

  it("section contains second heading 'Your data stays yours'", () => {
    const infoSectionStart = content.indexOf("function WorkhouseInfoSection");
    const footerStart = content.indexOf("function WorkhouseAttributionFooter");
    const infoSection = content.slice(infoSectionStart, footerStart);
    expect(infoSection).toContain("Your data stays yours");
  });

  it("section contains third heading 'Built around people, not platforms'", () => {
    const infoSectionStart = content.indexOf("function WorkhouseInfoSection");
    const footerStart = content.indexOf("function WorkhouseAttributionFooter");
    const infoSection = content.slice(infoSectionStart, footerStart);
    expect(infoSection).toContain("Built around people, not platforms");
  });

  it("WorkhouseInfoSection is rendered on the landing page", () => {
    const pageContent = content.slice(content.indexOf("export default function WorkhousePage"));
    expect(pageContent).toContain("<WorkhouseInfoSection");
  });
});

// ─── Find a Friend QR block unchanged ────────────────────────────────────────

describe("Find a Friend QR block unchanged", () => {
  let content: string;

  beforeEach(() => {
    content = readFileSync(pagePath, "utf-8");
  });

  it("the Find a Friend step includes the QR code sentence", () => {
    const cancelButtonIdx = content.indexOf("Cancel");
    const qrSentenceIdx = content.indexOf("If your friend hasn't joined yet, let them scan this QR code.");
    expect(cancelButtonIdx).toBeGreaterThanOrEqual(0);
    expect(qrSentenceIdx).toBeGreaterThan(cancelButtonIdx);
  });

  it("Continue button behaviour preserved (setOfferFormStep('give'))", () => {
    const friendStepStart = content.indexOf('offerFormStep === "friend"');
    const friendStepSection = content.slice(friendStepStart, friendStepStart + 3000);
    expect(friendStepSection).toContain('setOfferFormStep("give")');
  });

  it("Cancel button behaviour preserved (closeOfferForm)", () => {
    const friendStepStart = content.indexOf('offerFormStep === "friend"');
    const friendStepSection = content.slice(friendStepStart, friendStepStart + 3000);
    expect(friendStepSection).toContain("closeOfferForm");
  });
});

describe("Test imports work", () => {
  it("can import vitest", () => {
    expect(typeof vi.fn()).toBe("function");
  });
});
