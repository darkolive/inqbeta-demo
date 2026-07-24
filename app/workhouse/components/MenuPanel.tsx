"use client";

import { CommunityParticipationPanel } from "./CommunityInterestCharts";
import type { AuditEntry } from "../lib/types";

export const MENU_INTRO =
  "Manage your participation, access support, and choose how to leave or preserve your experience.";

export function MenuPanel({
  exportBusy,
  canExport,
  communityParticipationAudit,
  onLeaveSession,
  onResetIdentity,
  onExportStory,
  onStayInTouch,
  onReportIssue,
  onReviewExperience,
}: {
  exportBusy: boolean;
  canExport: boolean;
  communityParticipationAudit: AuditEntry[];
  onLeaveSession: () => void;
  onResetIdentity: () => void;
  onExportStory: () => void;
  onStayInTouch: () => void;
  onReportIssue: () => void;
  onReviewExperience: () => void;
}) {
  return (
    <div className="mb-12 grid gap-6">
      <p className="text-sm leading-relaxed opacity-90">{MENU_INTRO}</p>

      <section className="space-y-3">
        <p className="text-base font-semibold">Actions</p>
        <div className="grid gap-2">
          <button
            type="button"
            disabled={exportBusy || !canExport}
            onClick={onExportStory}
            className="btn btn-lg preset-filled-success-500 w-full"
          >
            {exportBusy ? "Generating PDF…" : "Export My Story"}
          </button>
          <button
            type="button"
            onClick={onLeaveSession}
            className="btn btn-lg preset-filled-warning-500 w-full"
          >
            Leave Session
          </button>
          <button
            type="button"
            onClick={onResetIdentity}
            className="btn btn-lg preset-filled-error-500 w-full"
          >
            Destroy Character
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-base font-semibold">Help</p>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={onStayInTouch}
            className="btn btn-lg preset-tonal-primary w-full"
          >
            Stay in Touch
          </button>
          <button
            type="button"
            onClick={onReportIssue}
            className="btn btn-lg preset-tonal-tertiary w-full"
          >
            Report an Issue
          </button>
          <button
            type="button"
            onClick={onReviewExperience}
            className="btn btn-lg preset-tonal-secondary w-full"
          >
            Review This Experience
          </button>
        </div>
      </section>

      <CommunityParticipationPanel
        federationParticipationAudit={communityParticipationAudit}
      />
    </div>
  );
}
