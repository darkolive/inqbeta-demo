import type { CharacterDisplayContext } from "./character-display";
import { emptyCharacterDisplayContext } from "./character-display";
import type { AuditEntry } from "./types";

export const FRIEND_NOT_FOUND_FOOTER = "They may have left the game.";

export type FriendSearchStatus = "empty" | "self" | "found" | "not_found";

export type FriendSearchResult = {
  status: FriendSearchStatus;
  queryDisplay: string;
  canonicalName: string;
};

export function friendNotFoundHeading(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `No one found called ${trimmed}` : "No one found";
}

export function activeParticipantKeys(
  context: CharacterDisplayContext = emptyCharacterDisplayContext(),
): string[] {
  return Object.keys(context.activeSince);
}

export function activeParticipantCanonicalNames(
  context: CharacterDisplayContext,
  names: string[],
): Map<string, string> {
  const map = new Map<string, string>();

  for (const key of Object.keys(context.activeSince)) {
    map.set(key, key);
  }

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (context.activeSince[key]) {
      map.set(key, trimmed);
    }
  }

  return map;
}

export function participantNamesFromAudit(audit: AuditEntry[]): string[] {
  return audit.flatMap((entry) => entry.participants ?? []);
}

export function resolveFriendSearch(
  query: string,
  selfUsername: string,
  context: CharacterDisplayContext,
  canonicalNames: Map<string, string>,
): FriendSearchResult {
  const trimmed = query.trim();
  if (!trimmed) {
    return { status: "empty", queryDisplay: "", canonicalName: "" };
  }

  const key = trimmed.toLowerCase();
  const selfKey = selfUsername.trim().toLowerCase();

  if (selfKey && key === selfKey) {
    return { status: "self", queryDisplay: trimmed, canonicalName: "" };
  }

  if (context.activeSince[key]) {
    return {
      status: "found",
      queryDisplay: trimmed,
      canonicalName: canonicalNames.get(key) ?? trimmed,
    };
  }

  return { status: "not_found", queryDisplay: trimmed, canonicalName: "" };
}

export function canContinueFriendSearch(result: FriendSearchResult): boolean {
  return result.status === "found";
}
