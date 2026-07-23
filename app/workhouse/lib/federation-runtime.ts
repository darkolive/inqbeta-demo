const FEDERATION_STARTED_AT_ENV = "NEXT_PUBLIC_WORKHOUSE_FEDERATION_STARTED_AT";
const BUILD_TIMESTAMP_ENV = "NEXT_PUBLIC_BUILD_TIMESTAMP";
const FEDERATION_ENDS_AT_ENV = "NEXT_PUBLIC_WORKHOUSE_FEDERATION_ENDS_AT";
const FEDERATION_PUBLISHED_ENV = "NEXT_PUBLIC_WORKHOUSE_FEDERATION_PUBLISHED";

const OPEN_ENDED_SENTINELS = new Set(["open", "none", ""]);

export const DEFAULT_FEDERATION_STARTED_AT = "2026-06-19T07:00:00.000Z";
export const DEFAULT_FEDERATION_ENDS_AT = "2026-07-27T00:00:00.000+01:00";

export type FederationWindow = {
  federationStartedAt: string;
  federationEndsAt: string;
  published: boolean;
  openEnded: boolean;
};

let cachedStartedAt: string | undefined;
let cachedEndsAt: string | undefined;
let cachedPublished: boolean | undefined;
let cachedOpenEnded: boolean | undefined;

function readConfiguredIso(envKey: string, fallback: string): string {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv && !Number.isNaN(Date.parse(fromEnv))) {
    return new Date(fromEnv).toISOString();
  }
  return fallback;
}

export function getFederationStartedAt(): string {
  if (!cachedStartedAt) {
    // Priority: BUILD_TIMESTAMP (injected at build time) > FEDERATION_STARTED_AT env >
    // DEFAULT_FEDERATION_STARTED_AT.
    const fromBuild = process.env[BUILD_TIMESTAMP_ENV]?.trim();
    if (fromBuild && !Number.isNaN(Date.parse(fromBuild))) {
      cachedStartedAt = new Date(fromBuild).toISOString();
    } else {
      cachedStartedAt = readConfiguredIso(
        FEDERATION_STARTED_AT_ENV,
        DEFAULT_FEDERATION_STARTED_AT,
      );
    }
  }
  return cachedStartedAt;
}

function readConfiguredEndsAt(): { endsAt: string; openEnded: boolean } {
  const raw = process.env[FEDERATION_ENDS_AT_ENV]?.trim();
  if (raw && OPEN_ENDED_SENTINELS.has(raw.toLowerCase())) {
    return { endsAt: "", openEnded: true };
  }
  return {
    endsAt: readConfiguredIso(FEDERATION_ENDS_AT_ENV, DEFAULT_FEDERATION_ENDS_AT),
    openEnded: false,
  };
}

export function isFederationPublished(): boolean {
  if (cachedPublished === undefined) {
    const raw = process.env[FEDERATION_PUBLISHED_ENV]?.trim().toLowerCase();
    cachedPublished = !(raw === "false" || raw === "0" || raw === "no");
  }
  return cachedPublished;
}

export function isFederationOpenEnded(): boolean {
  if (cachedOpenEnded === undefined) {
    cachedOpenEnded = readConfiguredEndsAt().openEnded;
  }
  return cachedOpenEnded;
}

export function getFederationEndsAt(): string {
  if (!cachedEndsAt) {
    const configured = readConfiguredEndsAt();
    cachedEndsAt = configured.endsAt;
    cachedOpenEnded = configured.openEnded;
  }
  return cachedEndsAt;
}

export function getFederationWindow(): FederationWindow {
  return {
    federationStartedAt: getFederationStartedAt(),
    federationEndsAt: getFederationEndsAt(),
    published: isFederationPublished(),
    openEnded: isFederationOpenEnded(),
  };
}

export const FEDERATION_RECEIPT_PREFIX = "wkhs";

function hashFederationReceiptSeed(seed: string, length = 6): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, length);
}

export function federationReceiptSeed(
  federationName: string,
  window: FederationWindow,
): string {
  const endToken = window.openEnded ? "open" : window.federationEndsAt;
  return [federationName.trim().toLowerCase(), window.federationStartedAt, endToken].join(
    "|",
  );
}

export function deriveFederationReceiptId(
  federationName: string,
  window: FederationWindow = getFederationWindow(),
): string {
  return `${FEDERATION_RECEIPT_PREFIX}-${hashFederationReceiptSeed(
    federationReceiptSeed(federationName, window),
  )}`;
}

export function formatFederationReceiptLine(receiptId: string): string {
  return receiptId;
}

export function resetFederationRuntimeCacheForTests(): void {
  cachedStartedAt = undefined;
  cachedEndsAt = undefined;
  cachedPublished = undefined;
  cachedOpenEnded = undefined;
}
