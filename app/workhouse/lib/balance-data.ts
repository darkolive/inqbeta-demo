import type { AuditEntry, FederationTimePoint } from "./types";

export type CreditMovement = {
  delta: number;
  label: string;
  timestamp: string;
  hash: string;
};

export type AssetExchangeRow = {
  gesture: string;
  counterparty: string;
  timestamp: string;
  hash: string;
  direction: "received" | "sent";
};

export type AssetActivityPoint = {
  timestamp: string;
  received: number;
  sent: number;
};

const COMPLETE_PATTERN =
  /^(?:Exchange|Offer) completed — (.+) ↔ (.+): (.+) for (.+)$/;
const CREDIT_TERM_PATTERN = /^\d+ credits?$/i;
const MONEY_TERM_PATTERN = /^£[\d.]+$/;

function usernameKey(username: string): string {
  return username.trim().toLowerCase();
}

function classifyExchangeTerm(
  term: string,
): "credits" | "money" | "asset" | null {
  const trimmed = term.trim();
  if (!trimmed) return null;
  if (CREDIT_TERM_PATTERN.test(trimmed)) return "credits";
  if (MONEY_TERM_PATTERN.test(trimmed)) return "money";
  return "asset";
}

export function summarizeCreditExchange(history: CreditMovement[]): {
  received: number;
  sent: number;
} {
  let received = 0;
  let sent = 0;

  for (const row of history) {
    if (row.label === "Joined session") continue;
    if (row.delta > 0) received += row.delta;
    else if (row.delta < 0) sent += Math.abs(row.delta);
  }

  return { received, sent };
}

export type CashExchangeRow = {
  amount: number;
  counterparty: string;
  context: string;
  timestamp: string;
  hash: string;
  direction: "received" | "sent";
};

function parseMoneyAmount(term: string): number | null {
  const match = term.trim().match(/^£([\d.]+)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

export function buildCreditBalanceSeries(
  history: CreditMovement[],
  openingBalance = 0,
): FederationTimePoint[] {
  const sorted = [...history].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const exchanges = sorted.filter((row) => row.label !== "Joined session");
  const joinRow = sorted.find((row) => row.label === "Joined session");
  const startTimestamp = joinRow?.timestamp ?? exchanges[0]?.timestamp;

  if (startTimestamp === undefined) {
    return [];
  }

  let balance = openingBalance;
  const points: FederationTimePoint[] = [
    { timestamp: startTimestamp, value: openingBalance },
  ];

  for (const row of exchanges) {
    balance += row.delta;
    points.push({ timestamp: row.timestamp, value: balance });
  }

  return points;
}

export function buildCashExchangeHistory(
  audit: AuditEntry[],
  username: string,
): CashExchangeRow[] {
  const key = usernameKey(username);
  const rows: CashExchangeRow[] = [];

  for (const entry of audit) {
    if (entry.kind !== "complete") continue;
    const match = entry.message.match(COMPLETE_PATTERN);
    if (!match) continue;

    const [, from, to, giveTerms, receiveTerms] = match;
    const fromKey = from.trim().toLowerCase();
    const toKey = to.trim().toLowerCase();
    const giveKind = classifyExchangeTerm(giveTerms);
    const receiveKind = classifyExchangeTerm(receiveTerms);

    // User receives money (cash received).
    if (fromKey === key && receiveKind === "money") {
      const amount = parseMoneyAmount(receiveTerms);
      if (amount !== null) {
        rows.push({
          amount,
          counterparty: to.trim(),
          context: giveTerms.trim(),
          timestamp: entry.timestamp,
          hash: entry.eventHash,
          direction: "received",
        });
      }
    }

    if (toKey === key && giveKind === "money") {
      const amount = parseMoneyAmount(giveTerms);
      if (amount !== null) {
        rows.push({
          amount,
          counterparty: from.trim(),
          context: receiveTerms.trim(),
          timestamp: entry.timestamp,
          hash: entry.eventHash,
          direction: "received",
        });
      }
    }

    // User gives money (cash sent).
    if (fromKey === key && giveKind === "money") {
      const amount = parseMoneyAmount(giveTerms);
      if (amount !== null) {
        rows.push({
          amount,
          counterparty: to.trim(),
          context: receiveTerms.trim(),
          timestamp: entry.timestamp,
          hash: entry.eventHash,
          direction: "sent",
        });
      }
    }

    if (toKey === key && receiveKind === "money") {
      const amount = parseMoneyAmount(receiveTerms);
      if (amount !== null) {
        rows.push({
          amount,
          counterparty: from.trim(),
          context: giveTerms.trim(),
          timestamp: entry.timestamp,
          hash: entry.eventHash,
          direction: "sent",
        });
      }
    }
  }

  return rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function buildAssetExchangeHistory(
  audit: AuditEntry[],
  username: string,
): AssetExchangeRow[] {
  const key = usernameKey(username);
  const rows: AssetExchangeRow[] = [];

  for (const entry of audit) {
    if (entry.kind !== "complete") continue;
    const match = entry.message.match(COMPLETE_PATTERN);
    if (!match) continue;

    const [, from, to, giveTerms, receiveTerms] = match;
    const fromKey = from.trim().toLowerCase();
    const toKey = to.trim().toLowerCase();
    const giveKind = classifyExchangeTerm(giveTerms);
    const receiveKind = classifyExchangeTerm(receiveTerms);

    if (fromKey === key) {
      if (giveKind === "asset") {
        rows.push({
          gesture: giveTerms.trim(),
          counterparty: to.trim(),
          timestamp: entry.timestamp,
          hash: entry.eventHash,
          direction: "sent",
        });
      }
      if (receiveKind === "asset") {
        rows.push({
          gesture: receiveTerms.trim(),
          counterparty: to.trim(),
          timestamp: entry.timestamp,
          hash: entry.eventHash,
          direction: "received",
        });
      }
    }

    if (toKey === key) {
      if (giveKind === "asset") {
        rows.push({
          gesture: giveTerms.trim(),
          counterparty: from.trim(),
          timestamp: entry.timestamp,
          hash: entry.eventHash,
          direction: "received",
        });
      }
      if (receiveKind === "asset") {
        rows.push({
          gesture: receiveTerms.trim(),
          counterparty: from.trim(),
          timestamp: entry.timestamp,
          hash: entry.eventHash,
          direction: "sent",
        });
      }
    }
  }

  return rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function summarizeAssetExchange(rows: AssetExchangeRow[]): {
  received: number;
  sent: number;
  totalExchanges: number;
} {
  const received = rows.filter((row) => row.direction === "received").length;
  const sent = rows.filter((row) => row.direction === "sent").length;
  const totalExchanges = new Set(rows.map((row) => row.hash)).size;

  return { received, sent, totalExchanges };
}

export function buildAssetActivitySeries(
  rows: AssetExchangeRow[],
): AssetActivityPoint[] {
  let received = 0;
  let sent = 0;
  const points: AssetActivityPoint[] = [];

  for (const row of rows) {
    if (row.direction === "received") received += 1;
    else sent += 1;
    points.push({
      timestamp: row.timestamp,
      received,
      sent,
    });
  }

  return points;
}

export function formatCashReserve(amount: number): string {
  return `£${amount.toFixed(2)}`;
}
