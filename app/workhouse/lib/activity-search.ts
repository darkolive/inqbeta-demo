import type { AuditEntry } from "./types";

export const PROOF_SEARCH_PLACEHOLDER = "Search proof hash";
export const PROOF_SEARCH_EMPTY_MESSAGE = "No matching proof found.";

export function matchesProofSearch(
  entry: AuditEntry,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const fields = [
    entry.eventHash,
    entry.previousHash,
    entry.id,
    entry.scopeId ?? "",
  ];

  return fields.some((field) => field.toLowerCase().includes(needle));
}

export function filterActivityByProofSearch(
  entries: AuditEntry[],
  query: string,
): AuditEntry[] {
  const needle = query.trim();
  if (!needle) return entries;

  const needleLower = needle.toLowerCase();
  const exactEvidenceHash = entries.some(
    (entry) => entry.eventHash.toLowerCase() === needleLower,
  );

  if (exactEvidenceHash) {
    return entries.filter(
      (entry) => entry.eventHash.toLowerCase() === needleLower,
    );
  }

  return entries.filter((entry) => matchesProofSearch(entry, needle));
}

export type ViewProofStateUpdate = {
  activitySearch: string;
  activityOpen: true;
  balanceOpen: false;
};

export function viewProofStateUpdate(
  hash: string,
): ViewProofStateUpdate | null {
  const activitySearch = hash.trim();
  if (!activitySearch) return null;
  return { activitySearch, activityOpen: true, balanceOpen: false };
}
