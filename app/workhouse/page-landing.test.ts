/**
 * Regression tests for the Workhouse landing page (RulesOfTheGameDeck).
 * Verifies the first-time participant experience changes:
 *   1. "Rules of the Game" heading is removed
 *   2. QR code renders with correct asset path
 *   3. QR caption renders
 *   4. Previous/Next buttons use outlined Skeleton style
 *   5. Carousel behaviour preserved (goPrev/goNext exist, progress label present)
 *
 * Run with: npm test page-landing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("@skeletonlabs/skeleton-react", () => ({
  Pagination: vi.fn(() => null),
}));

const pagePath = join(process.cwd(), "app/workhouse/page.tsx");

describe("Landing page — first-time participant experience", () => {
  let content: string;

  beforeEach(() => {
    content = readFileSync(pagePath, "utf-8");
  });

  // ─── 1. "Rules of the Game" heading removed ─────────────────────────────────

  describe("1. 'Rules of the Game' heading no longer renders", () => {
    it("the text 'Rules of the game' does not appear inside RulesOfTheGameDeck", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toContain("Rules of the game");
    });

    it("RULES_SECTION_TITLE_CLASS is no longer used for the carousel heading", () => {
      // The heading div should use justify-end, not justify-between + title text
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      // Should not have the old heading row pattern
      expect(deckBody).not.toContain("flex items-center justify-between");
      expect(deckBody).not.toContain('>Rules of the game<');
    });

    it("progress label still renders in the carousel area", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("progressLabel");
      expect(deckBody).toContain("safeIndex + 1");
    });
  });

  // ─── 2. QR code image renders ───────────────────────────────────────────────

  describe("2. QR image renders using /images/qr-code.png", () => {
    it("an <img> tag references /images/qr-code.png inside RulesOfTheGameDeck", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain('src="/images/qr-code.png"');
    });

    it("the QR img has a descriptive alt attribute", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("alt=");
      expect(deckBody).toMatch(/alt="[^"]*join[^"]*experience[^"]*"/i);
    });

    it("the QR img is responsive (has a width class)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain('w-[180px]');
    });

    it("the QR image is below the Enter/START GAME button in source order", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      const startGameIdx = deckBody.indexOf("START GAME");
      const qrIdx = deckBody.indexOf('src="/images/qr-code.png"');
      expect(qrIdx).toBeGreaterThan(startGameIdx);
    });
  });

  // ─── 3. Caption renders ─────────────────────────────────────────────────────

  describe("3. Caption renders beneath the QR code", () => {
    it("the caption text is present", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain(
        "Scan to join this shared experience on another device."
      );
    });

    it("the caption uses understated typography (text-xs, opacity-60)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("text-xs");
      expect(deckBody).toContain("opacity-60");
    });

    it("the caption is centred below the QR image", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      // caption lives in a flex-col items-center wrapper
      expect(deckBody).toContain("flex flex-col items-center");
    });
  });

  // ─── 4. Previous and Next buttons still work ─────────────────────────────────

  describe("4. Previous and Next buttons still work", () => {
    it("goPrev function is defined and used on the Previous button", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("goPrev");
      // Previous button must have onClick={goPrev}
      expect(deckBody).toContain("onClick={goPrev}");
    });

    it("goNext function is defined and used on the Next button", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("goNext");
      // Next button must have onClick={goNext}
      expect(deckBody).toContain("onClick={goNext}");
    });

    it("Previous button is disabled when at first card (atFirst)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("disabled={atFirst}");
    });

    it("Next button is disabled when at last card (atLast)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("disabled={atLast}");
    });

    it("both buttons have aria-label for accessibility", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain('aria-label="Previous card"');
      expect(deckBody).toContain('aria-label="Next card"');
    });

    it("Previous button includes ChevronLeftIcon", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("ChevronLeftIcon");
    });

    it("Next button includes ChevronRightIcon", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("ChevronRightIcon");
    });

    it("both buttons use outlined Skeleton style (preset-outlined-surface-200-800)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("preset-outlined-surface-200-800");
    });
  });

  // ─── 5. Carousel behaviour unchanged ───────────────────────────────────────

  describe("5. Carousel behaviour is unchanged", () => {
    it("RULES_OF_THE_GAME_CARDS array is intact", () => {
      expect(content).toContain("const RULES_OF_THE_GAME_CARDS");
      expect(content).toContain('id: "game"');
      expect(content).toContain('id: "yes"');
      expect(content).toContain('id: "receipt"');
    });

    it("RulesCardStatement is used to render card text", () => {
      expect(content).toContain("RulesCardStatement");
    });

    it("drag/pointer handlers are preserved", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("onPointerDown");
      expect(deckBody).toContain("onPointerMove");
      expect(deckBody).toContain("onPointerUp");
      expect(deckBody).toContain("onPointerCancel");
    });

    it("the START GAME / Enter button is present", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("START GAME");
      expect(deckBody).toContain("onClick={onDone}");
    });

    it("the carousel role and aria-label are preserved", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain('role="group"');
      expect(deckBody).toContain('aria-label="Rules cards"');
    });

    it("touch-pan-y class is preserved for drag interaction", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("touch-pan-y");
    });

    it("progress label format is preserved: N / total", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("${safeIndex + 1} / ${cards.length}");
    });

    it("card peek (next card preview) is preserved", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("next ?");
      expect(deckBody).toContain("opacity-50");
    });
  });

  // ─── 6. Layout / spacing ────────────────────────────────────────────────────

  describe("6. Spacing is comfortable and uncluttered", () => {
    it("QR section has mt-8 top margin for breathing room from Enter button", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      // The wrapper div after START GAME has mt-8
      expect(deckBody).toContain('className="mt-8 flex flex-col items-center gap-3 pb-8"');
    });

    it("caption has gap-3 between QR and caption", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("gap-3");
    });

    it("Enter button no longer has mb-12 (space freed for QR section)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      // The Enter button should NOT have mb-12
      expect(deckBody).not.toContain("mb-12");
    });
  });
});

describe("Test imports work", () => {
  it("can import vitest", () => {
    expect(typeof vi.fn()).toBe("function");
  });
});
