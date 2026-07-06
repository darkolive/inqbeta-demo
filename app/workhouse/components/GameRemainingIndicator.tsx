"use client";

import { useEffect, useMemo, useState } from "react";
import { getFederationDisplayName } from "../lib/federation-context";
import {
  deriveFederationReceiptId,
  formatFederationReceiptLine,
  getFederationWindow,
} from "../lib/federation-runtime";
import {
  computeFederationWindowProgress,
  federationMarkerFilledSegmentCount,
  federationMarkerSegmentClass,
  federationWindowStateLabel,
  formatFederationTimingCaption,
  resolveWorkhouseNowMs,
} from "../lib/game-remaining";
import { WORKHOUSE_SEMANTIC_PROOF_HASH_CLASS } from "../lib/semantic-identity";

type GameRemainingIndicatorProps = {
  /** Compact status row for placement beside welcome/context copy. */
  compact?: boolean;
  /** Show federation/rules-space name above the marker. */
  showFederationName?: boolean;
  /** Show a small numeric hint alongside the shape. */
  showNumbers?: boolean;
  /** Number of bar segments to render. */
  segments?: number;
  /** Optional fixed clock for demos/tests. */
  nowMs?: number;
  className?: string;
};

export function GameRemainingIndicator({
  compact = false,
  showFederationName = true,
  showNumbers = false,
  segments = 12,
  nowMs: nowMsProp,
  className = "",
}: GameRemainingIndicatorProps) {
  const [now, setNow] = useState(() => nowMsProp ?? resolveWorkhouseNowMs());

  useEffect(() => {
    if (nowMsProp !== undefined) {
      setNow(nowMsProp);
      return;
    }
    const id = window.setInterval(() => setNow(resolveWorkhouseNowMs()), 60_000);
    return () => window.clearInterval(id);
  }, [nowMsProp]);

  const federationWindow = useMemo(() => getFederationWindow(), []);
  const snapshot = useMemo(
    () => computeFederationWindowProgress(federationWindow, now),
    [federationWindow, now],
  );

  const filledCount = federationMarkerFilledSegmentCount(
    snapshot,
    Math.max(1, segments),
  );
  const remainingShare =
    snapshot.timingMode === "live_bounded"
      ? 1 - snapshot.progress
      : snapshot.timingMode === "live_open_ended"
        ? 1
        : snapshot.timingMode === "closed"
          ? 0
          : 1;
  const percentLabel = `${Math.round(remainingShare * 100)}%`;
  const timingCaption = formatFederationTimingCaption(snapshot);
  const stateLabel = federationWindowStateLabel(snapshot.phase);
  const federationName = getFederationDisplayName();
  const federationReceiptId = useMemo(
    () => deriveFederationReceiptId(federationName, federationWindow),
    [federationName, federationWindow],
  );

  const bar = (
    <div
      role="img"
      aria-label={`${federationName}. ${stateLabel}. ${snapshot.qualitative}. ${timingCaption}. ${federationReceiptId}.`}
      className={
        compact
          ? "flex w-[72%] min-w-[5.5rem] max-w-[8rem] items-center gap-0.5"
          : "flex items-center gap-1.5"
      }
    >
      {Array.from({ length: Math.max(1, segments) }).map((_, idx) => {
        const filled = idx < filledCount;
        return (
          <span
            key={idx}
            aria-hidden
            className={[
              compact ? "h-1.5" : "h-2.5",
              "flex-1 rounded-sm",
              federationMarkerSegmentClass(snapshot.markerTone, filled),
            ].join(" ")}
          />
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div
        className={`flex min-w-0 max-w-[11rem] flex-col items-end gap-1 pr-2 text-right ${className}`.trim()}
      >
        {showFederationName ? (
          <p className="w-full truncate text-base font-semibold leading-snug">
            {federationName}
          </p>
        ) : null}
        <div className="flex w-full items-center justify-end gap-1.5">
          {bar}
          {showNumbers ? (
            <p className="shrink-0 text-[10px] tabular-nums opacity-60">
              {percentLabel}
            </p>
          ) : null}
        </div>
        <p className="w-full text-xs leading-tight opacity-60">{timingCaption}</p>
        <p
          className={`w-full text-right ${WORKHOUSE_SEMANTIC_PROOF_HASH_CLASS}`}
        >
          {formatFederationReceiptLine(federationReceiptId)}
        </p>
      </div>
    );
  }

  return (
    <section className={`grid gap-1.5 ${className}`.trim()}>
      {showFederationName ? (
        <p className="text-base font-semibold">{federationName}</p>
      ) : null}
      <div className="flex items-baseline justify-between gap-3">
        {showNumbers ? (
          <p className="text-xs tabular-nums opacity-70">{percentLabel}</p>
        ) : (
          <span className="sr-only">{stateLabel}</span>
        )}
      </div>

      {bar}

      <p className="text-xs opacity-60">{timingCaption}</p>
      <p className={WORKHOUSE_SEMANTIC_PROOF_HASH_CLASS}>
        {formatFederationReceiptLine(federationReceiptId)}
      </p>
    </section>
  );
}
