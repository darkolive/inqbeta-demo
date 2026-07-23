"use client";

import type { ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { CommunityParticipationPanel } from "./CommunityInterestCharts";
import type { AuditEntry } from "../lib/types";

export const MENU_INTRO =
  "Manage your participation, access guidance and support, and choose how to leave or preserve your experience.";

export const MENU_DOCUMENTATION_SECTIONS = [
  "About this demonstrator",
  "How to play",
  "What you're seeing",
] as const;

type MenuDocSection = {
  title: (typeof MENU_DOCUMENTATION_SECTIONS)[number];
  content: ReactNode;
};

const MENU_DOCUMENTATION: MenuDocSection[] = [
  {
    title: "About this demonstrator",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>A phone demo for the festival — not real money.</p>
        <p>
          You get 5 demo credits when you join. Your story stays on this
          device.
        </p>
      </div>
    ),
  },
  {
    title: "How to play",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>Choose a name and enter the game.</p>
        <p>
          Tap <span className="font-semibold">Find a friend</span> to make an
          offer.
        </p>
        <p>When someone offers to you, accept, reject, or counteroffer.</p>
        <p className="font-semibold">Free to give. Never free to take.</p>
      </div>
    ),
  },
  {
    title: "What you're seeing",
    content: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>
          <span className="font-semibold">Activity</span> — your timeline.
        </p>
        <p>
          <span className="font-semibold">Globe</span> — what&apos;s happening
          at the festival.
        </p>
        <p>
          <span className="font-semibold">Receipts</span> — proof something
          happened. Tap the search icon on any line.
        </p>
      </div>
    ),
  },
];

function MenuDocAccordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-b border-surface-300-700 py-1 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2.5 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon
          className="size-4 shrink-0 opacity-50 group-open:hidden"
          aria-hidden
        />
        <ChevronDownIcon
          className="hidden size-4 shrink-0 opacity-50 group-open:block"
          aria-hidden
        />
        <span>{title}</span>
      </summary>
      <div className="pb-3 pl-6">{children}</div>
    </details>
  );
}

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
            className="btn preset-filled-success-500 w-full"
          >
            {exportBusy ? "Generating PDF…" : "Export My Story"}
          </button>
          <button
            type="button"
            onClick={onLeaveSession}
            className="btn preset-filled-warning-500 w-full"
          >
            Leave Session
          </button>
          <button
            type="button"
            onClick={onResetIdentity}
            className="btn preset-filled-error-500 w-full"
          >
            Destroy Character
          </button>
        </div>
      </section>

      <div className="my-6" aria-hidden="true" />

      <section className="space-y-3">
        <p className="text-base font-semibold">Guide</p>
        <div>
          {MENU_DOCUMENTATION.map(({ title, content }) => (
            <MenuDocAccordion key={title} title={title}>
              {content}
            </MenuDocAccordion>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-base font-semibold">Help</p>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={onStayInTouch}
            className="btn preset-tonal-primary w-full"
          >
            Stay in Touch
          </button>
          <button
            type="button"
            onClick={onReportIssue}
            className="btn preset-tonal-tertiary w-full"
          >
            Report an Issue
          </button>
          <button
            type="button"
            onClick={onReviewExperience}
            className="btn preset-tonal-secondary w-full"
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
