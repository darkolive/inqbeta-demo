import {
  getFederationEndsAt,
  getFederationStartedAt,
} from "./federation-runtime";
import type {
  AssetShareEntry,
  AuditEntry,
  FederationData,
  FederationTimePoint,
  OfferStatus,
  WorkhouseExchange,
  WorkhouseOffer,
} from "./types";

export const MEMBERSHIP_BUCKET_MS = 30 * 60 * 1000;
export const MEMBERSHIP_WINDOW_MS = 48 * 60 * 60 * 1000;

export const STARTER_CREDITS_PER_PARTICIPANT = 5;
export const ASSET_PIE_MAX_ACTIONS = 6;

/** Format-only key for federation asset tallies (trim, lowercase, collapse spaces). */
export function normalizeFederationAssetKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

type FederationInputs = {
  participantCount: number;
  audit: AuditEntry[];
  exchanges: Iterable<WorkhouseExchange>;
  offers?: Iterable<WorkhouseOffer>;
  federationStartedAt?: string;
  federationEndsAt?: string;
  now?: Date;
};

const INCOMPLETE_OFFER_STATUSES: ReadonlySet<OfferStatus> = new Set([
  "pending",
  "countered",
  "accepted",
]);

export function isIncompleteOffer(offer: WorkhouseOffer): boolean {
  return INCOMPLETE_OFFER_STATUSES.has(offer.status);
}

/** Unique unsettled offer/exchange IDs (dedupes sender/recipient views). */
export function countIncompleteOffers(
  offers: Iterable<WorkhouseOffer>,
  exchanges: Iterable<WorkhouseExchange> = [],
): number {
  const ids = new Set<string>();
  for (const offer of offers) {
    if (isIncompleteOffer(offer)) ids.add(offer.id);
  }
  for (const exchange of exchanges) {
    if (exchange.status !== "completed") ids.add(exchange.offerId);
  }
  return ids.size;
}

export function getMembershipWindowBounds(
  federationStartedAt: string,
  now: Date = new Date(),
): { windowStart: string; windowEnd: string } {
  const startedMs = Date.parse(federationStartedAt);
  const nowMs = now.getTime();
  const windowStartMs = Math.max(startedMs, nowMs - MEMBERSHIP_WINDOW_MS);
  return {
    windowStart: new Date(windowStartMs).toISOString(),
    windowEnd: new Date(nowMs).toISOString(),
  };
}

function floorToMembershipBucket(ms: number): number {
  return Math.floor(ms / MEMBERSHIP_BUCKET_MS) * MEMBERSHIP_BUCKET_MS;
}

function creditMovementInExchange(exchange: WorkhouseExchange): number {
  let total = 0;
  if (exchange.giveType === "credits") total += exchange.giveCreditAmount ?? 0;
  if (exchange.returnType === "credits") total += exchange.creditAmount ?? 0;
  return total;
}

function assetLabelsInExchange(exchange: WorkhouseExchange): string[] {
  const labels: string[] = [];
  if (exchange.giveType === "asset") {
    const key = normalizeFederationAssetKey(exchange.gesture);
    if (key) labels.push(key);
  }
  if (exchange.returnType === "asset") {
    const key = normalizeFederationAssetKey(exchange.returnGesture ?? "");
    if (key) labels.push(key);
  }
  return labels;
}

export function buildAssetPieShares(
  counts: Map<string, number>,
): AssetShareEntry[] {
  const topEntries = [...counts.entries()]
    .map(([asset, count]) => ({ asset, count }))
    .sort((a, b) => b.count - a.count || a.asset.localeCompare(b.asset));
  const visibleEntries = topEntries.slice(0, ASSET_PIE_MAX_ACTIONS);
  const visibleTotal = visibleEntries.reduce((sum, entry) => sum + entry.count, 0);
  if (visibleTotal === 0) return [];

  return visibleEntries.map((entry) => ({
    ...entry,
    share: entry.count / visibleTotal,
  }));
}

type WealthEvent =
  | { timestamp: string; kind: "join"; participantKey: string }
  | { timestamp: string; kind: "destroy"; participantKey: string }
  | { timestamp: string; kind: "credit"; amount: number };

function buildMemberGrowth(
  audit: AuditEntry[],
  federationStartedAt: string,
  now: Date = new Date(),
): FederationTimePoint[] {
  const startedMs = Date.parse(federationStartedAt);
  const { windowStart, windowEnd } = getMembershipWindowBounds(
    federationStartedAt,
    now,
  );
  const windowStartMs = floorToMembershipBucket(Date.parse(windowStart));
  const windowEndMs = floorToMembershipBucket(Date.parse(windowEnd));

  const seen = new Set<string>();
  const joins: { timestampMs: number }[] = [];

  for (const entry of audit) {
    if (entry.kind !== "join" || !entry.roomActivity) continue;
    const key = entry.participants[0]?.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    const timestampMs = Date.parse(entry.timestamp);
    if (Number.isNaN(timestampMs) || timestampMs < startedMs) continue;
    seen.add(key);
    joins.push({ timestampMs });
  }

  joins.sort((a, b) => a.timestampMs - b.timestampMs);

  const points: FederationTimePoint[] = [];
  let joinIndex = 0;
  let cumulative = 0;

  for (
    let bucketMs = windowStartMs;
    bucketMs <= windowEndMs;
    bucketMs += MEMBERSHIP_BUCKET_MS
  ) {
    const bucketEndMs = bucketMs + MEMBERSHIP_BUCKET_MS - 1;
    while (
      joinIndex < joins.length &&
      joins[joinIndex].timestampMs <= bucketEndMs
    ) {
      cumulative += 1;
      joinIndex += 1;
    }
    points.push({
      timestamp: new Date(bucketMs).toISOString(),
      value: cumulative,
    });
  }

  if (points.length === 1) {
    points.push({
      timestamp: new Date(windowEndMs + MEMBERSHIP_BUCKET_MS).toISOString(),
      value: points[0].value,
    });
  }

  return points;
}

export function computeVelocity(
  creditSupply: number,
  creditsExchanged: number,
): number {
  if (creditSupply <= 0) return 0;
  return 1 + creditsExchanged / creditSupply;
}

export function computeFederationWealth(
  creditSupply: number,
  creditsExchanged: number,
): number {
  return Math.round(
    creditSupply * computeVelocity(creditSupply, creditsExchanged),
  );
}

function buildWealthGrowth(events: WealthEvent[]): FederationTimePoint[] {
  if (!events.length) return [];

  const sorted = [...events].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const seenJoins = new Set<string>();
  let participantCount = 0;
  let creditsExchanged = 0;
  const points: FederationTimePoint[] = [];

  for (const event of sorted) {
    if (event.kind === "join") {
      if (seenJoins.has(event.participantKey)) continue;
      seenJoins.add(event.participantKey);
      participantCount += 1;
    } else if (event.kind === "destroy") {
      if (!seenJoins.delete(event.participantKey)) continue;
      participantCount -= 1;
    } else {
      creditsExchanged += event.amount;
    }

    const creditSupply = participantCount * STARTER_CREDITS_PER_PARTICIPANT;
    points.push({
      timestamp: event.timestamp,
      value: computeFederationWealth(creditSupply, creditsExchanged),
    });
  }

  return points;
}

export function computeFederationData(input: FederationInputs): FederationData {
  const federationStartedAt =
    input.federationStartedAt ?? getFederationStartedAt();
  const federationEndsAt = input.federationEndsAt ?? getFederationEndsAt();
  const now = input.now ?? new Date();
  const totalMembers = input.participantCount;
  // Materialise iterables once — Map.values() iterators are single-use.
  const offers = [...(input.offers ?? [])];
  const exchanges = [...input.exchanges];

  let accepted = 0;
  let counteroffers = 0;
  let rejected = 0;
  let completedOffers = 0;
  const incompleteOffers = countIncompleteOffers(offers, exchanges);

  const wealthEvents: WealthEvent[] = [];

  for (const entry of input.audit) {
    switch (entry.kind) {
      case "accept":
      case "accept-counter":
        accepted += 1;
        break;
      case "counter":
        counteroffers += 1;
        break;
      case "reject":
        rejected += 1;
        break;
      case "complete":
        completedOffers += 1;
        break;
      case "join":
        if (entry.roomActivity) {
          const key = entry.participants[0]?.trim().toLowerCase();
          if (key) {
            wealthEvents.push({
              timestamp: entry.timestamp,
              kind: "join",
              participantKey: key,
            });
          }
        }
        break;
      case "destroy": {
        const key = entry.participants[0]?.trim().toLowerCase();
        if (key) {
          wealthEvents.push({
            timestamp: entry.timestamp,
            kind: "destroy",
            participantKey: key,
          });
        }
        break;
      }
    }
  }

  let creditsExchanged = 0;
  const assetCounts = new Map<string, number>();

  for (const exchange of exchanges) {
    if (exchange.status !== "completed") continue;

    const creditMovement = creditMovementInExchange(exchange);
    if (creditMovement > 0) {
      creditsExchanged += creditMovement;
      const timestamp = exchange.completedAt ?? exchange.createdAt;
      wealthEvents.push({ timestamp, kind: "credit", amount: creditMovement });
    }

    const hasAssetSide =
      exchange.giveType === "asset" || exchange.returnType === "asset";
    if (!hasAssetSide) continue;

    for (const label of assetLabelsInExchange(exchange)) {
      assetCounts.set(label, (assetCounts.get(label) ?? 0) + 1);
    }
  }

  const creditSupply = totalMembers * STARTER_CREDITS_PER_PARTICIPANT;
  const velocity = computeVelocity(creditSupply, creditsExchanged);
  const federationWealth = computeFederationWealth(
    creditSupply,
    creditsExchanged,
  );

  return {
    totalMembers,
    federationStartedAt,
    federationEndsAt,
    memberGrowth: buildMemberGrowth(input.audit, federationStartedAt, now),
    creditSupply,
    creditsExchanged,
    velocity,
    federationWealth,
    wealthGrowth: buildWealthGrowth(wealthEvents),
    exchangeActivity: {
      accepted,
      counteroffers,
      rejected,
      completed: completedOffers,
      incompleteOffers,
    },
    totalValueGained: buildAssetPieShares(assetCounts),
  };
}

export function formatVelocity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return `${value.toFixed(1)}`;
}

/** @deprecated Use formatVelocity */
export function formatVelocityMultiplier(value: number): string {
  return formatVelocity(value);
}
