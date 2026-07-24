/**
 * Regression tests for MenuPanel (Information and Support drawer).
 * Tests drawer title, introductory sentence, button styling, and handlers.
 *
 * Run with: npm test MenuPanel
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("MenuPanel drawer changes", () => {
  const menuPanelPath = join(
    process.cwd(),
    "app/workhouse/components/MenuPanel.tsx"
  );
  const workhouseDrawersPath = join(
    process.cwd(),
    "app/workhouse/components/WorkhouseDrawers.tsx"
  );
const accessibilityControlsPath = join(
  process.cwd(),
  "app/workhouse/components/AccessibilityControls.tsx"
);
const workhouseHeaderPath = join(
  process.cwd(),
  "app/workhouse/components/WorkhouseHeader.tsx"
);
  const rootLayoutPath = join(process.cwd(), "app/layout.tsx");

  describe("1. Drawer title is 'Information and Support'", () => {
    it("WorkhouseDrawers.tsx contains 'Information and Support' title", () => {
      const content = readFileSync(workhouseDrawersPath, "utf-8");
      expect(content).toContain('title="Information and Support"');
    });

    it("WorkhouseDrawers.tsx does not contain old 'Menu' title", () => {
      const content = readFileSync(workhouseDrawersPath, "utf-8");
      // The MenuDrawer should no longer have title="Menu"
      expect(content).not.toContain('title="Menu"');
    });
  });

  describe("2. New introductory sentence renders", () => {
    it("MENU_INTRO contains new sentence", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain(
        "Manage your participation, access support, and choose how to leave or preserve your experience."
      );
    });

    it("old MENU_INTRO is removed", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).not.toContain("Help if you need it.");
    });
  });

  describe("2b. Guide section is removed", () => {
    it("MenuPanel does not render a Guide heading", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).not.toContain("Guide");
    });

    it("MenuDocAccordion is no longer defined", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).not.toContain("MenuDocAccordion");
    });

    it("MENU_DOCUMENTATION is no longer defined", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).not.toContain("MENU_DOCUMENTATION");
    });

    it("MENU_DOCUMENTATION_SECTIONS is no longer defined", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).not.toContain("MENU_DOCUMENTATION_SECTIONS");
    });

    it("the spacer between Actions and Help is removed", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).not.toContain('className="my-6"');
      expect(content).not.toContain('aria-hidden="true"');
    });
  });

  describe("3. Actions buttons use correct Skeleton styling", () => {
    it("Export My Story uses success styling (preserves and exports experience)", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      // Find Export My Story button and verify it uses success preset
      const exportButtonMatch = content.match(/<button[\s\S]*?Export My Story[\s\S]*?<\/button>/);
      expect(exportButtonMatch).toBeTruthy();
      expect(exportButtonMatch[0]).toContain("preset-filled-success-500");
    });

    it("Leave Session uses warning styling (consequential but not destructive)", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      // Find Leave Session button and verify it uses warning preset
      const leaveButtonMatch = content.match(/<button[\s\S]*?Leave Session[\s\S]*?<\/button>/);
      expect(leaveButtonMatch).toBeTruthy();
      expect(leaveButtonMatch[0]).toContain("preset-filled-warning-500");
    });

    it("Destroy Character uses error styling (strongest destructive treatment)", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      // Find Destroy Character button and verify it uses error preset
      const destroyButtonMatch = content.match(/<button[\s\S]*?Destroy Character[\s\S]*?<\/button>/);
      expect(destroyButtonMatch).toBeTruthy();
      expect(destroyButtonMatch[0]).toContain("preset-filled-error-500");
    });
  });

  describe("3b. Display controls", () => {
    it("renders the colour-mode control as the first app-bar icon", () => {
      const content = readFileSync(workhouseHeaderPath, "utf-8");
      const toggleIndex = content.indexOf("<ColorModeToggle");
      const trailIndex = content.indexOf("<AppBar.Trail");
      const balanceIndex = content.indexOf("{onBalanceClick ?", trailIndex);

      expect(toggleIndex).toBeGreaterThan(trailIndex);
      expect(balanceIndex).toBeGreaterThan(toggleIndex);
    });

    it("provides a persistent light and dark mode control", () => {
      const content = readFileSync(accessibilityControlsPath, "utf-8");

      expect(content).toContain("COLOR_MODE_STORAGE_KEY");
      expect(content).toContain('document.documentElement.classList.toggle("dark"');
      expect(content).toContain('aria-pressed={isDark}');
      expect(content).toContain("Switch to");
    });

    it("does not provide dynamic text scaling", () => {
      const content = readFileSync(accessibilityControlsPath, "utf-8");

      expect(content).not.toContain('type="range"');
      expect(content).not.toContain("TEXT_SCALE_STORAGE_KEY");
      expect(content).not.toContain("MIN_TEXT_SCALE");
      expect(content).not.toContain("MAX_TEXT_SCALE");
    });

    it("initializes saved colour mode before the page is displayed", () => {
      const content = readFileSync(rootLayoutPath, "utf-8");

      expect(content).toContain("accessibilityPreferencesScript");
      expect(content).toContain("inqbeta-color-mode");
      expect(content).not.toContain("Number(localStorage.getItem('inqbeta-text-scale'))");
      expect(content).not.toContain("style.setProperty('--user-font-scale'");
      expect(content).toContain("suppressHydrationWarning");
    });
  });

  describe("4. Help buttons use matching outlined styling", () => {
    it("Stay in Touch uses a primary outline", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      const stayButtonMatch = content.match(/<button[\s\S]*?Stay in Touch[\s\S]*?<\/button>/);
      expect(stayButtonMatch).toBeTruthy();
      expect(stayButtonMatch[0]).toContain("border-primary-600");
      expect(stayButtonMatch[0]).toContain("btn-xl");
    });

    it("Report an Issue uses the same primary outline", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      const reportButtonMatch = content.match(/<button\s*\n\s*type="button"\s*\n\s*onClick=\{onReportIssue\}[\s\S]*?<\/button>/);
      expect(reportButtonMatch).toBeTruthy();
      expect(reportButtonMatch[0]).toContain("border-primary-600");
      expect(reportButtonMatch[0]).toContain("btn-xl");
    });

    it("Review This Experience uses the same primary outline", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      const reviewButtonMatch = content.match(/<button[\s\S]*?Review This Experience[\s\S]*?<\/button>/);
      expect(reviewButtonMatch).toBeTruthy();
      expect(reviewButtonMatch[0]).toContain("border-primary-600");
      expect(reviewButtonMatch[0]).toContain("btn-xl");
    });
  });

  describe("5. All button handlers preserved", () => {
    it("onLeaveSession prop exists", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("onLeaveSession:");
    });

    it("onResetIdentity prop exists", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("onResetIdentity:");
    });

    it("onExportStory prop exists", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("onExportStory:");
    });

    it("onStayInTouch prop exists", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("onStayInTouch:");
    });

    it("onReportIssue prop exists", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("onReportIssue:");
    });

    it("onReviewExperience prop exists", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("onReviewExperience:");
    });
  });

  describe("6. Community Participation unchanged", () => {
    it("CommunityParticipationPanel still rendered", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("CommunityParticipationPanel");
    });

    it("Community Participation section intact", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("federationParticipationAudit");
    });
  });

  describe("7. Button text uses title case", () => {
    it("Leave Session has title case", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("Leave Session");
    });

    it("Destroy Character has title case", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("Destroy Character");
    });

    it("Export My Story has title case", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("Export My Story");
    });

    it("Stay in Touch has title case", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("Stay in Touch");
    });

    it("Report an Issue has title case", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("Report an Issue");
    });

    it("Review This Experience has title case", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("Review This Experience");
    });
  });
});

describe("Test imports work", () => {
  it("can import vitest", () => {
    expect(typeof vi.fn()).toBe("function");
  });
});

describe("8. Action button order is Export My Story, Leave Session, Destroy Character", () => {
  const menuPanelPath = join(process.cwd(), "app/workhouse/components/MenuPanel.tsx");

  it("Actions section renders buttons in correct order", () => {
    const content = readFileSync(menuPanelPath, "utf-8");
    // Find the Actions section
    const actionsSectionMatch = content.match(/<section className="space-y-3">[\s\S]*?<p className="text-base font-semibold">Actions<\/p>[\s\S]*?<div className="grid gap-3">([\s\S]*?)<\/div>/);
    expect(actionsSectionMatch).toBeTruthy();
    const actionsDiv = actionsSectionMatch[1];

    // Check order: Export My Story should come before Leave Session, which should come before Destroy Character
    const exportMyStoryIdx = actionsDiv.indexOf("Export My Story");
    const leaveSessionIdx = actionsDiv.indexOf("Leave Session");
    const destroyCharacterIdx = actionsDiv.indexOf("Destroy Character");

    expect(exportMyStoryIdx).toBeGreaterThanOrEqual(0);
    expect(leaveSessionIdx).toBeGreaterThanOrEqual(0);
    expect(destroyCharacterIdx).toBeGreaterThanOrEqual(0);

    expect(exportMyStoryIdx).toBeLessThan(leaveSessionIdx);
    expect(leaveSessionIdx).toBeLessThan(destroyCharacterIdx);
  });

  it("Export My Story button has onClick handler preserved", () => {
    const content = readFileSync(menuPanelPath, "utf-8");
    // Find Export My Story button and verify it has onClick={onExportStory}
    const exportButtonMatch = content.match(/<button[\s\S]*?Export My Story[\s\S]*?<\/button>/);
    expect(exportButtonMatch).toBeTruthy();
    expect(exportButtonMatch[0]).toContain("onClick={onExportStory}");
  });

  it("Leave Session button has onClick handler preserved", () => {
    const content = readFileSync(menuPanelPath, "utf-8");
    const leaveButtonMatch = content.match(/<button[\s\S]*?Leave Session[\s\S]*?<\/button>/);
    expect(leaveButtonMatch).toBeTruthy();
    expect(leaveButtonMatch[0]).toContain("onClick={onLeaveSession}");
  });

  it("Destroy Character button has onClick handler preserved", () => {
    const content = readFileSync(menuPanelPath, "utf-8");
    const destroyButtonMatch = content.match(/<button[\s\S]*?Destroy Character[\s\S]*?<\/button>/);
    expect(destroyButtonMatch).toBeTruthy();
    expect(destroyButtonMatch[0]).toContain("onClick={onResetIdentity}");
  });
});
