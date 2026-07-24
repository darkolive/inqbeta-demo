import type { FederationWindow } from "./federation-runtime";

const DEMO_NOW_ENV = "NEXT_PUBLIC_WORKHOUSE_DEMO_NOW";

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export type FederationWindowPhase = "before" | "running" | "after";

export type FederationTimingMode =
  | "unpublished"
  | "before_start"
  | "live_bounded"
  | "live_open_ended"
  | "closed";

export type FederationMarkerTone = "inactive" | "live" | "near_end" | "closed";

export type FederationWindowProgressSnapshot = {
  federationStartedAt: string;
  federationEndsAt: string;
  /** Elapsed share of the federation window (0 = before start, 1 = after end). */
  progress: number;
  phase: FederationWindowPhase;
  timingMode: FederationTimingMode;
  markerTone: FederationMarkerTone;
  qualitative: string;
  valid: boolean;
};

let demoNowMsOverride: number | null = null;

/** @internal Test-only override for simulated clock. */
export function setDemoNowMsForTests(value: number | null): void {
  demoNowMsOverride = value;
}

/** Resolves the current time, honouring demo overrides when configured. */
export function resolveWorkhouseNowMs(): number {
  if (demoNowMsOverride !== null) {
    return demoNowMsOverride;
  }
  const fromEnv = process.env[DEMO_NOW_ENV]?.trim();
  if (fromEnv) {
    const parsed = Date.parse(fromEnv);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Date.now();
}

export function resolveFederationMarkerTone(
  timingMode: FederationTimingMode,
  progress: number,
): FederationMarkerTone {
  if (timingMode === "unpublished" || timingMode === "before_start") {
    return "inactive";
  }
  if (timingMode === "closed") {
    return "closed";
  }
  if (timingMode === "live_open_ended") {
    return "live";
  }
  if (progress >= 0.9) {
    return "near_end";
  }
  return "live";
}

/** Number of marker segments filled to represent time remaining (not elapsed). */
export function federationMarkerFilledSegmentCount(
  snapshot: FederationWindowProgressSnapshot,
  segments: number,
): number {
  const n = Math.max(1, segments);
  switch (snapshot.timingMode) {
    case "unpublished":
    case "before_start":
      return 0;
    case "closed":
      return n;
    case "live_open_ended":
      return n;
    default:
      return Math.round((1 - snapshot.progress) * n);
  }
}

/** Tailwind segment classes for the federation progress marker. */
export function federationMarkerSegmentClass(
  tone: FederationMarkerTone,
  filled: boolean,
): string {
  switch (tone) {
    case "inactive":
      return "bg-surface-300-700/40";
    case "live":
      return filled
        ? "bg-primary-500 dark:bg-primary-300"
        : "bg-surface-300-700/45";
    case "near_end":
      return filled
        ? "bg-primary-500 dark:bg-primary-300"
        : "bg-surface-300-700/55";
    case "closed":
      return filled ? "bg-surface-400-600/75" : "bg-surface-300-700/35";
  }
}

export function computeFederationWindowProgress(
  window: FederationWindow,
  nowMs: number,
): FederationWindowProgressSnapshot {
  const base = {
    federationStartedAt: window.federationStartedAt,
    federationEndsAt: window.federationEndsAt,
  };

  if (!window.published) {
    return {
      ...base,
      progress: 0,
      phase: "before",
      timingMode: "unpublished",
      markerTone: "inactive",
      qualitative: "Not yet published",
      valid: true,
    };
  }

  const startMs = Date.parse(window.federationStartedAt);

  if (window.openEnded) {
    const validStart = Number.isFinite(startMs);
    if (!validStart) {
      return {
        ...base,
        progress: 0,
        phase: "after",
        timingMode: "unpublished",
        markerTone: "inactive",
        qualitative: "Event closed",
        valid: false,
      };
    }

    if (nowMs < startMs) {
      return {
        ...base,
        progress: 0,
        phase: "before",
        timingMode: "before_start",
        markerTone: "inactive",
        qualitative: "Not started yet",
        valid: true,
      };
    }

    return {
      ...base,
      progress: 1,
      phase: "running",
      timingMode: "live_open_ended",
      markerTone: "live",
      qualitative: "Live — no scheduled end",
      valid: true,
    };
  }

  const endMs = Date.parse(window.federationEndsAt);
  const valid =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;

  if (!valid) {
    return {
      ...base,
      progress: 0,
      phase: "after",
      timingMode: "closed",
      markerTone: "closed",
      qualitative: "Event closed",
      valid: false,
    };
  }

  if (nowMs < startMs) {
    return {
      ...base,
      progress: 0,
      phase: "before",
      timingMode: "before_start",
      markerTone: "inactive",
      qualitative: "Not started yet",
      valid: true,
    };
  }

  if (nowMs >= endMs) {
    return {
      ...base,
      progress: 1,
      phase: "after",
      timingMode: "closed",
      markerTone: "closed",
      qualitative: "Event closed",
      valid: true,
    };
  }

  const progress = clamp01((endMs - nowMs) / (endMs - startMs));
  const timingMode: FederationTimingMode = "live_bounded";
  const qualitative =
    progress < 0.33
      ? "Early in the event"
      : progress < 0.66
        ? "Mid event"
        : progress < 0.9
          ? "Nearly finished"
          : "Final stretch";

  return {
    ...base,
    progress,
    phase: "running",
    timingMode,
    markerTone: resolveFederationMarkerTone(timingMode, progress),
    qualitative,
    valid: true,
  };
}

/** @deprecated Prefer computeFederationWindowProgress. */
export function computeGameRemaining(
  window: FederationWindow,
  nowMs: number,
): FederationWindowProgressSnapshot & { remaining: number } {
  const snapshot = computeFederationWindowProgress(window, nowMs);
  return {
    ...snapshot,
    remaining: 1 - snapshot.progress,
  };
}

/** Screen-reader label for federation timing phase (not shown visually). */
export function federationWindowStateLabel(
  phase: FederationWindowPhase,
): string {
  switch (phase) {
    case "before":
      return "Upcoming";
    case "running":
      return "Running";
    case "after":
      return "Closed";
  }
}

function formatFederationInstantForHumans(
  iso: string,
  prefix: string,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Time not configured.";
  const formatted = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${prefix} ${formatted}`;
}

export function formatFederationEndForHumans(federationEndsAt: string): string {
  return formatFederationInstantForHumans(federationEndsAt, "Ends");
}

export function formatFederationStartForHumans(
  federationStartedAt: string,
): string {
  return formatFederationInstantForHumans(federationStartedAt, "Starts");
}

export function formatFederationClosedForHumans(
  federationEndsAt: string,
): string {
  return formatFederationInstantForHumans(federationEndsAt, "Ended");
}

/** Human caption beneath the federation progress marker. */
export function formatFederationTimingCaption(
  snapshot: FederationWindowProgressSnapshot,
): string {
  switch (snapshot.timingMode) {
    case "unpublished":
      return "Not yet published";
    case "before_start":
      return formatFederationStartForHumans(snapshot.federationStartedAt);
    case "live_open_ended":
      return "No scheduled end";
    case "closed":
      return formatFederationClosedForHumans(snapshot.federationEndsAt);
    default:
      return formatFederationEndForHumans(snapshot.federationEndsAt);
  }
}
