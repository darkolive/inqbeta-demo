import { describe, expect, it } from "vitest";
import { computeFederationData } from "./federation-data";
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
});
