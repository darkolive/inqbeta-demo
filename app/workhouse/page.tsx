"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Carousel, Pagination } from "@skeletonlabs/skeleton-react";
import { Steps } from "@/components/ui/skeleton-react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FrownIcon,
  PlusIcon,
  SearchIcon,
  CoinsIcon,
} from "lucide-react";
import type {
  AuditEntry,
  CharacterDisplayContext,
  ExchangeValueType,
  MoneyReceipt,
  WorkhouseExchange,
  WorkhouseOffer,
  WorkhouseState,
  WorkhouseUser,
} from "./lib/types";
import {
  ACTIVITY_ACCORDION_DEFAULT_OPEN,
  ACTIVITY_HEADING,
  ACCEPT_NOT_COMPLETE_HINT,
  ASSETS_RECEIVED_LABEL,
  FIND_FRIEND_PROMPT,
  LETS_EXCHANGE_LABEL,
  NEW_EXCHANGE_LABEL,
  OFFER_GIVE_SUMMARY_LABEL,
  OFFER_GIVE_TITLE,
  OFFER_RECEIVE_TITLE,
  OFFER_TO_LABEL,
  allowedReturnTypesForGive,
  collectOffersFromState,
  creditCommitmentContextForUser,
  creditOfferInsteadLabel,
  resolveCounterofferSubmitError,
  resolveOfferFormSubmitError,
  resolveOfferGiveStepError,
  giveTermsText,
  originalReceiveTermsText,
  receiveTermsText,
} from "./lib/exchange-value";
import { formatVelocity } from "./lib/federation-data";
import { getFederationDisplayName } from "./lib/federation-context";
import {
  PROOF_SEARCH_EMPTY_MESSAGE,
  PROOF_SEARCH_PLACEHOLDER,
  filterActivityByProofSearch,
  viewProofStateUpdate,
} from "./lib/activity-search";
import {
  acceptCounterOffer,
  acceptOffer,
  clearLoginPrefill,
  clearSession,
  clearUsername,
  completeExchange,
  counterOffer,
  createOffer,
  enterSession,
  fetchState,
  leaveSession,
  loadStoredUsername,
  rejectOffer,
  resetDemoIdentity,
  saveSession,
  WorkhouseApiError,
} from "./lib/api";
import { characterDisplayName } from "./lib/character-display";
import { derivePreviousFriends } from "./lib/previous-friends";
import {
  activeParticipantCanonicalNames,
  canContinueFriendSearch,
  friendNotFoundHeading,
  FRIEND_NOT_FOUND_FOOTER,
  participantNamesFromAudit,
  resolveFriendSearch,
} from "./lib/friend-search";
import { emptyCharacterDisplayContext } from "./lib/character-display";
import { ExchangeTypeSelector } from "./components/ExchangeTypeSelector";
import { WorkhouseHeader } from "./components/WorkhouseHeader";
import { WorkhouseParticipantHeader } from "./components/WorkhouseParticipantHeader";
import {
  BalanceDrawer,
  FederationDataDrawer,
  MenuDrawer,
} from "./components/WorkhouseDrawers";
import { MenuPanel } from "./components/MenuPanel";
import { ResetIdentityDialog } from "./components/ResetIdentityDialog";
import { ReportIssueDialog } from "./components/ReportIssueDialog";
import { ReviewExperienceDialog } from "./components/ReviewExperienceDialog";
import { StayInTouchDialog } from "./components/StayInTouchDialog";
import {
  FederationLineChart,
  FederationPieChart,
} from "./components/FederationCharts";
import { FederationMembershipChart } from "./components/FederationMembershipChart";
import {
  BalanceAssetActivityChart,
  BalanceCreditChart,
} from "./components/BalanceCharts";
import { ContributionPatternSection } from "./components/ContributionPatternChart";
import {
  buildAssetActivitySeries,
  buildAssetExchangeHistory,
  buildCashExchangeHistory,
  buildCreditBalanceSeries,
  formatCashReserve,
  summarizeAssetExchange,
  summarizeCreditExchange,
} from "./lib/balance-data";
import {
  messageForWorkhouseApiError,
  resolveSessionFormError,
  WorkhouseMessages,
} from "./lib/workhouse-messages";
import { exportWorkhouseStoryPdf } from "./lib/export-story-pdf";
import {
  clearHelpSignalsForCharacter,
  HELP_SIGNALS_UPDATED_EVENT,
  loadHelpSignals,
} from "./lib/help-signals";
import {
  helpReceiptIndexTitle,
  helpReceiptsForUser,
  mergeActivityWithHelpReceipts,
} from "./lib/help-activity";
import {
  WORKHOUSE_SEMANTIC_CLASS,
  WORKHOUSE_SEMANTIC_PROOF_HASH_CLASS,
} from "./lib/semantic-identity";

const EVIDENCE_PAGE_SIZE = 5;
const OFFER_PAGE_SIZE = 1;
const AUTO_DISMISS_MS = 4000;

function scrollWorkhouseTop() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  });
}

type OutgoingCardItem =
  | { kind: "outgoing"; offer: WorkhouseOffer }
  | { kind: "countered"; offer: WorkhouseOffer }
  | { kind: "rejected"; offer: WorkhouseOffer };

type TransientTerminalCard = {
  offer: WorkhouseOffer;
  side: "incoming" | "outgoing";
  terminal: "completed" | "rejected";
};

type ActiveOfferSnapshot = {
  offer: WorkhouseOffer;
  bucket: "outgoing" | "incoming" | "countered";
};

function AutoDismissEffect({
  offerId,
  onDismiss,
}: {
  offerId: string;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(offerId), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [offerId, onDismiss]);
  return null;
}

function OfferPagination({
  count,
  page,
  onPageChange,
}: {
  count: number;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  if (safeCount <= OFFER_PAGE_SIZE) return null;
  const clampedPage = Math.min(safePage, safeCount);
  if (clampedPage < 1) return null;
  return (
    <Pagination
      count={safeCount}
      pageSize={OFFER_PAGE_SIZE}
      page={clampedPage}
      onPageChange={(event) => onPageChange(Math.max(1, event.page))}
    >
      <Pagination.FirstTrigger>
        <ChevronsLeftIcon className="size-4" />
      </Pagination.FirstTrigger>
      <Pagination.PrevTrigger>
        <ChevronLeftIcon className="size-4" />
      </Pagination.PrevTrigger>
      <Pagination.Context>
        {(pagination) =>
          pagination.pages.map((pageItem, index) =>
            pageItem.type === "page" ? (
              <Pagination.Item key={index} {...pageItem}>
                {pageItem.value}
              </Pagination.Item>
            ) : (
              <Pagination.Ellipsis key={index} index={index}>
                …
              </Pagination.Ellipsis>
            ),
          )
        }
      </Pagination.Context>
      <Pagination.NextTrigger>
        <ChevronRightIcon className="size-4" />
      </Pagination.NextTrigger>
      <Pagination.LastTrigger>
        <ChevronsRightIcon className="size-4" />
      </Pagination.LastTrigger>
    </Pagination>
  );
}

type CardPhase =
  | "outgoing-pending"
  | "outgoing-countered"
  | "outgoing-accepted"
  | "outgoing-rejected"
  | "outgoing-completed"
  | "incoming-pending"
  | "incoming-countered-waiting"
  | "incoming-accepted"
  | "incoming-completed";

function termsText(offer: WorkhouseOffer) {
  return receiveTermsText(offer);
}

function originalOfferTermsText(offer: WorkhouseOffer) {
  return originalReceiveTermsText(offer);
}

function counterofferReturnText(offer: WorkhouseOffer) {
  return receiveTermsText(offer);
}

function formatMoneyLabel(amount?: number) {
  if (!amount) return "£0";
  return amount % 1 === 0 ? `£${amount}` : `£${amount.toFixed(2)}`;
}

function cannotAffordCreditOffer(
  offer: WorkhouseOffer,
  availableCredits: number,
): offer is WorkhouseOffer & { returnType: "credits"; creditAmount: number } {
  return (
    offer.returnType === "credits" &&
    (offer.creditAmount ?? 0) > availableCredits
  );
}

function clampCreditAmount(value: number, maxCredits: number): number {
  const parsed = Number(value);
  const n = Number.isFinite(parsed) ? Math.trunc(parsed) : 1;
  const max = Math.max(0, maxCredits);
  if (max <= 0) return 0;
  return Math.min(Math.max(n, 1), max);
}

function creditContextFromState(
  user: WorkhouseUser | undefined,
  state: WorkhouseState | null,
  excludeOfferId?: string,
) {
  if (!user || !state) {
    return { balance: 0, committed: 0, available: 0 };
  }
  const offers = collectOffersFromState(
    state.incomingOffers,
    state.outgoingOffers,
    state.counteredOffers,
    state.rejectedOffers,
  );
  return creditCommitmentContextForUser(
    user,
    offers,
    state.activeExchanges,
    excludeOfferId ? { offerId: excludeOfferId } : undefined,
  );
}

function openCounterForm(
  offer: WorkhouseOffer,
  availableCredits: number,
  setters: {
    setCounteringId: (id: string) => void;
    setCounterOfferValue: (g: string) => void;
    setCounterReturnType: (t: ExchangeValueType) => void;
    setCounterCreditAmount: (n: number) => void;
    setCounterMoneyAmount: (g: string) => void;
  },
  preferCredits: boolean,
) {
  const allowed = allowedReturnTypesForGive(offer.giveType ?? "asset");
  setters.setCounteringId(offer.id);
  setters.setCounterOfferValue("");
  setters.setCounterMoneyAmount("");
  if (preferCredits && availableCredits > 0 && allowed.includes("credits")) {
    setters.setCounterReturnType("credits");
    setters.setCounterCreditAmount(
      clampCreditAmount(availableCredits, availableCredits),
    );
  } else {
    setters.setCounterReturnType(
      allowed.includes("asset") ? "asset" : allowed[0],
    );
    setters.setCounterCreditAmount(clampCreditAmount(1, availableCredits));
  }
}

function clearReturnSelection(
  setReturnType: (value: ExchangeValueType | null) => void,
  setCreditAmount: (value: string) => void,
  setReturnAsset: (value: string) => void,
  setMoneyAmount: (value: string) => void,
) {
  setReturnType(null);
  setCreditAmount("");
  setReturnAsset("");
  setMoneyAmount("");
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatActivityDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function displayItem(label: string) {
  if (!label) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type CreditMovement = {
  delta: number;
  label: string;
  timestamp: string;
  hash: string;
};

function buildCreditHistory(
  audit: AuditEntry[],
  username: string,
): CreditMovement[] {
  const key = username.toLowerCase();
  const rows: CreditMovement[] = [];

  for (const entry of audit) {
    if (entry.kind === "join") {
      const m = entry.message.match(/^(.+) joined with (\d+) demo credits$/);
      if (!m) continue;
      const [, who, credits] = m;
      if (who.toLowerCase() !== key) continue;
      rows.push({
        delta: Number(credits),
        label: "Joined session",
        timestamp: entry.timestamp,
        hash: entry.eventHash,
      });
      continue;
    }

    if (entry.kind === "complete") {
      const m = entry.message.match(
        /^(?:Exchange|Offer) completed — (.+) ↔ (.+): (.+) for (.+)$/,
      );
      if (!m) continue;
      const [, from, to, giveTerms, receiveTerms] = m;
      const giveCredits = giveTerms.match(/^(\d+) credits?$/);
      const receiveCredits = receiveTerms.match(/^(\d+) credits?$/);
      if (from.toLowerCase() === key && giveCredits) {
        rows.push({
          delta: -Number(giveCredits[1]),
          label: "Offer completed",
          timestamp: entry.timestamp,
          hash: entry.eventHash,
        });
      }
      if (to.toLowerCase() === key && giveCredits) {
        rows.push({
          delta: Number(giveCredits[1]),
          label: "Offer completed",
          timestamp: entry.timestamp,
          hash: entry.eventHash,
        });
      }
      if (to.toLowerCase() === key && receiveCredits) {
        rows.push({
          delta: -Number(receiveCredits[1]),
          label: "Offer completed",
          timestamp: entry.timestamp,
          hash: entry.eventHash,
        });
      }
      if (from.toLowerCase() === key && receiveCredits) {
        rows.push({
          delta: Number(receiveCredits[1]),
          label: "Offer completed",
          timestamp: entry.timestamp,
          hash: entry.eventHash,
        });
      }
    }
  }

  return rows;
}

function openingCreditsForUser(audit: AuditEntry[], username: string): number {
  const key = username.toLowerCase();
  for (const entry of audit) {
    if (entry.kind !== "join") continue;
    const m = entry.message.match(/^(.+) joined with (\d+) demo credits$/);
    if (!m || m[1].toLowerCase() !== key) continue;
    return Number(m[2]);
  }
  return 5;
}

function isSelf(name: string, currentUser: string) {
  return name.toLowerCase() === currentUser.toLowerCase();
}

function ActivityName({
  name,
  currentUser,
  characterDisplayContext,
  eventTimestamp,
}: {
  name: string;
  currentUser: string;
  characterDisplayContext?: CharacterDisplayContext;
  eventTimestamp?: string;
}) {
  if (isSelf(name, currentUser)) {
    return <span className={WORKHOUSE_SEMANTIC_CLASS.self}>You</span>;
  }
  const display = characterDisplayContext
    ? characterDisplayName(name, characterDisplayContext, eventTimestamp)
    : name;
  return <span className={WORKHOUSE_SEMANTIC_CLASS.other}>{display}</span>;
}

function ActivityTerm({ children }: { children: React.ReactNode }) {
  return <span className={WORKHOUSE_SEMANTIC_CLASS.neutral}>{children}</span>;
}

function ProposedExchangeMessage({
  offer,
  currentUser,
}: {
  offer: WorkhouseOffer;
  currentUser: string;
}) {
  const give = giveTermsText(offer);
  const receive = originalReceiveTermsText(offer);
  if (isSelf(offer.from, currentUser)) {
    return (
      <>
        You proposed an offer to{" "}
        <ActivityName name={offer.to} currentUser={currentUser} /> of{" "}
        <ActivityTerm>{give}</ActivityTerm> in exchange for{" "}
        <ActivityTerm>{receive}</ActivityTerm>.
      </>
    );
  }
  return (
    <>
      <ActivityName name={offer.from} currentUser={currentUser} /> proposed an
      offer to you of <ActivityTerm>{give}</ActivityTerm> in exchange for{" "}
      <ActivityTerm>{receive}</ActivityTerm>.
    </>
  );
}

function OutgoingOfferSentence({
  offer,
  currentUser,
}: {
  offer: WorkhouseOffer;
  currentUser: string;
}) {
  return (
    <p>
      <ProposedExchangeMessage offer={offer} currentUser={currentUser} />
    </p>
  );
}

function IncomingOfferSentence({
  offer,
  currentUser,
}: {
  offer: WorkhouseOffer;
  currentUser: string;
}) {
  return (
    <p>
      <ProposedExchangeMessage offer={offer} currentUser={currentUser} />
    </p>
  );
}

function CompletedOfferMessage({
  offer,
  currentUser,
}: {
  offer: WorkhouseOffer;
  currentUser: string;
}) {
  const give = giveTermsText(offer);
  const receive = receiveTermsText(offer);
  return (
    <>
      Offer completed between{" "}
      <ActivityName name={offer.from} currentUser={currentUser} /> and{" "}
      <ActivityName name={offer.to} currentUser={currentUser} /> for{" "}
      <ActivityTerm>{give}</ActivityTerm> in exchange for{" "}
      <ActivityTerm>{receive}</ActivityTerm>.
    </>
  );
}

function CounterofferSentence({
  offer,
  currentUser,
  perspective,
}: {
  offer: WorkhouseOffer;
  currentUser: string;
  perspective: "sender" | "recipient";
}) {
  const counterReturn = counterofferReturnText(offer);
  const originalItem = giveTermsText(offer);
  if (perspective === "sender") {
    return (
      <p className="opacity-60">
        <ActivityName name={offer.to} currentUser={currentUser} />{" "}
        counteroffered your offer of <ActivityTerm>{originalItem}</ActivityTerm>{" "}
        in exchange for <ActivityTerm>{counterReturn}</ActivityTerm>.
      </p>
    );
  }
  return (
    <p className="opacity-60">
      You counteroffered{" "}
      <ActivityName name={offer.from} currentUser={currentUser} />
      &apos;s offer of <ActivityTerm>{originalItem}</ActivityTerm> in exchange
      for <ActivityTerm>{counterReturn}</ActivityTerm>.
    </p>
  );
}

function HelpReceiptYou({ children }: { children: React.ReactNode }) {
  return <span className={WORKHOUSE_SEMANTIC_CLASS.self}>{children}</span>;
}

function HelpReceiptActivityBody({ message }: { message: string }) {
  const lines = message.split("\n");
  return (
    <>
      {lines.map((line, index) => {
        if (!line) {
          return index < lines.length - 1 ? <br key={`gap-${index}`} /> : null;
        }
        const youPrefix = line.match(/^You(\s|$)/);
        if (youPrefix) {
          return (
            <span key={`line-${index}`} className="block">
              <HelpReceiptYou>You</HelpReceiptYou>
              {line.slice(3)}
            </span>
          );
        }
        const quoted = line.match(/^"(.+)"$/);
        if (quoted) {
          return (
            <span key={`line-${index}`} className="mt-1 block">
              <ActivityTerm>&ldquo;{quoted[1]}&rdquo;</ActivityTerm>
            </span>
          );
        }
        if (/^(Easy|Safe|Language clear|Use again):/.test(line)) {
          return (
            <span key={`line-${index}`} className="block tabular-nums">
              {line}
            </span>
          );
        }
        return (
          <span key={`line-${index}`} className="block">
            {line}
          </span>
        );
      })}
    </>
  );
}

function formatActivityMessage(
  entry: AuditEntry,
  currentUser: string,
  characterDisplayContext?: CharacterDisplayContext,
): React.ReactNode {
  const N = ({ name }: { name: string }) => (
    <ActivityName
      name={name}
      currentUser={currentUser}
      characterDisplayContext={characterDisplayContext}
      eventTimestamp={entry.timestamp}
    />
  );

  switch (entry.kind) {
    case "join": {
      const m = entry.message.match(/^(.+) joined with (\d+) demo credits$/);
      if (!m) return entry.message;
      const [, who, credits] = m;
      if (isSelf(who, currentUser)) {
        return (
          <>
            <ActivityName name={who} currentUser={currentUser} /> joined with{" "}
            {credits} demo credits
          </>
        );
      }
      return (
        <>
          <N name={who} /> joined with {credits} demo credits
        </>
      );
    }
    case "offer": {
      const proposed = entry.message.match(
        /^(.+) proposed an (?:offer to|exchange with) (.+) of (.+) in exchange for (.+)$/,
      );
      if (proposed) {
        const [, from, to, give, receive] = proposed;
        if (isSelf(from, currentUser)) {
          return (
            <>
              You proposed an offer to <N name={to} /> of{" "}
              <ActivityTerm>{give}</ActivityTerm> in exchange for{" "}
              <ActivityTerm>{receive}</ActivityTerm>.
            </>
          );
        }
        if (isSelf(to, currentUser)) {
          return (
            <>
              <N name={from} /> proposed an offer to you of{" "}
              <ActivityTerm>{give}</ActivityTerm> in exchange for{" "}
              <ActivityTerm>{receive}</ActivityTerm>.
            </>
          );
        }
        return (
          <>
            <N name={from} /> proposed an offer to <N name={to} /> of{" "}
            <ActivityTerm>{give}</ActivityTerm> in exchange for{" "}
            <ActivityTerm>{receive}</ActivityTerm>.
          </>
        );
      }
      const legacyProposed = entry.message.match(
        /^(.+) proposed an exchange with (.+): (.+) gives (.+) in exchange for (.+)$/,
      );
      if (legacyProposed) {
        const [, from, to, , give, receive] = legacyProposed;
        if (isSelf(from, currentUser)) {
          return (
            <>
              You proposed an offer to <N name={to} /> of{" "}
              <ActivityTerm>{give}</ActivityTerm> in exchange for{" "}
              <ActivityTerm>{receive}</ActivityTerm>.
            </>
          );
        }
        if (isSelf(to, currentUser)) {
          return (
            <>
              <N name={from} /> proposed an offer to you of{" "}
              <ActivityTerm>{give}</ActivityTerm> in exchange for{" "}
              <ActivityTerm>{receive}</ActivityTerm>.
            </>
          );
        }
        return (
          <>
            <N name={from} /> proposed an offer to <N name={to} /> of{" "}
            <ActivityTerm>{give}</ActivityTerm> in exchange for{" "}
            <ActivityTerm>{receive}</ActivityTerm>.
          </>
        );
      }
      const m = entry.message.match(/^(.+) offered (.+) to (.+) for (.+)$/);
      if (!m) return entry.message;
      const [, from, gesture, to, terms] = m;
      if (isSelf(from, currentUser)) {
        return (
          <>
            <ActivityName name={from} currentUser={currentUser} /> offered{" "}
            <ActivityTerm>{gesture}</ActivityTerm> to <N name={to} /> for{" "}
            <ActivityTerm>{terms}</ActivityTerm>.
          </>
        );
      }
      if (isSelf(to, currentUser)) {
        return (
          <>
            <N name={from} /> offered <ActivityTerm>{gesture}</ActivityTerm> to
            you for <ActivityTerm>{terms}</ActivityTerm>.
          </>
        );
      }
      return (
        <>
          <N name={from} /> offered <ActivityTerm>{gesture}</ActivityTerm> to{" "}
          <N name={to} /> for <ActivityTerm>{terms}</ActivityTerm>.
        </>
      );
    }
    case "accept": {
      const m = entry.message.match(
        /^(.+) accepted offer from (.+): (.+) for (.+)$/,
      );
      if (!m) {
        const legacy = entry.message.match(/^(.+) accepted offer from (.+)$/);
        if (!legacy) return entry.message;
        const [, actor, from] = legacy;
        if (isSelf(actor, currentUser)) {
          return (
            <>
              <ActivityName name={actor} currentUser={currentUser} /> accepted
              this offer.
            </>
          );
        }
        if (isSelf(from, currentUser)) {
          return (
            <>
              <N name={actor} /> accepted your offer.
            </>
          );
        }
        return (
          <>
            <N name={actor} /> accepted an offer from <N name={from} />.
          </>
        );
      }
      const [, actor, from, gesture, terms] = m;
      if (isSelf(actor, currentUser)) {
        return (
          <>
            <ActivityName name={actor} currentUser={currentUser} /> accepted{" "}
            <N name={from} />
            's offer of <ActivityTerm>{gesture}</ActivityTerm> in exchange for{" "}
            <ActivityTerm>{terms}</ActivityTerm>.
          </>
        );
      }
      if (isSelf(from, currentUser)) {
        return (
          <>
            <N name={actor} /> accepted your offer of{" "}
            <ActivityTerm>{gesture}</ActivityTerm> in exchange for{" "}
            <ActivityTerm>{terms}</ActivityTerm>.
          </>
        );
      }
      return (
        <>
          <N name={actor} /> accepted an offer from <N name={from} /> of{" "}
          <ActivityTerm>{gesture}</ActivityTerm> in exchange for{" "}
          <ActivityTerm>{terms}</ActivityTerm>.
        </>
      );
    }
    case "accept-counter": {
      const m = entry.message.match(
        /^(.+) accepted counteroffer from (.+): (.+) for (.+)$/,
      );
      if (!m) return entry.message;
      const [, actor, counterparty, counterReturn, originalItem] = m;
      if (isSelf(actor, currentUser)) {
        return (
          <>
            <ActivityName name={actor} currentUser={currentUser} /> accepted{" "}
            <N name={counterparty} />
            &apos;s counteroffer of <ActivityTerm>
              {originalItem}
            </ActivityTerm>{" "}
            in exchange for <ActivityTerm>{counterReturn}</ActivityTerm>.
          </>
        );
      }
      if (isSelf(counterparty, currentUser)) {
        return (
          <>
            <N name={actor} /> accepted your counteroffer of{" "}
            <ActivityTerm>{originalItem}</ActivityTerm> in exchange for{" "}
            <ActivityTerm>{counterReturn}</ActivityTerm>.
          </>
        );
      }
      return (
        <>
          <N name={actor} /> accepted <N name={counterparty} />
          &apos;s counteroffer of <ActivityTerm>{originalItem}</ActivityTerm> in
          exchange for <ActivityTerm>{counterReturn}</ActivityTerm>.
        </>
      );
    }
    case "reject": {
      const counter = entry.message.match(
        /^(.+) rejected (.+)'s counteroffer: (.+) for (.+)$/,
      );
      if (counter) {
        const [, actor, counterparty, counterReturn, originalItem] = counter;
        if (isSelf(actor, currentUser)) {
          return (
            <>
              <ActivityName name={actor} currentUser={currentUser} /> rejected{" "}
              <N name={counterparty} />
              &apos;s counteroffer of{" "}
              <ActivityTerm>{counterReturn}</ActivityTerm> in exchange for{" "}
              <ActivityTerm>{originalItem}</ActivityTerm>.
            </>
          );
        }
        if (isSelf(counterparty, currentUser)) {
          return (
            <>
              <N name={actor} /> rejected your counteroffer of{" "}
              <ActivityTerm>{counterReturn}</ActivityTerm> in exchange for{" "}
              <ActivityTerm>{originalItem}</ActivityTerm>.
            </>
          );
        }
        return (
          <>
            <N name={actor} /> rejected <N name={counterparty} />
            &apos;s counteroffer of <ActivityTerm>
              {counterReturn}
            </ActivityTerm>{" "}
            in exchange for <ActivityTerm>{originalItem}</ActivityTerm>.
          </>
        );
      }

      const m = entry.message.match(
        /^(.+) rejected (.+)'s offer: (.+) for (.+)$/,
      );
      if (!m) {
        const legacy = entry.message.match(/^(.+) rejected (.+)'s offer$/);
        if (!legacy) return entry.message;
        const [, actor, from] = legacy;
        if (isSelf(actor, currentUser)) {
          return (
            <>
              <ActivityName name={actor} currentUser={currentUser} /> rejected{" "}
              <N name={from} />
              &apos;s offer
            </>
          );
        }
        if (isSelf(from, currentUser)) {
          return (
            <>
              <N name={actor} /> rejected your offer
            </>
          );
        }
        return (
          <>
            <N name={actor} /> rejected <N name={from} />
            &apos;s offer
          </>
        );
      }
      const [, actor, from, gesture, terms] = m;
      if (isSelf(actor, currentUser)) {
        return (
          <>
            <ActivityName name={actor} currentUser={currentUser} /> rejected{" "}
            <N name={from} />
            &apos;s offer of <ActivityTerm>{gesture}</ActivityTerm> in exchange
            for <ActivityTerm>{terms}</ActivityTerm>.
          </>
        );
      }
      if (isSelf(from, currentUser)) {
        return (
          <>
            <N name={actor} /> rejected your offer of{" "}
            <ActivityTerm>{gesture}</ActivityTerm> in exchange for{" "}
            <ActivityTerm>{terms}</ActivityTerm>.
          </>
        );
      }
      return (
        <>
          <N name={actor} /> rejected <N name={from} />
          &apos;s offer of <ActivityTerm>{gesture}</ActivityTerm> in exchange
          for <ActivityTerm>{terms}</ActivityTerm>.
        </>
      );
    }
    case "counter": {
      const m = entry.message.match(
        /^(.+) counter-offered (.+) with (.+) in exchange for (.+)$/,
      );
      if (!m) return entry.message;
      const [, actor, from, counterReturn, originalItem] = m;
      if (isSelf(from, currentUser)) {
        return (
          <>
            <N name={actor} /> counteroffered your offer of{" "}
            <ActivityTerm>{originalItem}</ActivityTerm> in exchange for{" "}
            <ActivityTerm>{counterReturn}</ActivityTerm>.
          </>
        );
      }
      if (isSelf(actor, currentUser)) {
        return (
          <>
            <ActivityName name={actor} currentUser={currentUser} />{" "}
            counteroffered <N name={from} />
            &apos;s offer of <ActivityTerm>{originalItem}</ActivityTerm> in
            exchange for <ActivityTerm>{counterReturn}</ActivityTerm>.
          </>
        );
      }
      return (
        <>
          <N name={actor} /> counteroffered <N name={from} />
          &apos;s offer of <ActivityTerm>{originalItem}</ActivityTerm> in
          exchange for <ActivityTerm>{counterReturn}</ActivityTerm>.
        </>
      );
    }
    case "complete": {
      const m = entry.message.match(
        /^(?:Exchange|Offer) completed — (.+) ↔ (.+): (.+) for (.+)$/,
      );
      if (!m) return entry.message;
      const [, from, to, gesture, terms] = m;
      if (isSelf(from, currentUser)) {
        return (
          <>
            Offer completed between{" "}
            <ActivityName name={from} currentUser={currentUser} /> and{" "}
            <N name={to} /> for <ActivityTerm>{gesture}</ActivityTerm> in
            exchange for <ActivityTerm>{terms}</ActivityTerm>.
          </>
        );
      }
      if (isSelf(to, currentUser)) {
        return (
          <>
            Offer completed between{" "}
            <ActivityName name={to} currentUser={currentUser} /> and{" "}
            <N name={from} /> for <ActivityTerm>{gesture}</ActivityTerm> in
            exchange for <ActivityTerm>{terms}</ActivityTerm>.
          </>
        );
      }
      return (
        <>
          Offer completed between <N name={from} /> and <N name={to} /> for{" "}
          <ActivityTerm>{gesture}</ActivityTerm> in exchange for{" "}
          <ActivityTerm>{terms}</ActivityTerm>.
        </>
      );
    }
    case "help-stay-in-touch": {
      const topicsMatch = entry.message.match(
        /^You asked to stay in touch(?: about: (.+))?$/,
      );
      if (!topicsMatch) return entry.message;
      if (topicsMatch[1]) {
        return (
          <>
            <HelpReceiptYou>You</HelpReceiptYou>
            {" asked to stay in touch about: "}
            <ActivityTerm>{topicsMatch[1]}</ActivityTerm>
          </>
        );
      }
      return (
        <>
          <HelpReceiptYou>You</HelpReceiptYou>
          {" asked to stay in touch"}
        </>
      );
    }
    case "help-report-issue":
      return <HelpReceiptActivityBody message={entry.message} />;
    case "help-review":
      return <HelpReceiptActivityBody message={entry.message} />;
    default:
      return entry.message;
  }
}

function ActivityTimeline({
  entries,
  currentUser,
  characterDisplayContext,
}: {
  entries: AuditEntry[];
  currentUser: string;
  characterDisplayContext?: CharacterDisplayContext;
}) {
  return (
    <ul className="ml-4 list-none border-l border-surface-300-700 pl-6">
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className={`relative -ml-6 pl-6 ${index === entries.length - 1 ? "pb-0" : "pb-8"}`}
        >
          <span
            aria-hidden
            className="absolute left-0 top-1.5 size-2.5 -translate-x-1/2 rounded-full bg-primary-500 ring-4 ring-surface-50-950"
          />
          <p className="opacity-60">{formatTime(entry.timestamp)}</p>
          {formatActivityDate(entry.timestamp) ? (
            <p className="opacity-60">{formatActivityDate(entry.timestamp)}</p>
          ) : null}
          <p className="mt-1">
            {formatActivityMessage(entry, currentUser, characterDisplayContext)}
          </p>
          <dl className="mt-2 grid gap-1 opacity-60">
            <div>
              <dt className="sr-only">Proof ID</dt>
              <dd className="break-all">
                <span className="font-medium">Proof ID</span> {entry.id}
              </dd>
            </div>
            {entry.scopeId ? (
              <div>
                <dt className="sr-only">Scope ID</dt>
                <dd className="break-all">
                  <span className="font-medium">Scope ID</span> {entry.scopeId}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">Evidence hash</dt>
              <dd className="break-all">
                <span className="font-medium">Evidence hash</span>{" "}
                {entry.eventHash}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Previous hash</dt>
              <dd className="break-all">
                <span className="font-medium">Previous hash</span>{" "}
                {entry.previousHash}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function addTransientTerminal(
  setter: React.Dispatch<React.SetStateAction<TransientTerminalCard[]>>,
  card: TransientTerminalCard,
) {
  setter((current) =>
    current.some((item) => item.offer.id === card.offer.id)
      ? current
      : [...current, card],
  );
}

function thirdStepTitle(phase: CardPhase): string {
  if (phase === "outgoing-completed" || phase === "incoming-completed")
    return "Completed";
  return "Complete";
}

function stepsConfig(phase: CardPhase): {
  steps: { title: string }[];
  step: number;
} {
  const third = thirdStepTitle(phase);
  switch (phase) {
    case "outgoing-pending":
      return {
        steps: [{ title: "Sent" }, { title: "Response" }, { title: third }],
        step: 0,
      };
    case "outgoing-countered":
      return {
        steps: [{ title: "Countered" }, { title: "Waiting" }, { title: third }],
        step: 0,
      };
    case "outgoing-accepted":
    case "outgoing-rejected":
    case "outgoing-completed":
      return {
        steps: [{ title: "Sent" }, { title: "Response" }, { title: third }],
        step: 2,
      };
    case "incoming-pending":
      return {
        steps: [{ title: "Received" }, { title: "Respond" }, { title: third }],
        step: 0,
      };
    case "incoming-countered-waiting":
      return {
        steps: [{ title: "Countered" }, { title: "Waiting" }, { title: third }],
        step: 1,
      };
    case "incoming-accepted":
    case "incoming-completed":
      return {
        steps: [{ title: "Received" }, { title: "Respond" }, { title: third }],
        step: 2,
      };
  }
}

function CompactCardSteps({ phase }: { phase: CardPhase }) {
  const { steps, step } = stepsConfig(phase);
  return (
    <Steps step={step} count={steps.length} linear className="w-full">
      <Steps.List>
        {steps.map((item, index) => (
          <Steps.Item key={item.title} index={index}>
            <span className="flex items-center gap-1">
              <Steps.Indicator>{index + 1}</Steps.Indicator>
              <span>{item.title}</span>
            </span>
            {index < steps.length - 1 ? <Steps.Separator /> : null}
          </Steps.Item>
        ))}
      </Steps.List>
    </Steps>
  );
}

function FederationDataPanel({
  data,
}: {
  data: WorkhouseState["federationData"];
}) {
  const festivalName = getFederationDisplayName();
  return (
    <div className="mb-12 grid gap-4">
      <div className="grid gap-2">
        <p className="text-lg font-bold">
          This is what is happening at {festivalName} right now
        </p>
        <p>
          We only record how people have exchanged here — not personal details.
        </p>
        <p>
          You keep control of your own story. Your character name lets you
          return to it on this device.
        </p>
        <p>
          This keeps to the principle of{" "}
          <span className="font-bold">Free to give, never free to take.</span>
        </p>
      </div>
      {data ? (
        <>
          <section className="space-y-4 mt-6">
            <p className="text-lg font-bold mb-2">Membership</p>
            <FederationMembershipChart
              totalMembers={data.totalMembers}
              points={data.memberGrowth}
            />
          </section>

          <section className="mt-6 space-y-4">
            <p className="text-lg font-bold">Community Wealth</p>
            <div className="mx-auto w-full sm:w-3/4">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-surface-300-700">
                    <td className="py-1.5 pr-2">Total Credit Supply</td>
                    <td className="py-1.5 text-right font-semibold">
                      {data.creditSupply}
                    </td>
                  </tr>
                  <tr className="border-b border-surface-300-700">
                    <td className="py-1.5 pr-2">Credits Exchanged</td>
                    <td className="py-1.5 text-right font-semibold">
                      {data.creditsExchanged}
                    </td>
                  </tr>
                  <tr className="border-b border-surface-300-700">
                    <td className="py-1.5 pr-2">Velocity</td>
                    <td className="py-1.5 text-right font-semibold">
                      {formatVelocity(data.velocity)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-lg font-semibold">
                      Community Wealth
                    </td>
                    <td className="py-1.5 text-right text-3xl font-bold">
                      {data.federationWealth}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <FederationLineChart
              points={data.wealthGrowth}
              label="Community wealth over time"
            />
          </section>

          <section className="mt-6 space-y-4">
            <p className="text-lg font-bold">Festival Activity</p>
            <p>
              This shows how active the community is, and where offers are still
              waiting to settle.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>
                Offers accepted:{" "}
                <span className="text-lg font-semibold">
                  {data.exchangeActivity.accepted}
                </span>
              </span>
              <span>
                Counteroffers:{" "}
                <span className="text-lg font-semibold">
                  {data.exchangeActivity.counteroffers}
                </span>
              </span>
              <span>
                Rejections:{" "}
                <span className="text-lg font-semibold">
                  {data.exchangeActivity.rejected}
                </span>
              </span>
              <span>
                Completed offers:{" "}
                <span className={`text-lg ${WORKHOUSE_SEMANTIC_CLASS.success}`}>
                  {data.exchangeActivity.completed}
                </span>
              </span>
              <span className="col-span-2">
                Incomplete offers:{" "}
                <span className={`text-lg ${WORKHOUSE_SEMANTIC_CLASS.warning}`}>
                  {data.exchangeActivity.incompleteOffers}
                </span>
              </span>
            </div>
          </section>

          <section className="mt-6 space-y-4">
            <p className="text-lg font-bold">Trading Activity</p>
            <p>This shows the most exchanged actions in the community.</p>
            <FederationPieChart shares={data.totalValueGained} />
          </section>
        </>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
}

function ProofHashActions({
  hash,
  onViewProof,
}: {
  hash: string;
  onViewProof?: (hash: string) => void;
}) {
  const trimmedHash = hash.trim();
  if (!onViewProof || !trimmedHash) return null;

  return (
    <button
      type="button"
      onClick={() => onViewProof(trimmedHash)}
      className={`rounded p-2 transition-opacity hover:opacity-100 ${WORKHOUSE_SEMANTIC_CLASS.proof}`}
      aria-label="View proof"
      title="View proof"
      data-action="view-proof"
    >
      <SearchIcon className="size-5" aria-hidden />
    </button>
  );
}

function BalanceExchangeRow({
  title,
  detail,
  timestamp,
  hash,
  onViewProof,
}: {
  title: ReactNode;
  detail?: ReactNode;
  timestamp: string;
  hash: string;
  onViewProof?: (hash: string) => void;
}) {
  const hashTargetId = `proof-hash-${hash}`;

  return (
    <li className="relative border-b border-surface-300-700 py-2 last:border-b-0">
      <div className="absolute right-0 top-2">
        <ProofHashActions hash={hash} onViewProof={onViewProof} />
      </div>
      <p className={`pr-12 ${WORKHOUSE_SEMANTIC_CLASS.proof}`}>{title}</p>
      {detail ? <p>{detail}</p> : null}
      <p className="opacity-60">
        {formatTime(timestamp)} ·{" "}
        <span id={hashTargetId} className={WORKHOUSE_SEMANTIC_PROOF_HASH_CLASS}>
          {hash}
        </span>
      </p>
    </li>
  );
}

function BalancePanel({
  user,
  audit,
  helpReceipts,
  creditCommitment,
  characterDisplayContext,
  onViewProof,
}: {
  user?: WorkhouseUser;
  audit: AuditEntry[];
  helpReceipts: AuditEntry[];
  creditCommitment?: { balance: number; committed: number; available: number };
  characterDisplayContext?: CharacterDisplayContext;
  onViewProof?: (hash: string) => void;
}) {
  const creditHistory = user ? buildCreditHistory(audit, user.username) : [];
  const openingBalance = user ? openingCreditsForUser(audit, user.username) : 5;
  const creditSummary = summarizeCreditExchange(creditHistory);
  const creditBalanceSeries = buildCreditBalanceSeries(
    creditHistory,
    openingBalance,
  );
  const assetRows = user ? buildAssetExchangeHistory(audit, user.username) : [];
  const assetSummary = summarizeAssetExchange(assetRows);
  const assetActivitySeries = buildAssetActivitySeries(assetRows);
  const assetsReceived = assetRows.filter(
    (row) => row.direction === "received",
  );
  const assetsSent = assetRows.filter((row) => row.direction === "sent");
  const cashRows = user ? buildCashExchangeHistory(audit, user.username) : [];
  const cashReceivedRows = cashRows.filter(
    (row) => row.direction === "received",
  );
  const cashSentRows = cashRows.filter((row) => row.direction === "sent");
  const cashReceivedTotal = cashReceivedRows.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const cashSentTotal = cashSentRows.reduce((sum, row) => sum + row.amount, 0);
  const helpSent = helpReceipts;
  const helpReceived: AuditEntry[] = [];

  return (
    <div className="mb-12 grid gap-4">
      <p>
        In this section you can see a complete record of all your interactions
        within this space, secured by encrypted, tamper-evident, hash-verified
        receipts.
      </p>

      <section className="mt-6 space-y-4">
        <p className="text-lg font-bold">Credits Exchanged</p>
        <div className="mx-auto w-full sm:w-3/4">
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-surface-300-700">
                <td className="py-1.5 pr-2">Opening balance</td>
                <td className="py-1.5 text-right font-semibold">
                  {openingBalance}
                </td>
              </tr>
              <tr className="border-b border-surface-300-700">
                <td className="py-1.5 pr-2">Credits received</td>
                <td className="py-1.5 text-right font-semibold">
                  {creditSummary.received}
                </td>
              </tr>
              <tr className="border-b border-surface-300-700">
                <td className="py-1.5 pr-2">Credits sent</td>
                <td className="py-1.5 text-right font-semibold">
                  {creditSummary.sent}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 text-lg font-semibold">
                  Current balance
                </td>
                <td className="py-1.5 text-right text-3xl font-bold">
                  {user?.credits ?? 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {creditCommitment && creditCommitment.committed > 0 ? (
          <div className="mx-auto grid w-full gap-1 text-sm opacity-80 sm:w-3/4">
            <div className="flex items-center justify-between gap-3">
              <p>Committed to open offers</p>
              <p>{creditCommitment.committed}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p>Available to offer</p>
              <p>{creditCommitment.available}</p>
            </div>
          </div>
        ) : null}
        <div>
          <p className="mb-2 font-bold">Transaction history</p>
          {!creditHistory.length ? (
            <p>No credit movements yet.</p>
          ) : (
            <ul className="grid list-none gap-0 rounded-md border border-surface-300-700 bg-surface-100-900/30 px-3 py-1">
              {creditHistory.map((row) => (
                <BalanceExchangeRow
                  key={`${row.hash}-${row.timestamp}-${row.delta}`}
                  title={
                    <>
                      {row.delta > 0 ? "+" : ""}
                      {row.delta} credit{Math.abs(row.delta) === 1 ? "" : "s"}
                    </>
                  }
                  detail={row.label}
                  timestamp={row.timestamp}
                  hash={row.hash}
                  onViewProof={onViewProof}
                />
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 font-bold">Credit Activity</p>
          <BalanceCreditChart points={creditBalanceSeries} />
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <p className="text-lg font-bold">Actions Exchanged</p>
        <div className="mx-auto w-full sm:w-3/4">
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-surface-300-700">
                <td className="py-1.5 pr-2">Actions received</td>
                <td className="py-1.5 text-right font-semibold">
                  {assetSummary.received}
                </td>
              </tr>
              <tr className="border-b border-surface-300-700">
                <td className="py-1.5 pr-2">Actions sent</td>
                <td className="py-1.5 text-right font-semibold">
                  {assetSummary.sent}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 text-lg font-semibold">
                  Total exchanges
                </td>
                <td className="py-1.5 text-right text-3xl font-bold">
                  {assetSummary.totalExchanges}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <p className="mb-2 font-bold">Actions Received</p>
          {!assetsReceived.length ? (
            <p className="opacity-60">None yet.</p>
          ) : (
            <ul className="grid list-none gap-0 rounded-md border border-surface-300-700 bg-surface-100-900/30 px-3 py-1">
              {assetsReceived.map((row) => (
                <BalanceExchangeRow
                  key={`received-${row.hash}-${row.timestamp}-${row.gesture}`}
                  title={
                    <ActivityTerm>{displayItem(row.gesture)}</ActivityTerm>
                  }
                  detail={
                    <>
                      from{" "}
                      <ActivityName
                        name={row.counterparty}
                        currentUser={user?.username ?? ""}
                        characterDisplayContext={characterDisplayContext}
                        eventTimestamp={row.timestamp}
                      />
                    </>
                  }
                  timestamp={row.timestamp}
                  hash={row.hash}
                  onViewProof={onViewProof}
                />
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 font-bold">Actions Sent</p>
          {!assetsSent.length ? (
            <p className="opacity-60">None yet.</p>
          ) : (
            <ul className="grid list-none gap-0 rounded-md border border-surface-300-700 bg-surface-100-900/30 px-3 py-1">
              {assetsSent.map((row) => (
                <BalanceExchangeRow
                  key={`sent-${row.hash}-${row.timestamp}-${row.gesture}`}
                  title={
                    <ActivityTerm>{displayItem(row.gesture)}</ActivityTerm>
                  }
                  detail={
                    <>
                      to{" "}
                      <ActivityName
                        name={row.counterparty}
                        currentUser={user?.username ?? ""}
                        characterDisplayContext={characterDisplayContext}
                        eventTimestamp={row.timestamp}
                      />
                    </>
                  }
                  timestamp={row.timestamp}
                  hash={row.hash}
                  onViewProof={onViewProof}
                />
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 font-bold">Action Activity</p>
          <BalanceAssetActivityChart points={assetActivitySeries} />
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <p className="text-lg font-bold">Cash Reserves</p>
        <p className="text-sm opacity-80">
          Optional cash exchanged through offers is recorded here as a
          supporting reserve signal. Credits are not money and no financial
          value is implied.
        </p>
        <div className="mx-auto w-full sm:w-3/4">
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-surface-300-700">
                <td className="py-1.5 pr-2">Cash received</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">
                  {formatCashReserve(cashReceivedTotal)}
                </td>
              </tr>
              <tr className="border-b border-surface-300-700">
                <td className="py-1.5 pr-2">Cash sent</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">
                  {formatCashReserve(cashSentTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid gap-4">
          <div>
            <p className="mb-2 font-bold">Cash received</p>
            {!cashReceivedRows.length ? (
              <p className="opacity-60">None yet.</p>
            ) : (
              <ul className="grid list-none gap-0 rounded-md border border-surface-300-700 bg-surface-100-900/30 px-3 py-1">
                {cashReceivedRows.map((row) => (
                  <BalanceExchangeRow
                    key={`cash-received-${row.hash}-${row.timestamp}-${row.amount}`}
                    title={formatCashReserve(row.amount)}
                    detail={
                      <>
                        from{" "}
                        <ActivityName
                          name={row.counterparty}
                          currentUser={user?.username ?? ""}
                          characterDisplayContext={characterDisplayContext}
                          eventTimestamp={row.timestamp}
                        />
                        {row.context ? (
                          <>
                            {" "}
                            · for{" "}
                            <ActivityTerm>
                              {displayItem(row.context)}
                            </ActivityTerm>
                          </>
                        ) : null}
                      </>
                    }
                    timestamp={row.timestamp}
                    hash={row.hash}
                    onViewProof={onViewProof}
                  />
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 font-bold">Cash sent</p>
            {!cashSentRows.length ? (
              <p className="opacity-60">None yet.</p>
            ) : (
              <ul className="grid list-none gap-0 rounded-md border border-surface-300-700 bg-surface-100-900/30 px-3 py-1">
                {cashSentRows.map((row) => (
                  <BalanceExchangeRow
                    key={`cash-sent-${row.hash}-${row.timestamp}-${row.amount}`}
                    title={formatCashReserve(row.amount)}
                    detail={
                      <>
                        to{" "}
                        <ActivityName
                          name={row.counterparty}
                          currentUser={user?.username ?? ""}
                          characterDisplayContext={characterDisplayContext}
                          eventTimestamp={row.timestamp}
                        />
                        {row.context ? (
                          <>
                            {" "}
                            · for{" "}
                            <ActivityTerm>
                              {displayItem(row.context)}
                            </ActivityTerm>
                          </>
                        ) : null}
                      </>
                    }
                    timestamp={row.timestamp}
                    hash={row.hash}
                    onViewProof={onViewProof}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <p className="text-lg font-bold">Support</p>
        <p className="text-sm opacity-80">
          Help and support signals you have sent. The same receipts also appear
          in Activity.
        </p>
        <div className="grid gap-4">
          <div>
            <p className="mb-2 font-bold">Help sent</p>
            {!helpSent.length ? (
              <p className="opacity-60">None yet.</p>
            ) : (
              <ul className="grid list-none gap-0 rounded-md border border-surface-300-700 bg-surface-100-900/30 px-3 py-1">
                {helpSent.map((entry) => (
                  <BalanceExchangeRow
                    key={`help-sent-${entry.id}`}
                    title={helpReceiptIndexTitle(entry)}
                    timestamp={entry.timestamp}
                    hash={entry.eventHash}
                    onViewProof={onViewProof}
                  />
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 font-bold">Help received</p>
            {!helpReceived.length ? (
              <p className="opacity-60">None yet.</p>
            ) : (
              <ul className="grid list-none gap-0 rounded-md border border-surface-300-700 bg-surface-100-900/30 px-3 py-1">
                {helpReceived.map((entry) => (
                  <BalanceExchangeRow
                    key={`help-received-${entry.id}`}
                    title={helpReceiptIndexTitle(entry)}
                    timestamp={entry.timestamp}
                    hash={entry.eventHash}
                    onViewProof={onViewProof}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <ContributionPatternSection audit={audit} helpReceipts={helpReceipts} />
    </div>
  );
}

type OfferFormStep = "friend" | "give" | "receive";

type RulesGameCard = {
  id: string;
  lead?: string;
  anchor: string;
};

/** Outer page rhythm — header, controls, footer (aligns with logo edge). */
const WORKHOUSE_PAGE_GUTTER = "px-1";

/** Deeper reading margin — carousel slide text only. */
const WORKHOUSE_CAROUSEL_GUTTER = "px-3 sm:px-4";

const RULES_SECTION_TITLE_CLASS = "text-xl font-bold leading-tight";

const RULES_OF_THE_GAME_CARDS: RulesGameCard[] = [
  { id: "game", lead: "This is a", anchor: "GAME" },
  { id: "choose", lead: "Choose how to", anchor: "PLAY" },
  { id: "character", lead: "Create a", anchor: "CHARACTER" },
  { id: "friend", lead: "Find a", anchor: "FRIEND" },
  { id: "deal", lead: "Make an", anchor: "OFFER" },
  { id: "yes", lead: "You can say", anchor: "YES" },
  { id: "no", lead: "You can say", anchor: "NO" },
  { id: "bargain", lead: "You can", anchor: "BARGAIN" },
  { id: "give", lead: "Free to", anchor: "GIVE" },
  { id: "take", lead: "Never free to", anchor: "TAKE" },
  { id: "consequence", lead: "Choice has", anchor: "CONSEQUENCE" },
  { id: "receipts", lead: "The system keeps", anchor: "RECEIPTS" },
];

function RulesCardStatement({ lead, anchor }: RulesGameCard) {
  return (
    <div className="rules-carousel-statement flex min-h-[130px] flex-col gap-1 py-3 text-left">
      {lead ? (
        <p className="rules-carousel-lead whitespace-pre-wrap">{lead}</p>
      ) : null}
      <p className="rules-carousel-anchor">{anchor}</p>
    </div>
  );
}

function RulesOfTheGameDeck({
  cards,
  onDone,
}: {
  cards: RulesGameCard[];
  onDone: () => void;
}) {
  return (
    <div className="grid gap-4 w-full min-w-0 max-w-full overflow-hidden">
      {/*
        The Skeleton/Zag-js carousel renders all slides side-by-side with scroll-snap.
        A position:relative overflow:hidden wrapper clips the slide track to the
        landing-page content width. This wrapper's width is inherited from the
        grid parent (max-w-md), preventing horizontal page overflow.
      */}
      <div className="relative min-h-[160px] w-full min-w-0 max-w-full overflow-hidden">
        <Carousel
          slideCount={cards.length}
          slidesPerPage={1}
          slidesPerMove={1}
          loop
          className="workhouse-carousel-root w-full min-w-0 max-w-full"
          style={{ width: "100%", flexShrink: 1 }}
        >
          <Carousel.ItemGroup className="w-full min-w-0 max-w-full overflow-hidden">
            {cards.map((card) => (
              <Carousel.Item
                key={card.id}
                index={cards.indexOf(card)}
                className="min-w-0 max-w-full"
              >
                <div className="card preset-tonal-surface flex min-h-[130px] max-h-[160px] items-center py-2 w-full min-w-0 max-w-full overflow-hidden">
                  <div className={`w-full ${WORKHOUSE_CAROUSEL_GUTTER}`}>
                    <RulesCardStatement {...card} />
                  </div>
                </div>
              </Carousel.Item>
            ))}
          </Carousel.ItemGroup>

          <Carousel.Control>
            <div
              className={`mt-2 grid grid-cols-2 gap-3 ${WORKHOUSE_PAGE_GUTTER}`}
            >
              <Carousel.PrevTrigger
                type="button"
                aria-label="Previous card"
                className="btn preset-outlined-surface-300-700 w-full"
              >
                <ChevronLeftIcon
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>Previous</span>
              </Carousel.PrevTrigger>
              <Carousel.NextTrigger
                type="button"
                aria-label="Next card"
                className="btn preset-outlined-surface-300-700 w-full"
              >
                <span>Next</span>
                <ChevronRightIcon
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
              </Carousel.NextTrigger>
            </div>
          </Carousel.Control>

          <Carousel.IndicatorGroup>
            <div
              className={`flex items-center justify-end gap-2 ${WORKHOUSE_PAGE_GUTTER}`}
            >
              {cards.map((_card, i) => (
                <Carousel.Indicator key={i} index={i} />
              ))}
            </div>
          </Carousel.IndicatorGroup>
        </Carousel>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="btn preset-filled-primary-500 mt-8 w-full"
      >
        START GAME
      </button>

      <div className="mt-8 flex flex-col items-center gap-3 pb-8">
        <img
          src="/images/qr-code.png"
          alt="QR code to join this shared experience"
          width={200}
          height={200}
          className="w-[180px] max-w-full sm:w-[200px]"
        />
        <p className="text-center text-xs leading-relaxed opacity-60">
          Scan to join this shared experience on another device.
        </p>
      </div>
    </div>
  );
}

function WorkhouseInfoSection({ className }: { className?: string }) {
  return (
    <section
      className={`py-8 ${WORKHOUSE_PAGE_GUTTER}${className ? ` ${className}` : ""}`}
    >
      <div className="mx-auto max-w-sm space-y-8 text-sm">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">What is this?</h2>
          <p className="leading-relaxed opacity-80">
            This is an early-stage concept of evidence-based exchange.{"\n"}
            {"\n"}
            When two people agree that something has happened, a shared receipt
            is created. Those receipts allow people to exchange value with
            confidence, without relying on any organisation or authority to own
            or control the relationship.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold">Your data stays yours</h2>
          <p className="leading-relaxed opacity-80">
            The receipts you create will be stored on your own device, not in a
            central database. Only you decide when to share them. They are
            protected using modern cryptography, so only someone with the
            correct keys can reveal their contents.{"\n"}
            {"\n"}
            We call this sovereign data, where information remains under your
            control.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold">
            Built around people, not platforms
          </h2>
          <p className="leading-relaxed opacity-80">
            Technology should help people cooperate without asking them to
            surrender ownership of their identity, their relationships or their
            data.{"\n"}
            {"\n"}
            This is not decentralisation, but localisation.
          </p>
        </div>
      </div>
    </section>
  );
}

function WorkhouseAttributionFooter({ className }: { className?: string }) {
  return (
    <footer
      className={`mt-auto border-t border-surface-300-700 pt-8 ${WORKHOUSE_PAGE_GUTTER}${className ? ` ${className}` : ""}`}
    >
      <div className="grid gap-1.5 text-xs leading-relaxed opacity-70">
        <p className="font-semibold">Demonstration project</p>
        <p>Dark Olive CIC · inQbeta</p>
        <p className="opacity-80">Designed by Darren Knipe</p>
        <p>
          <a
            href="https://github.com/darkolive/inQbeta"
            className="underline underline-offset-2 opacity-80 hover:opacity-100"
            rel="noopener noreferrer"
            target="_blank"
          >
            inQbeta on GitHub
          </a>
        </p>
        <p className="opacity-60">Demonstration use only</p>
      </div>
    </footer>
  );
}

export default function WorkhousePage() {
  const [username, setUsername] = useState("");
  const [loginInput, setLoginInput] = useState("");
  const [enteredGame, setEnteredGame] = useState(false);
  const [state, setState] = useState<WorkhouseState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [offerFormStep, setOfferFormStep] = useState<OfferFormStep>("friend");
  const [transientTerminalCards, setTransientTerminalCards] = useState<
    TransientTerminalCard[]
  >([]);
  const [incomingPage, setIncomingPage] = useState(1);
  const [outgoingPage, setOutgoingPage] = useState(1);
  const [evidencePage, setEvidencePage] = useState(1);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityOpen, setActivityOpen] = useState(
    ACTIVITY_ACCORDION_DEFAULT_OPEN,
  );
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [globeOpen, setGlobeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [stayInTouchDialogOpen, setStayInTouchDialogOpen] = useState(false);
  const [reportIssueDialogOpen, setReportIssueDialogOpen] = useState(false);
  const [reviewExperienceDialogOpen, setReviewExperienceDialogOpen] =
    useState(false);
  const [helpActivityTick, setHelpActivityTick] = useState(0);
  const [resetError, setResetError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const incomingRef = useRef<HTMLElement>(null);
  const activityRef = useRef<HTMLDivElement | null>(null);
  const scrollActivityOnPageChangeRef = useRef(false);
  const prevActiveOffersRef = useRef<Map<string, ActiveOfferSnapshot>>(
    new Map(),
  );

  const [toUser, setToUser] = useState("");
  const [giveType, setGiveType] = useState<ExchangeValueType | null>(null);
  const [giveCreditAmount, setGiveCreditAmount] = useState("");
  const [giveAsset, setGiveAsset] = useState("");
  const [giveMoneyAmount, setGiveMoneyAmount] = useState("");
  const [returnType, setReturnType] = useState<ExchangeValueType | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [returnAsset, setReturnAsset] = useState("");
  const [moneyAmount, setMoneyAmount] = useState("");

  const [counteringId, setCounteringId] = useState<string | null>(null);
  const [counterOfferValue, setCounterOfferValue] = useState("");
  const [counterReturnType, setCounterReturnType] =
    useState<ExchangeValueType>("credits");
  const [counterCreditAmount, setCounterCreditAmount] = useState(2);
  const [counterMoneyAmount, setCounterMoneyAmount] = useState("");

  const resumeStartedRef = useRef(false);

  const refresh = useCallback(async () => {
    const next = await fetchState();
    setState(next);
    setUsername(next.user.username);
  }, []);

  const helpReceipts = useMemo(() => {
    if (!username) return [];
    return helpReceiptsForUser(
      loadHelpSignals(),
      username,
      state?.user.characterId,
    );
  }, [username, state?.user.characterId, helpActivityTick]);

  const mergedAudit = useMemo(() => {
    const serverAudit = state?.audit ?? [];
    if (!username) return serverAudit;
    return mergeActivityWithHelpReceipts(serverAudit, helpReceipts);
  }, [state?.audit, username, helpReceipts]);

  const previousFriends = useMemo(
    () => derivePreviousFriends(username, state),
    [username, state],
  );

  const activeParticipantNames = useMemo(() => {
    const context =
      state?.characterDisplayContext ?? emptyCharacterDisplayContext();
    const names = [
      ...participantNamesFromAudit(state?.communityParticipationAudit ?? []),
      ...participantNamesFromAudit(state?.audit ?? []),
      ...previousFriends,
    ];
    return activeParticipantCanonicalNames(context, names);
  }, [
    state?.characterDisplayContext,
    state?.communityParticipationAudit,
    state?.audit,
    previousFriends,
  ]);

  const friendSearch = useMemo(
    () =>
      resolveFriendSearch(
        toUser,
        username,
        state?.characterDisplayContext ?? emptyCharacterDisplayContext(),
        activeParticipantNames,
      ),
    [toUser, username, state?.characterDisplayContext, activeParticipantNames],
  );

  const canContinueToOffer = canContinueFriendSearch(friendSearch);

  const offerGiveSummary = useMemo(() => {
    if (!giveType) return "";
    return giveTermsText({
      giveType,
      giveCreditAmount:
        giveType === "credits" && giveCreditAmount !== ""
          ? Number(giveCreditAmount)
          : undefined,
      giveMoneyAmount:
        giveType === "money" && giveMoneyAmount !== ""
          ? Number(giveMoneyAmount)
          : undefined,
      gesture: giveType === "asset" ? giveAsset : undefined,
      returnType: "asset",
    });
  }, [giveType, giveCreditAmount, giveMoneyAmount, giveAsset]);

  const handleLocalSessionEnded = useCallback(() => {
    clearUsername();
    setUsername("");
    setState(null);
    setLoginInput("");
    setToUser("");
    setGiveType(null);
    setGiveCreditAmount("");
    setGiveAsset("");
    setGiveMoneyAmount("");
    setReturnType(null);
    setCreditAmount("");
    setReturnAsset("");
    setMoneyAmount("");
    setCounteringId(null);
    setEvidencePage(1);
    setIncomingPage(1);
    setOutgoingPage(1);
    setBalanceOpen(false);
    setGlobeOpen(false);
    setMenuOpen(false);
    setOfferFormOpen(false);
    setStayInTouchDialogOpen(false);
    setReportIssueDialogOpen(false);
    setReviewExperienceDialogOpen(false);
    setTransientTerminalCards([]);
    prevActiveOffersRef.current = new Map();
    scrollWorkhouseTop();
  }, []);

  const handleSessionEnded = useCallback((message: string) => {
    clearSession();
    setEnteredGame(false);
    setUsername("");
    setState(null);
    setLoginInput("");
    setToUser("");
    setGiveType(null);
    setGiveCreditAmount("");
    setGiveAsset("");
    setGiveMoneyAmount("");
    setReturnType(null);
    setCreditAmount("");
    setReturnAsset("");
    setMoneyAmount("");
    setCounteringId(null);
    setEvidencePage(1);
    setIncomingPage(1);
    setOutgoingPage(1);
    setBalanceOpen(false);
    setGlobeOpen(false);
    setMenuOpen(false);
    setOfferFormOpen(false);
    setStayInTouchDialogOpen(false);
    setReportIssueDialogOpen(false);
    setReviewExperienceDialogOpen(false);
    setTransientTerminalCards([]);
    prevActiveOffersRef.current = new Map();
    setError(message);
    scrollWorkhouseTop();
  }, []);

  useEffect(() => {
    if (resumeStartedRef.current) return;
    resumeStartedRef.current = true;
    const stored = loadStoredUsername();
    if (stored) {
      setLoginInput(stored);
    }
    fetchState()
      .then((next) => {
        setUsername(next.user.username);
        setState(next);
        saveSession(next.user.username);
      })
      .catch(() => {
        // 401 on initial load means no session - clear any stale client-side state
        clearSession();
        setUsername("");
        setState(null);
        setLoginInput("");
        setEnteredGame(false);
      });
  }, []);

  useEffect(() => {
    const refreshHelpActivity = () => {
      setHelpActivityTick((tick) => tick + 1);
    };
    window.addEventListener(HELP_SIGNALS_UPDATED_EVENT, refreshHelpActivity);
    return () =>
      window.removeEventListener(
        HELP_SIGNALS_UPDATED_EVENT,
        refreshHelpActivity,
      );
  }, []);

  useEffect(() => {
    if (!username) return;
    const id = window.setInterval(() => {
      refresh().catch((err) => {
        if (err instanceof WorkhouseApiError) {
          if (err.code === "identity_reset") {
            handleSessionEnded(WorkhouseMessages.identityReset);
          } else if (
            err.code === "session_not_bound" ||
            err.code === "unauthenticated"
          ) {
            handleLocalSessionEnded();
          }
        }
      });
    }, 2500);
    return () => window.clearInterval(id);
  }, [username, refresh, handleSessionEnded, handleLocalSessionEnded]);

  useEffect(() => {
    if (!state || !username) return;

    const currentActive = new Map<string, ActiveOfferSnapshot>();
    for (const offer of state.outgoingOffers) {
      currentActive.set(offer.id, { offer, bucket: "outgoing" });
    }
    for (const offer of state.counteredOffers) {
      currentActive.set(offer.id, { offer, bucket: "countered" });
    }
    for (const offer of state.incomingOffers) {
      currentActive.set(offer.id, { offer, bucket: "incoming" });
    }

    const prev = prevActiveOffersRef.current;
    const key = username.toLowerCase();

    for (const [id, snap] of prev) {
      if (currentActive.has(id)) continue;

      const auditEntry = [...state.audit]
        .reverse()
        .find(
          (entry) =>
            entry.offerId === id &&
            (entry.kind === "reject" || entry.kind === "complete"),
        );
      if (!auditEntry) continue;

      if (
        auditEntry.kind === "reject" &&
        snap.offer.from.toLowerCase() === key
      ) {
        addTransientTerminal(setTransientTerminalCards, {
          offer: {
            ...snap.offer,
            status: "rejected",
            rejectionMessage: "Sorry, no thanks.",
          },
          side: "outgoing",
          terminal: "rejected",
        });
        setOfferFormOpen(false);
      } else if (auditEntry.kind === "complete") {
        const side = snap.bucket === "incoming" ? "incoming" : "outgoing";
        addTransientTerminal(setTransientTerminalCards, {
          offer: { ...snap.offer, status: "completed" },
          side,
          terminal: "completed",
        });
        setOfferFormOpen(false);
      }
    }

    prevActiveOffersRef.current = currentActive;
  }, [state, username]);

  const exchangeByOfferId = useMemo(() => {
    const map = new Map<string, WorkhouseExchange>();
    state?.activeExchanges.forEach((exchange) =>
      map.set(exchange.offerId, exchange),
    );
    return map;
  }, [state]);

  const transientOutgoingCards = useMemo(
    () => transientTerminalCards.filter((card) => card.side === "outgoing"),
    [transientTerminalCards],
  );

  const transientIncomingCards = useMemo(
    () => transientTerminalCards.filter((card) => card.side === "incoming"),
    [transientTerminalCards],
  );

  const outgoingCardItems = useMemo((): OutgoingCardItem[] => {
    const items: OutgoingCardItem[] = [];
    for (const offer of state?.outgoingOffers ?? []) {
      items.push({ kind: "outgoing", offer });
    }
    for (const offer of state?.counteredOffers ?? []) {
      items.push({ kind: "countered", offer });
    }
    for (const card of transientOutgoingCards) {
      if (card.terminal === "rejected") {
        items.push({ kind: "rejected", offer: card.offer });
      } else {
        items.push({ kind: "outgoing", offer: card.offer });
      }
    }
    return items;
  }, [state?.outgoingOffers, state?.counteredOffers, transientOutgoingCards]);

  const visibleIncomingOffers = useMemo(() => {
    const offers = [...(state?.incomingOffers ?? [])];
    for (const card of transientIncomingCards) {
      offers.push(card.offer);
    }
    return offers;
  }, [state?.incomingOffers, transientIncomingCards]);

  const incomingPageCount = Math.max(1, visibleIncomingOffers.length);
  const safeIncomingPage = Math.max(
    1,
    Math.min(incomingPage, incomingPageCount),
  );
  const currentIncomingOffer = visibleIncomingOffers[safeIncomingPage - 1];

  const outgoingPageCount = Math.max(1, outgoingCardItems.length);
  const safeOutgoingPage = Math.max(
    1,
    Math.min(outgoingPage, outgoingPageCount),
  );
  const currentOutgoingCard = outgoingCardItems[safeOutgoingPage - 1];

  const hasOutgoing = outgoingCardItems.length > 0;
  const hasIncoming = visibleIncomingOffers.length > 0;

  const counterSetters = {
    setCounteringId,
    setCounterOfferValue,
    setCounterReturnType,
    setCounterCreditAmount,
    setCounterMoneyAmount,
  };

  const handleEvidencePageChange = useCallback((page: number) => {
    scrollActivityOnPageChangeRef.current = true;
    setEvidencePage(page);
  }, []);

  const handleViewProof = useCallback((hash: string) => {
    const update = viewProofStateUpdate(hash);
    if (!update) return;
    setBalanceOpen(update.balanceOpen);
    setGlobeOpen(false);
    setMenuOpen(false);
    setActivitySearch(update.activitySearch);
    setActivityOpen(update.activityOpen);
    window.requestAnimationFrame(() => {
      activityRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, []);

  useEffect(() => {
    if (!scrollActivityOnPageChangeRef.current) return;
    scrollActivityOnPageChangeRef.current = false;
    window.requestAnimationFrame(() => {
      activityRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [evidencePage]);

  // Reset activity page to 1 when search changes
  useEffect(() => {
    setEvidencePage(1);
  }, [activitySearch]);

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError("");
    try {
      const result = await fn();
      await refresh();
      scrollWorkhouseTop();
      return result;
    } catch (e) {
      if (e instanceof WorkhouseApiError) {
        setError(messageForWorkhouseApiError(e.code, e.message));
      } else {
        setError(
          e instanceof Error ? e.message : WorkhouseMessages.somethingWentWrong,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const dismissTransient = useCallback((id: string) => {
    setTransientTerminalCards((current) =>
      current.filter((card) => card.offer.id !== id),
    );
  }, []);

  function closeOfferForm() {
    resetOfferForm();
    setOfferFormStep("friend");
    setOfferFormOpen(false);
  }

  function openOfferForm() {
    setOfferFormStep("friend");
    setOfferFormOpen(true);
  }

  function continueFromOfferGiveStep() {
    setError("");
    const commitment = creditContextFromState(state?.user, state);
    const validationError = resolveOfferGiveStepError({
      giveType,
      giveCreditAmount:
        (
          document.getElementById(
            "offer-give-credit-amount",
          ) as HTMLInputElement | null
        )?.value ?? giveCreditAmount,
      giveMoneyAmount:
        (
          document.getElementById(
            "offer-give-money-amount",
          ) as HTMLInputElement | null
        )?.value ?? giveMoneyAmount,
      giveAsset,
      availableCredits: commitment.available,
      creditBalance: commitment.balance,
      committedCredits: commitment.committed,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setOfferFormStep("receive");
  }

  function submitOfferForm() {
    const commitment = creditContextFromState(state?.user, state);
    const validationError = resolveOfferFormSubmitError({
      giveType,
      giveCreditAmount,
      giveMoneyAmount,
      returnType,
      creditAmount,
      moneyAmount,
      availableCredits: commitment.available,
      creditBalance: commitment.balance,
      committedCredits: commitment.committed,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    run(() =>
      createOffer({
        from: username,
        to: toUser,
        giveType,
        giveCreditAmount:
          giveType === "credits" && giveCreditAmount !== ""
            ? Number(giveCreditAmount)
            : undefined,
        giveAsset: giveType === "asset" ? giveAsset : undefined,
        giveMoneyAmount:
          giveType === "money" && giveMoneyAmount !== ""
            ? Number(giveMoneyAmount)
            : undefined,
        returnType,
        creditAmount:
          returnType === "credits" && creditAmount !== ""
            ? Number(creditAmount)
            : undefined,
        returnAsset: returnType === "asset" ? returnAsset : undefined,
        moneyAmount:
          returnType === "money" && moneyAmount !== ""
            ? Number(moneyAmount)
            : undefined,
      }),
    ).then((res) => {
      if (res?.offer) closeOfferForm();
    });
  }

  function noteCompletedExchange(offer: WorkhouseOffer) {
    const side =
      offer.from.toLowerCase() === username.toLowerCase()
        ? "outgoing"
        : "incoming";
    addTransientTerminal(setTransientTerminalCards, {
      offer: { ...offer, status: "completed" },
      side,
      terminal: "completed",
    });
    closeOfferForm();
  }

  function openBalanceDrawer(open: boolean) {
    setBalanceOpen(open);
    if (open) {
      setGlobeOpen(false);
      setMenuOpen(false);
    }
  }

  function openGlobeDrawer(open: boolean) {
    setGlobeOpen(open);
    if (open) {
      setBalanceOpen(false);
      setMenuOpen(false);
    }
  }

  function openMenuDrawer(open: boolean) {
    setMenuOpen(open);
    if (open) {
      setBalanceOpen(false);
      setGlobeOpen(false);
    }
  }

  function toggleBalance() {
    openBalanceDrawer(!balanceOpen);
  }

  function toggleGlobe() {
    openGlobeDrawer(!globeOpen);
  }

  function toggleMenu() {
    openMenuDrawer(!menuOpen);
  }

  function resetOfferForm() {
    setToUser("");
    setGiveType(null);
    setGiveCreditAmount("");
    setGiveAsset("");
    setGiveMoneyAmount("");
    setReturnType(null);
    setCreditAmount("");
    setReturnAsset("");
    setMoneyAmount("");
  }

  function handleGiveTypeChange(type: ExchangeValueType) {
    setGiveType(type);
    if (returnType && !allowedReturnTypesForGive(type).includes(returnType)) {
      clearReturnSelection(
        setReturnType,
        setCreditAmount,
        setReturnAsset,
        setMoneyAmount,
      );
    }
  }

  const allowedMainReturnTypes = giveType
    ? allowedReturnTypesForGive(giveType)
    : null;

  async function handleEnter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(
      new FormData(e.currentTarget).get("username") ?? loginInput,
    ).trim();
    const formError = resolveSessionFormError({ username: name });
    if (formError) {
      setError(formError);
      return;
    }
    if (busy) return;

    setBusy(true);
    setError("");
    try {
      const res = await enterSession(name);
      const joined = res.user.username;
      setUsername(joined);
      setLoginInput("");
      await refresh();
      scrollWorkhouseTop();
    } catch (err) {
      if (err instanceof WorkhouseApiError) {
        setError(messageForWorkhouseApiError(err.code, err.message));
      } else {
        setError(
          err instanceof Error
            ? err.message
            : WorkhouseMessages.joinSessionFailed,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleExportStory() {
    if (!state || exportBusy) return;
    setExportBusy(true);
    setError("");
    try {
      await exportWorkhouseStoryPdf(state);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : WorkhouseMessages.exportStoryFailed,
      );
    } finally {
      setExportBusy(false);
    }
  }

  function handleResetIdentityRequest() {
    if (!username || resetBusy) return;
    setResetError("");
    setMenuOpen(false);
    setResetDialogOpen(true);
  }

  function handleResetDialogOpenChange(open: boolean) {
    if (resetBusy) return;
    setResetDialogOpen(open);
    if (!open) {
      setResetError("");
    }
  }

  async function handleResetIdentityConfirm() {
    if (!username || resetBusy) return;
    setResetBusy(true);
    setResetError("");
    const destroyedCharacterId = state?.user.characterId;
    try {
      const result = await resetDemoIdentity(username);
      if (!result.ok) {
        setResetError(WorkhouseMessages.resetIdentityFailed);
        return;
      }
      clearHelpSignalsForCharacter({
        username,
        characterId: destroyedCharacterId,
      });
      setHelpActivityTick((tick) => tick + 1);
      clearSession();
      clearLoginPrefill();
      setResetDialogOpen(false);
      setEnteredGame(false);
      setUsername("");
      setState(null);
      setError("");
      setLoginInput("");
      setToUser("");
      setGiveType(null);
      setGiveCreditAmount("");
      setGiveAsset("");
      setGiveMoneyAmount("");
      setReturnType(null);
      setCreditAmount("");
      setReturnAsset("");
      setMoneyAmount("");
      setCounteringId(null);
      setEvidencePage(1);
      setIncomingPage(1);
      setOutgoingPage(1);
      setBalanceOpen(false);
      setGlobeOpen(false);
      setMenuOpen(false);
      setOfferFormOpen(false);
      setTransientTerminalCards([]);
      prevActiveOffersRef.current = new Map();
      scrollWorkhouseTop();
    } catch (err) {
      setResetError(
        err instanceof Error
          ? err.message
          : WorkhouseMessages.resetIdentityFailed,
      );
    } finally {
      setResetBusy(false);
    }
  }

  async function handleLeave() {
    if (username) {
      try {
        await leaveSession();
      } catch {
        // Still clear local session; server release is best-effort for demo
      }
    }
    clearUsername();
    setUsername("");
    setState(null);
    setError("");
    setLoginInput("");
    resetOfferForm();
    setCounteringId(null);
    setEvidencePage(1);
    setActivitySearch("");
    setIncomingPage(1);
    setOutgoingPage(1);
    setBalanceOpen(false);
    setGlobeOpen(false);
    setMenuOpen(false);
    setStayInTouchDialogOpen(false);
    setReportIssueDialogOpen(false);
    setReviewExperienceDialogOpen(false);
    setOfferFormOpen(false);
    setTransientTerminalCards([]);
    prevActiveOffersRef.current = new Map();
    scrollWorkhouseTop();
  }

  if (!username) {
    if (!enteredGame) {
      return (
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6 sm:max-w-lg">
          <WorkhouseHeader />

          <div className="mt-2 min-w-0">
            <RulesOfTheGameDeck
              cards={RULES_OF_THE_GAME_CARDS}
              onDone={() => setEnteredGame(true)}
            />
          </div>

          <WorkhouseInfoSection />

          <WorkhouseAttributionFooter className="mt-8" />
        </div>
      );
    }

    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6 sm:max-w-lg">
        <WorkhouseHeader />

        <WorkhouseParticipantHeader />

        <section className={`mt-5 grid gap-5 ${WORKHOUSE_PAGE_GUTTER}`}>
          <p className={RULES_SECTION_TITLE_CLASS}>Who are you going to be</p>

          <form onSubmit={handleEnter} className="grid gap-5">
            <label htmlFor="join-username" className="grid gap-1.5">
              <span className="text-base font-medium">Your character name</span>
              <input
                id="join-username"
                name="username"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="e.g. Fox / Darren / BlueTent"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="go"
                required
                maxLength={32}
                className="input"
              />
            </label>
            <div className="flex items-center gap-2.5 text-sm opacity-90">
              <CoinsIcon
                size={18}
                className="shrink-0 opacity-70"
                aria-hidden
              />
              <p>You receive 5 credits on joining</p>
            </div>
            <div className="grid gap-4 pt-3">
              <button
                type="submit"
                disabled={busy}
                className="btn preset-filled-primary-500 w-full"
              >
                {busy ? "Entering…" : "ENTER GAME"}
              </button>
              <button
                type="button"
                onClick={() => setEnteredGame(false)}
                className="btn preset-tonal w-full"
              >
                CANCEL
              </button>
            </div>
            <p className="text-sm opacity-80">
              Leave any time by leaving the inQbeta Wi-Fi.
            </p>
          </form>

          {error ? (
            <div className="card preset-filled-error-100-900 preset-outlined-error-200-800 px-3 py-2.5">
              {error}
            </div>
          ) : null}
        </section>

        <WorkhouseAttributionFooter />
      </div>
    );
  }

  const user = state?.user;
  const creditCommitment = creditContextFromState(user, state);
  const availableCredits = creditCommitment.available;
  const maxOfferableCredits = Math.max(0, availableCredits);
  const federationData = state?.federationData;
  const audit = state?.audit ?? [];
  const activitySearchActive = activitySearch.trim().length > 0;
  const filteredAudit = filterActivityByProofSearch(
    mergedAudit,
    activitySearch,
  );
  const evidencePageCount = Math.max(
    1,
    Math.ceil(filteredAudit.length / EVIDENCE_PAGE_SIZE),
  );
  const safeEvidencePage = Math.max(
    1,
    Math.min(evidencePage, evidencePageCount),
  );
  const paginatedAudit = filteredAudit.slice(
    (safeEvidencePage - 1) * EVIDENCE_PAGE_SIZE,
    safeEvidencePage * EVIDENCE_PAGE_SIZE,
  );
  const activityEntries = paginatedAudit;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-3 pb-8 sm:max-w-lg">
      <WorkhouseHeader
        onBalanceClick={toggleBalance}
        balanceOpen={balanceOpen}
        onGlobeClick={toggleGlobe}
        globeOpen={globeOpen}
        onMenuClick={toggleMenu}
        menuOpen={menuOpen}
      />

      <WorkhouseParticipantHeader username={username} />

      <BalanceDrawer open={balanceOpen} onOpenChange={openBalanceDrawer}>
        <BalancePanel
          user={user}
          audit={audit}
          helpReceipts={helpReceipts}
          creditCommitment={creditCommitment}
          characterDisplayContext={state?.characterDisplayContext}
          onViewProof={handleViewProof}
        />
      </BalanceDrawer>

      <FederationDataDrawer open={globeOpen} onOpenChange={openGlobeDrawer}>
        <FederationDataPanel data={federationData} />
      </FederationDataDrawer>

      <MenuDrawer open={menuOpen} onOpenChange={openMenuDrawer}>
        <MenuPanel
          exportBusy={exportBusy}
          canExport={Boolean(state)}
          communityParticipationAudit={state?.communityParticipationAudit ?? []}
          onLeaveSession={handleLeave}
          onResetIdentity={handleResetIdentityRequest}
          onExportStory={handleExportStory}
          onStayInTouch={() => {
            setMenuOpen(false);
            setStayInTouchDialogOpen(true);
          }}
          onReportIssue={() => {
            setMenuOpen(false);
            setReportIssueDialogOpen(true);
          }}
          onReviewExperience={() => {
            setMenuOpen(false);
            setReviewExperienceDialogOpen(true);
          }}
        />
      </MenuDrawer>

      <ResetIdentityDialog
        open={resetDialogOpen}
        busy={resetBusy}
        error={resetError}
        onOpenChange={handleResetDialogOpenChange}
        onConfirm={handleResetIdentityConfirm}
      />

      <StayInTouchDialog
        open={stayInTouchDialogOpen}
        onOpenChange={setStayInTouchDialogOpen}
        characterUsername={username}
        characterId={state?.user.characterId}
      />
      <ReportIssueDialog
        open={reportIssueDialogOpen}
        onOpenChange={setReportIssueDialogOpen}
        characterUsername={username}
        characterId={state?.user.characterId}
      />
      <ReviewExperienceDialog
        open={reviewExperienceDialogOpen}
        onOpenChange={setReviewExperienceDialogOpen}
        characterUsername={username}
        characterId={state?.user.characterId}
      />

      {error ? (
        <div className="mt-3">
          <div className="card preset-filled-error-100-900 preset-outlined-error-200-800 px-3 py-2.5">
            {error}
          </div>
        </div>
      ) : null}

      {!offerFormOpen ? (
        <button
          type="button"
          onClick={openOfferForm}
          className="btn preset-filled-primary-500 mt-4 flex w-full items-center justify-center gap-2"
        >
          <PlusIcon className="size-5 shrink-0" aria-hidden />
          {NEW_EXCHANGE_LABEL}
        </button>
      ) : offerFormStep === "friend" ? (
        <section className="card preset-filled-surface-50-950 preset-outlined-surface-200-800 mt-4 p-4 sm:p-5">
          <div className={`grid gap-5 ${WORKHOUSE_PAGE_GUTTER}`}>
            <p className={RULES_SECTION_TITLE_CLASS}>{FIND_FRIEND_PROMPT}</p>
            <label htmlFor="offer-to" className="grid gap-1.5">
              <span className="text-base font-medium">{OFFER_TO_LABEL}</span>
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 opacity-50"
                  aria-hidden
                />
                <input
                  id="offer-to"
                  type="search"
                  value={toUser}
                  onChange={(e) => setToUser(e.target.value)}
                  autoComplete="off"
                  className="input pl-10"
                />
              </div>
            </label>
            {friendSearch.status === "not_found" ||
            friendSearch.status === "self" ? (
              <div className="grid gap-2 py-1" role="status" aria-live="polite">
                <p className="text-base font-medium">
                  {friendNotFoundHeading(friendSearch.queryDisplay)}
                </p>
                <FrownIcon
                  size={28}
                  strokeWidth={1.75}
                  className="opacity-60"
                  aria-hidden
                />
                <p className="text-sm opacity-70">{FRIEND_NOT_FOUND_FOOTER}</p>
              </div>
            ) : null}
            {previousFriends.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {previousFriends.map((friend) => (
                  <button
                    key={friend}
                    type="button"
                    onClick={() => setToUser(friend)}
                    className="badge preset-filled-surface-100-900 preset-outlined-surface-200-800 px-2.5 py-1.5 text-sm font-medium hover:preset-tonal"
                  >
                    {friend}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 pt-1">
              <button
                type="button"
                disabled={!canContinueToOffer}
                onClick={() => {
                  if (!canContinueToOffer) return;
                  setToUser(friendSearch.canonicalName);
                  setOfferFormStep("give");
                }}
                className="btn preset-filled-primary-500 w-full"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={closeOfferForm}
                className="btn preset-tonal w-full"
              >
                Cancel
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 border-t border-surface-200-800/50 pt-6">
              <p className="text-center text-sm opacity-80">
                If your friend hasn't joined yet, let them scan this QR code.
              </p>
              <img
                src="/images/qr-code.png"
                alt="QR code for a friend to join this shared experience"
                className="h-40 w-40 max-w-[200px] sm:h-48 sm:max-w-[200px]"
              />
            </div>
          </div>
        </section>
      ) : offerFormStep === "give" ? (
        <section className="card preset-filled-surface-50-950 preset-outlined-surface-200-800 mt-4 p-4 sm:p-5">
          <div className={`grid gap-5 ${WORKHOUSE_PAGE_GUTTER}`}>
            <p className={RULES_SECTION_TITLE_CLASS}>{OFFER_GIVE_TITLE}</p>
            <p className="text-sm opacity-80">
              To{" "}
              <span className={WORKHOUSE_SEMANTIC_CLASS.character}>
                {toUser}
              </span>
            </p>
            <div className="grid gap-3">
              <ExchangeTypeSelector
                value={giveType}
                onChange={handleGiveTypeChange}
                ariaLabel="What you offer"
              />
              {giveType === "credits" ? (
                <label
                  htmlFor="offer-give-credit-amount"
                  className="grid gap-1.5"
                >
                  Amount
                  <input
                    id="offer-give-credit-amount"
                    type="number"
                    min={1}
                    max={maxOfferableCredits || undefined}
                    value={giveCreditAmount}
                    onChange={(e) => setGiveCreditAmount(e.target.value)}
                    className="input w-20"
                  />
                </label>
              ) : null}
              {giveType === "asset" ? (
                <label htmlFor="offer-give-asset" className="grid gap-1.5">
                  Action
                  <input
                    id="offer-give-asset"
                    value={giveAsset}
                    onChange={(e) => setGiveAsset(e.target.value)}
                    placeholder="e.g. Help carry chairs"
                    className="input"
                  />
                </label>
              ) : null}
              {giveType === "money" ? (
                <label
                  htmlFor="offer-give-money-amount"
                  className="grid gap-1.5"
                >
                  Amount
                  <div className="flex items-center gap-2">
                    <span>£</span>
                    <input
                      id="offer-give-money-amount"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={giveMoneyAmount}
                      onChange={(e) => setGiveMoneyAmount(e.target.value)}
                      className="input"
                    />
                  </div>
                </label>
              ) : null}
            </div>
            <div className="grid gap-3 pt-1">
              <button
                type="button"
                onClick={continueFromOfferGiveStep}
                className="btn preset-filled-primary-500 w-full"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setOfferFormStep("friend")}
                className="btn preset-tonal w-full"
              >
                Back
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="card preset-filled-surface-50-950 preset-outlined-surface-200-800 mt-4 p-4 sm:p-5">
          <div className={`grid gap-5 ${WORKHOUSE_PAGE_GUTTER}`}>
            <p className={RULES_SECTION_TITLE_CLASS}>{OFFER_RECEIVE_TITLE}</p>
            {offerGiveSummary ? (
              <div className="grid gap-1">
                <p className="text-xs font-bold tracking-wide opacity-70">
                  {OFFER_GIVE_SUMMARY_LABEL}
                </p>
                <p className="text-base font-semibold">{offerGiveSummary}</p>
              </div>
            ) : null}
            <div className="grid gap-3">
              <ExchangeTypeSelector
                value={returnType}
                onChange={setReturnType}
                allowedTypes={allowedMainReturnTypes ?? undefined}
                ariaLabel="What you want in exchange"
              />
              {returnType === "credits" ? (
                <label htmlFor="offer-credit-amount" className="grid gap-1.5">
                  Amount
                  <input
                    id="offer-credit-amount"
                    type="number"
                    min={1}
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="input w-20"
                  />
                </label>
              ) : null}
              {returnType === "asset" ? (
                <label htmlFor="offer-return-asset" className="grid gap-1.5">
                  Action
                  <input
                    id="offer-return-asset"
                    value={returnAsset}
                    onChange={(e) => setReturnAsset(e.target.value)}
                    placeholder="e.g. Make tea"
                    className="input"
                  />
                </label>
              ) : null}
              {returnType === "money" ? (
                <label htmlFor="offer-money-amount" className="grid gap-1.5">
                  Amount
                  <div className="flex items-center gap-2">
                    <span>£</span>
                    <input
                      id="offer-money-amount"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={moneyAmount}
                      onChange={(e) => setMoneyAmount(e.target.value)}
                      className="input"
                    />
                  </div>
                </label>
              ) : null}
            </div>
            <div className="grid gap-3 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={submitOfferForm}
                className="btn preset-filled-primary-500 w-full"
              >
                {LETS_EXCHANGE_LABEL}
              </button>
              <button
                type="button"
                onClick={() => setOfferFormStep("give")}
                className="btn preset-tonal w-full"
              >
                Back
              </button>
              <button
                type="button"
                onClick={closeOfferForm}
                className="btn preset-outlined-surface-200-800 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {hasOutgoing ? (
        <section className="card preset-filled-surface-50-950 preset-outlined-surface-200-800 mt-4 grid gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold">OFFERS SENT</p>
            <span className="badge badge-icon preset-filled-primary-500">
              {outgoingCardItems.length}
            </span>
          </div>

          {currentOutgoingCard
            ? (() => {
                if (currentOutgoingCard.kind === "countered") {
                  const offer = currentOutgoingCard.offer;
                  return (
                    <div
                      key={offer.id}
                      className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 grid gap-3 p-3 sm:p-4"
                    >
                      <CompactCardSteps phase="outgoing-countered" />
                      <OutgoingOfferSentence
                        offer={offer}
                        currentUser={username}
                      />
                      <CounterofferSentence
                        offer={offer}
                        currentUser={username}
                        perspective="sender"
                      />
                      <div className="btn-group flex w-full flex-col sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(() => acceptCounterOffer(offer.id, username))
                          }
                          className="btn preset-filled-primary-500 w-full sm:w-auto"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(() => rejectOffer(offer.id, username))
                          }
                          className="btn preset-filled-error-500 w-full sm:w-auto"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                }

                if (currentOutgoingCard.kind === "rejected") {
                  const offer = currentOutgoingCard.offer;
                  return (
                    <div
                      key={offer.id}
                      className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 grid gap-3 p-3 sm:p-4"
                    >
                      <AutoDismissEffect
                        offerId={offer.id}
                        onDismiss={dismissTransient}
                      />
                      <CompactCardSteps phase="outgoing-rejected" />
                      <OutgoingOfferSentence
                        offer={offer}
                        currentUser={username}
                      />
                      <p className={WORKHOUSE_SEMANTIC_CLASS.warning}>
                        {offer.rejectionMessage ?? "Sorry, no thanks."}
                      </p>
                    </div>
                  );
                }

                const offer = currentOutgoingCard.offer;
                const exchange = exchangeByOfferId.get(offer.id);

                if (offer.status === "accepted" && exchange) {
                  return (
                    <div
                      key={offer.id}
                      className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 grid gap-3 p-3 sm:p-4"
                    >
                      <CompactCardSteps phase="outgoing-accepted" />
                      <OutgoingOfferSentence
                        offer={offer}
                        currentUser={username}
                      />
                      <p>
                        {offer.acceptedViaCounter ? (
                          <>
                            You accepted{" "}
                            <ActivityName
                              name={offer.to}
                              currentUser={username}
                            />
                            &apos;s counteroffer of{" "}
                            <ActivityTerm>{giveTermsText(offer)}</ActivityTerm>{" "}
                            in exchange for{" "}
                            <ActivityTerm>
                              {counterofferReturnText(offer)}
                            </ActivityTerm>
                            .
                          </>
                        ) : (
                          <>
                            <ActivityName
                              name={offer.to}
                              currentUser={username}
                            />{" "}
                            accepted your offer of{" "}
                            <ActivityTerm>{giveTermsText(offer)}</ActivityTerm>{" "}
                            in exchange for{" "}
                            <ActivityTerm>
                              {originalOfferTermsText(offer)}
                            </ActivityTerm>
                            .
                          </>
                        )}
                      </p>
                      <p className="text-sm opacity-70">
                        One more step — complete the exchange when you have
                        given or received.
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(() =>
                            completeExchange(exchange.id, username),
                          ).then((res) => {
                            if (res) noteCompletedExchange(offer);
                          })
                        }
                        className="btn preset-filled-primary-500 w-full sm:w-auto"
                      >
                        Complete exchange
                      </button>
                    </div>
                  );
                }

                if (offer.status === "completed") {
                  return (
                    <div
                      key={offer.id}
                      className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 grid gap-3 p-3 sm:p-4"
                    >
                      <AutoDismissEffect
                        offerId={offer.id}
                        onDismiss={dismissTransient}
                      />
                      <CompactCardSteps phase="outgoing-completed" />
                      <OutgoingOfferSentence
                        offer={offer}
                        currentUser={username}
                      />
                      <p>
                        <CompletedOfferMessage
                          offer={offer}
                          currentUser={username}
                        />
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={offer.id}
                    className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 grid gap-3 p-3 sm:p-4"
                  >
                    <CompactCardSteps phase="outgoing-pending" />
                    <OutgoingOfferSentence
                      offer={offer}
                      currentUser={username}
                    />
                    <p>Waiting for response</p>
                  </div>
                );
              })()
            : null}

          <OfferPagination
            count={outgoingCardItems.length}
            page={safeOutgoingPage}
            onPageChange={setOutgoingPage}
          />
        </section>
      ) : null}

      {hasIncoming ? (
        <section
          ref={incomingRef}
          className="card preset-filled-surface-50-950 preset-outlined-surface-200-800 mt-4 grid gap-3 p-4 sm:p-5"
        >
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold">{ASSETS_RECEIVED_LABEL}</p>
            <span className="badge badge-icon preset-filled-primary-500">
              {visibleIncomingOffers.length}
            </span>
          </div>
          {currentIncomingOffer
            ? (() => {
                const offer = currentIncomingOffer;
                const offerCreditContext = creditContextFromState(
                  user,
                  state,
                  offer.id,
                );
                const availableForOffer = offerCreditContext.available;
                const unaffordable = cannotAffordCreditOffer(
                  offer,
                  availableForOffer,
                );
                const allowedCounterReturns = allowedReturnTypesForGive(
                  offer.giveType ?? "asset",
                );
                const exchange = exchangeByOfferId.get(offer.id);

                if (offer.status === "countered") {
                  return (
                    <div
                      key={offer.id}
                      className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 grid gap-3 p-3 sm:p-4"
                    >
                      <CompactCardSteps phase="incoming-countered-waiting" />
                      <IncomingOfferSentence
                        offer={offer}
                        currentUser={username}
                      />
                      <CounterofferSentence
                        offer={offer}
                        currentUser={username}
                        perspective="recipient"
                      />
                      <p className="opacity-60">
                        Waiting for{" "}
                        <ActivityName
                          name={offer.from}
                          currentUser={username}
                        />
                        .
                      </p>
                    </div>
                  );
                }

                if (offer.status === "accepted" && exchange) {
                  return (
                    <div
                      key={offer.id}
                      className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 grid gap-3 p-3 sm:p-4"
                    >
                      <CompactCardSteps phase="incoming-accepted" />
                      <IncomingOfferSentence
                        offer={offer}
                        currentUser={username}
                      />
                      <p>
                        {offer.acceptedViaCounter ? (
                          <>
                            <ActivityName
                              name={offer.from}
                              currentUser={username}
                            />{" "}
                            accepted your counteroffer of{" "}
                            <ActivityTerm>{giveTermsText(offer)}</ActivityTerm>{" "}
                            in exchange for{" "}
                            <ActivityTerm>
                              {counterofferReturnText(offer)}
                            </ActivityTerm>
                            .
                          </>
                        ) : (
                          <>
                            You accepted{" "}
                            <ActivityName
                              name={offer.from}
                              currentUser={username}
                            />
                            's offer of{" "}
                            <ActivityTerm>{giveTermsText(offer)}</ActivityTerm>{" "}
                            in exchange for{" "}
                            <ActivityTerm>
                              {originalOfferTermsText(offer)}
                            </ActivityTerm>
                            .
                          </>
                        )}
                      </p>
                      <p className="text-sm opacity-70">
                        One more step — complete the exchange when you have
                        given or received.
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(() =>
                            completeExchange(exchange.id, username),
                          ).then((res) => {
                            if (res) noteCompletedExchange(offer);
                          })
                        }
                        className="btn preset-filled-primary-500 w-full sm:w-auto"
                      >
                        Complete exchange
                      </button>
                    </div>
                  );
                }

                if (offer.status === "completed") {
                  return (
                    <div
                      key={offer.id}
                      className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 grid gap-3 p-3 sm:p-4"
                    >
                      <AutoDismissEffect
                        offerId={offer.id}
                        onDismiss={dismissTransient}
                      />
                      <CompactCardSteps phase="incoming-completed" />
                      <IncomingOfferSentence
                        offer={offer}
                        currentUser={username}
                      />
                      <p>
                        <CompletedOfferMessage
                          offer={offer}
                          currentUser={username}
                        />
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={offer.id}
                    className="card preset-filled-surface-100-900 preset-outlined-surface-200-800 grid gap-3 p-3 sm:p-4"
                  >
                    <CompactCardSteps phase="incoming-pending" />
                    <IncomingOfferSentence
                      offer={offer}
                      currentUser={username}
                    />
                    {unaffordable ? (
                      <p className="card preset-filled-warning-100-900 preset-outlined-warning-200-800 px-3 py-2 text-warning-500">
                        You only have {offerCreditContext.available} credits
                        available to offer. This asks for {offer.creditAmount}.
                      </p>
                    ) : null}
                    {counteringId === offer.id ? (
                      <div className="grid gap-2">
                        <p>
                          You wish to propose a counteroffer for the{" "}
                          <ActivityTerm>{giveTermsText(offer)}</ActivityTerm> in
                          exchange for…
                        </p>
                        <div className="grid gap-3">
                          <ExchangeTypeSelector
                            value={counterReturnType}
                            onChange={(type) => {
                              setCounterReturnType(type);
                              if (type === "credits") {
                                setCounterCreditAmount((prev) =>
                                  clampCreditAmount(prev, availableForOffer),
                                );
                              }
                            }}
                            allowedTypes={allowedCounterReturns}
                            ariaLabel="Counteroffer return type"
                          />
                          {counterReturnType === "credits" ? (
                            <label className="label">
                              <span className="label-text">Amount</span>
                              <select
                                value={clampCreditAmount(
                                  counterCreditAmount,
                                  availableForOffer,
                                )}
                                onChange={(e) =>
                                  setCounterCreditAmount(Number(e.target.value))
                                }
                                className="select"
                              >
                                {Array.from(
                                  { length: Math.max(availableForOffer, 1) },
                                  (_, i) => i + 1,
                                ).map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                          {counterReturnType === "asset" ? (
                            <label
                              htmlFor={`counter-offer-${offer.id}`}
                              className="grid gap-1.5"
                            >
                              Action
                              <input
                                id={`counter-offer-${offer.id}`}
                                value={counterOfferValue}
                                onChange={(e) =>
                                  setCounterOfferValue(e.target.value)
                                }
                                placeholder="e.g. Walk a dog"
                                className="input"
                              />
                            </label>
                          ) : null}
                          {counterReturnType === "money" ? (
                            <label
                              htmlFor={`counter-money-${offer.id}`}
                              className="grid gap-1.5"
                            >
                              Amount
                              <div className="flex items-center gap-2">
                                <span>£</span>
                                <input
                                  id={`counter-money-${offer.id}`}
                                  type="number"
                                  min={0.01}
                                  step={0.01}
                                  value={counterMoneyAmount}
                                  onChange={(e) =>
                                    setCounterMoneyAmount(e.target.value)
                                  }
                                  className="input"
                                />
                              </div>
                            </label>
                          ) : null}
                        </div>
                        <div className="btn-group flex w-full flex-col sm:flex-row sm:flex-wrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const validationError =
                                resolveCounterofferSubmitError({
                                  returnType: counterReturnType,
                                  creditAmount: counterCreditAmount,
                                  availableCredits: availableForOffer,
                                  creditBalance: offerCreditContext.balance,
                                  committedCredits:
                                    offerCreditContext.committed,
                                });
                              if (validationError) {
                                setError(validationError);
                                return;
                              }
                              run(() =>
                                counterOffer(offer.id, username, {
                                  returnType: counterReturnType,
                                  creditAmount:
                                    counterReturnType === "credits"
                                      ? clampCreditAmount(
                                          counterCreditAmount,
                                          availableForOffer,
                                        )
                                      : undefined,
                                  returnAsset:
                                    counterReturnType === "asset"
                                      ? counterOfferValue
                                      : undefined,
                                  moneyAmount:
                                    counterReturnType === "money" &&
                                    counterMoneyAmount !== ""
                                      ? Number(counterMoneyAmount)
                                      : undefined,
                                }),
                              ).then(() => setCounteringId(null));
                            }}
                            className="btn preset-filled-primary-500 w-full sm:w-auto"
                          >
                            Send counteroffer
                          </button>
                          <button
                            type="button"
                            onClick={() => setCounteringId(null)}
                            className="btn preset-outlined-surface-200-800 w-full sm:w-auto"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="btn-group flex w-full flex-col sm:flex-row sm:flex-wrap">
                        {!unaffordable ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(() => acceptOffer(offer.id, username))
                            }
                            className="btn preset-filled-primary-500 w-full sm:w-auto"
                          >
                            Accept
                          </button>
                        ) : null}
                        {unaffordable &&
                        availableForOffer > 0 &&
                        allowedCounterReturns.includes("credits") ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              openCounterForm(
                                offer,
                                availableForOffer,
                                counterSetters,
                                true,
                              )
                            }
                            className="btn preset-filled-secondary-500 w-full sm:w-auto"
                          >
                            {creditOfferInsteadLabel(availableForOffer)}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (unaffordable) {
                              openCounterForm(
                                offer,
                                availableForOffer,
                                counterSetters,
                                availableForOffer > 0,
                              );
                            } else {
                              openCounterForm(
                                offer,
                                availableForOffer,
                                counterSetters,
                                true,
                              );
                            }
                          }}
                          className="btn preset-filled-secondary-500 w-full sm:w-auto"
                        >
                          Counteroffer
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(() => rejectOffer(offer.id, username)).then(
                              (res) => {
                                if (res) closeOfferForm();
                              },
                            )
                          }
                          className="btn preset-filled-error-500 w-full sm:w-auto"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {!unaffordable && counteringId !== offer.id ? (
                      <p className="text-sm opacity-70">
                        {ACCEPT_NOT_COMPLETE_HINT}
                      </p>
                    ) : null}
                    {unaffordable &&
                    availableForOffer === 0 &&
                    counteringId !== offer.id ? (
                      <p className="opacity-60">
                        You can counter with an action instead.
                      </p>
                    ) : null}
                  </div>
                );
              })()
            : null}

          <OfferPagination
            count={visibleIncomingOffers.length}
            page={safeIncomingPage}
            onPageChange={setIncomingPage}
          />
        </section>
      ) : null}

      <div ref={activityRef}>
        <p className="mt-12 border-t-2 border-surface-200-800 pt-8 pb-4 opacity-60">
          Below is a record of every interaction you have made, secured by
          encrypted, tamper-evident, hash-verified receipts.
        </p>

        <details
          className="group"
          open={activityOpen}
          onToggle={(event) =>
            setActivityOpen((event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon
              className="size-4 shrink-0 opacity-60 group-open:hidden"
              aria-hidden
            />
            <ChevronDownIcon
              className="hidden size-4 shrink-0 opacity-60 group-open:block"
              aria-hidden
            />
            <p className="text-lg font-bold">{ACTIVITY_HEADING}</p>
          </summary>
          <div className="mt-3 grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={activitySearch}
                onChange={(event) => setActivitySearch(event.target.value)}
                placeholder={PROOF_SEARCH_PLACEHOLDER}
                className="input min-w-0 flex-1"
                aria-label={PROOF_SEARCH_PLACEHOLDER}
              />
              {activitySearchActive ? (
                <button
                  type="button"
                  onClick={() => setActivitySearch("")}
                  className="btn btn-sm preset-outlined-surface-200-800"
                >
                  Show all
                </button>
              ) : null}
            </div>
            {!mergedAudit.length ? (
              <p>No activity yet.</p>
            ) : activitySearchActive && !filteredAudit.length ? (
              <p>{PROOF_SEARCH_EMPTY_MESSAGE}</p>
            ) : (
              <>
                <ActivityTimeline
                  entries={activityEntries}
                  currentUser={username}
                  characterDisplayContext={state?.characterDisplayContext}
                />
                {filteredAudit.length > EVIDENCE_PAGE_SIZE ? (
                  <div className="flex justify-center pt-6">
                    <Pagination
                      count={filteredAudit.length}
                      pageSize={EVIDENCE_PAGE_SIZE}
                      page={safeEvidencePage}
                      onPageChange={(event) =>
                        handleEvidencePageChange(event.page)
                      }
                    >
                      <Pagination.PrevTrigger>
                        <ChevronLeftIcon className="size-4" />
                      </Pagination.PrevTrigger>
                      <Pagination.Context>
                        {(pagination) =>
                          pagination.pages.map((page, index) =>
                            page.type === "page" ? (
                              <Pagination.Item key={index} {...page}>
                                {page.value}
                              </Pagination.Item>
                            ) : (
                              <Pagination.Ellipsis key={index} index={index}>
                                …
                              </Pagination.Ellipsis>
                            ),
                          )
                        }
                      </Pagination.Context>
                      <Pagination.NextTrigger>
                        <ChevronRightIcon className="size-4" />
                      </Pagination.NextTrigger>
                    </Pagination>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
