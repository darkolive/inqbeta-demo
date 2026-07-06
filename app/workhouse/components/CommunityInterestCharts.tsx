"use client";

import { useEffect, useMemo, useState } from "react";

import type { AuditEntry } from "../lib/types";
import {
  buildContributionChartSeries,
  buildContributionEvents,
  buildContributionPatternSeries,
  COMMUNITY_PARTICIPATION_EMPTY,
  hasContributionPattern,
} from "../lib/contribution-pattern-data";
import { helpReceiptsFromSignals } from "../lib/help-activity";
import {
  HELP_SIGNALS_UPDATED_EVENT,
  loadHelpSignals,
} from "../lib/help-signals";
import { ParticipationLineChart } from "./ContributionPatternChart";

export function CommunityParticipationPanel({
  federationParticipationAudit,
}: {
  federationParticipationAudit: AuditEntry[];
}) {
  const [helpReceipts, setHelpReceipts] = useState<AuditEntry[]>(() =>
    helpReceiptsFromSignals(loadHelpSignals()),
  );

  useEffect(() => {
    function refresh() {
      setHelpReceipts(helpReceiptsFromSignals(loadHelpSignals()));
    }

    refresh();
    window.addEventListener(HELP_SIGNALS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(HELP_SIGNALS_UPDATED_EVENT, refresh);
  }, []);

  const events = useMemo(
    () => buildContributionEvents(federationParticipationAudit, helpReceipts),
    [federationParticipationAudit, helpReceipts],
  );
  const chartPoints = useMemo(() => {
    const series = buildContributionPatternSeries(events);
    return buildContributionChartSeries(series);
  }, [events]);

  return (
    <section className="mt-6 space-y-4">
      <p className="text-lg font-bold">Community Participation</p>
      {hasContributionPattern(events) ? (
        <ParticipationLineChart
          points={chartPoints}
          ariaLabel="Community participation pattern over time"
        />
      ) : (
        <p className="text-sm opacity-60">{COMMUNITY_PARTICIPATION_EMPTY}</p>
      )}
    </section>
  );
}

/** @deprecated Use CommunityParticipationPanel */
export const CommunityInterestPanel = CommunityParticipationPanel;
