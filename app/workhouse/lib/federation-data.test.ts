import { describe, expect, it } from "vitest";
import {
  buildAssetPieShares,
  computeFederationData,
} from "./federation-data";
import type { AuditEntry } from "./types";

function auditEntry(
  kind: AuditEntry["kind"],
  timestamp: string,
  participant: string,
): AuditEntry {
  return {
    id: `${kind}-${participant}-${timestamp}`,
    timestamp,
    message: "",
    kind,
    participants: [participant],
    eventHash: "hash",
    previousHash: "previous-hash",
    roomActivity: kind === "join",
  };
}

describe("computeFederationData", () => {
  it("keeps the final wealth-chart point aligned with current wealth after a character is destroyed", () => {
    const data = computeFederationData({
      participantCount: 1,
      audit: [
        auditEntry("join", "2026-01-01T10:00:00.000Z", "Sun"),
        auditEntry("join", "2026-01-01T11:00:00.000Z", "Sid"),
        auditEntry("destroy", "2026-01-01T12:00:00.000Z", "Sid"),
      ],
      exchanges: [],
      federationStartedAt: "2026-01-01T00:00:00.000Z",
      now: new Date("2026-01-01T13:00:00.000Z"),
    });

    expect(data.federationWealth).toBe(5);
    expect(data.wealthGrowth.map((point) => point.value)).toEqual([5, 10, 5]);
    expect(data.wealthGrowth.at(-1)?.value).toBe(data.federationWealth);
  });

  it("shows the six most common completed actions plus a separate other total", () => {
    const counts = new Map([
      ["one", 7],
      ["two", 6],
      ["three", 5],
      ["four", 4],
      ["five", 3],
      ["six", 2],
      ["seven", 1],
    ]);

    const shares = buildAssetPieShares(counts);

    expect(shares.map((share) => share.asset)).toEqual([
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "Other",
    ]);
    expect(shares).toHaveLength(7);
    expect(shares.find((share) => share.isOther)).toMatchObject({
      asset: "Other",
      count: 1,
      share: 1 / 28,
    });
    expect(shares.reduce((sum, share) => sum + share.share, 0)).toBeCloseTo(1);
  });
});
