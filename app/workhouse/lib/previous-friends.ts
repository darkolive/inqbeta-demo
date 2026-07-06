import type { WorkhouseState } from "./types";

type PreviousFriendSource = Pick<
  WorkhouseState,
  | "audit"
  | "incomingOffers"
  | "outgoingOffers"
  | "counteredOffers"
  | "rejectedOffers"
>;

export function derivePreviousFriends(
  username: string,
  state: PreviousFriendSource | null,
): string[] {
  if (!state) return [];

  const selfKey = username.trim().toLowerCase();
  const order: string[] = [];
  const canon = new Map<string, string>();

  const remember = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (key === selfKey) return;
    if (canon.has(key)) return;
    canon.set(key, trimmed);
    order.push(key);
  };

  for (const entry of state.audit ?? []) {
    for (const participant of entry.participants ?? []) {
      remember(participant);
    }
  }

  for (const offer of [
    ...(state.outgoingOffers ?? []),
    ...(state.incomingOffers ?? []),
    ...(state.counteredOffers ?? []),
    ...(state.rejectedOffers ?? []),
  ]) {
    remember(offer.from);
    remember(offer.to);
  }

  return order.map((key) => canon.get(key)!);
}
