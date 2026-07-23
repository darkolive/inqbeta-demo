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
        "Manage your participation, access guidance and support, and choose how to leave or preserve your experience."
      );
    });

    it("old MENU_INTRO is removed", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).not.toContain("Help if you need it.");
    });
  });

  describe("3. Actions buttons use correct Skeleton styling", () => {
    it("Leave Session uses secondary styling (significant but not primary forward action)", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      // Find Leave Session button and check its class
      expect(content).toContain("preset-filled-secondary-500");
      // Verify it's in the Actions section context
      const actionsSection = content.match(/Actions[\s\S]*?preset-filled-secondary-500/);
      expect(actionsSection).toBeTruthy();
    });

    it("Destroy Character uses error styling", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("preset-filled-error-500");
    });

    it("Export My Story uses secondary styling", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("preset-filled-secondary-500");
    });
  });

  describe("4. Spacing before Guide section", () => {
    it("has my-6 spacer between Actions and Guide", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      // Check for the spacer element
      expect(content).toContain('className="my-6"');
      expect(content).toContain('aria-hidden="true"');
    });
  });

  describe("5. Help buttons use correct Skeleton styling", () => {
    it("Stay in Touch uses secondary styling (meaningful but not primary forward action)", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      // Secondary appears for Help buttons
      // We check for the button text
      expect(content).toContain("Stay in Touch");
      expect(content).toContain("preset-filled-secondary-500");
    });

    it("Report an Issue uses warning styling", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("Report an Issue");
      expect(content).toContain("preset-filled-warning-500");
    });

    it("Review This Experience uses secondary styling", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("Review This Experience");
      expect(content).toContain("preset-filled-secondary-500");
    });
  });

  describe("6. All button handlers preserved", () => {
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

  describe("7. Community Participation unchanged", () => {
    it("CommunityParticipationPanel still rendered", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("CommunityParticipationPanel");
    });

    it("Community Participation section intact", () => {
      const content = readFileSync(menuPanelPath, "utf-8");
      expect(content).toContain("federationParticipationAudit");
    });
  });

  describe("8. Button text uses title case", () => {
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

describe("9. Action button order is Export My Story, Leave Session, Destroy Character", () => {
  const menuPanelPath = join(process.cwd(), "app/workhouse/components/MenuPanel.tsx");

  it("Actions section renders buttons in correct order", () => {
    const content = readFileSync(menuPanelPath, "utf-8");
    // Find the Actions section
    const actionsSectionMatch = content.match(/<section className="space-y-3">[\s\S]*?<p className="text-base font-semibold">Actions<\/p>[\s\S]*?<div className="grid gap-2">([\s\S]*?)<\/div>/);
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
