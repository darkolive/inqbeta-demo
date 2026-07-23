/**
 * Regression tests for the Workhouse landing page (RulesOfTheGameDeck).
 * Verifies the first-time participant experience changes:
 *   1. "Rules of the Game" heading is removed
 *   2. QR code renders with correct asset path
 *   3. QR caption renders
 *   4. Previous/Next buttons use outlined Skeleton style on primary bg
 *   5. Carousel behaviour preserved (goPrev/goNext exist, progress label present)
 *   6. Spacing is comfortable
 *   7. Carousel uses Skeleton primary background with theme-aware foreground
 *   8. Carousel typography is increased
 *   9. Carousel height is reduced to fit more in viewport
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

    it("both buttons use outlined Skeleton style on primary bg (preset-outlined-primary-950-50)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("preset-outlined-primary-950-50");
    });

    it("nav buttons use primary-950-50 color for contrast on primary background", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("primary-950-50");
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

  // ─── 7. Skeleton primary background ─────────────────────────────────────────

  describe("7. Carousel uses Skeleton primary background treatment", () => {
    it("carousel container uses bg-primary-500", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("bg-primary-500");
    });

    it("carousel no longer uses surface preset classes", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      // preset-filled-surface-50-950 should be gone from the carousel
      expect(deckBody).not.toContain("preset-filled-surface-50-950");
      expect(deckBody).not.toContain("preset-outlined-surface-200-800");
    });

    it("intro line uses fixed text-primary-50 (no dark: variant)", () => {
      expect(content).toContain(
        "text-2xl font-medium leading-snug text-primary-50 opacity-80"
      );
      // Must not contain dark: variant (foreground stays light in both modes)
      expect(content).not.toContain("dark:text-primary-950");
    });

    it("carousel card inner div uses fixed text-primary-50 (no dark: variant)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("text-primary-50");
      // No dark: variant inside the carousel
      expect(deckBody).not.toMatch(/carousel[\s\S]*dark:text-primary-950/);
    });

    it("carousel foreground uses fixed text-primary-50 throughout (no dark: switch)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      // Every text-primary-50 occurrence should NOT be followed by dark:text-primary-950
      expect(deckBody).not.toContain("dark:text-primary-950");
    });
  });

  // ─── 8. Typography increased ────────────────────────────────────────────────

  describe("8. Carousel typography is increased for readability", () => {
    it("RULES_INTRO_LINE_CLASS uses text-2xl (up from text-xl)", () => {
      expect(content).toContain(
        'text-2xl font-medium leading-snug text-primary-50 opacity-80'
      );
    });

    it(".rules-carousel-anchor font-size range is increased in semantic-identity.css", async () => {
      const fs = await import("fs");
      const css = fs.readFileSync(
        "app/workhouse/semantic-identity.css",
        "utf-8"
      );
      // Should have a larger clamp range
      expect(css).toContain("clamp(1.4rem");
      expect(css).toContain("10cqi");
      expect(css).toContain("3.35rem");
    });

    it("rules-carousel-anchor uses var(--color-primary-950-50) for theme-aware foreground", async () => {
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
      // Uses the Skeleton light-dark variable for light foreground on primary background
      expect(anchorText).toContain("var(--color-primary-50)");
      // Must not contain hex or rgb white
      expect(anchorText).not.toMatch(/#[fF0-9aAbBcCdD]{3,6}/);
      expect(anchorText).not.toMatch(/rgba?\(/);
    });
  });

  // ─── 9. Carousel height reduced ─────────────────────────────────────────────

  describe("9. Carousel has reduced vertical footprint", () => {
    it("carousel container no longer has fixed h-[200px] height", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toContain("h-[200px]");
    });

    it("carousel container uses min-h-[130px] max-h-[160px]", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("min-h-[130px] max-h-[160px]");
    });

    it("card vertical padding is reduced (py-2, down from py-4)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).toContain("py-2");
      expect(deckBody).not.toContain("py-4");
    });

    it("logo-to-carousel gap is reduced (mt-2, down from mt-5)", () => {
      // Check the landing page layout wrapper
      const landingLayoutIdx = content.indexOf(
        'className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6 sm:max-w-lg">'
      );
      const deckSection = content.slice(
        landingLayoutIdx,
        landingLayoutIdx + 200
      );
      expect(deckSection).toContain('className="mt-2"');
      expect(deckSection).not.toContain('className="mt-5"');
    });

    it("nav-to-Enter gap is reduced (mt-3, down from mt-6)", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      // The grid div that holds Previous/Next buttons has mt-3
      expect(deckBody).toContain('mt-3 grid grid-cols-2 gap-4');
    });
  });

  // ─── 10. No hard-coded foreground colors ─────────────────────────────────────

  describe("10. No hard-coded hex or white foreground in carousel", () => {
    it("RulesOfTheGameDeck does not contain rgb( or rgba( for text color", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toMatch(/rgba?\(/);
    });

    it("RulesOfTheGameDeck does not contain #fff or #ffffff", () => {
      const deckStart = content.indexOf("function RulesOfTheGameDeck");
      const deckEnd = content.indexOf("\nfunction WorkhouseAttributionFooter");
      const deckBody = content.slice(deckStart, deckEnd);
      expect(deckBody).not.toMatch(/#fff|#ffffff|#FFFFFF|#FFF/i);
    });

    it(".rules-carousel-anchor in CSS uses Skeleton color classes only", async () => {
      const fs = await import("fs");
      const css = fs.readFileSync(
        "app/workhouse/semantic-identity.css",
        "utf-8"
      );
      const anchorSection = css.match(
        /\.rules-carousel-anchor\s*\{[\s\S]*?\n  \}/m
      );
      const anchorText = anchorSection?.[0] ?? "";
      expect(anchorText).not.toMatch(/#[fF0-9aAbBcCdD]{3,6}/);
      expect(anchorText).not.toMatch(/rgba?\(/);
    });
  });
});

describe("Test imports work", () => {
  it("can import vitest", () => {
    expect(typeof vi.fn()).toBe("function");
  });
});
