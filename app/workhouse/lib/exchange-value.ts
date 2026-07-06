import type { OfferTerms, WorkhouseExchange, WorkhouseOffer, WorkhouseUser } from './types'
import {
  creditCommitmentAffordabilityMessage,
  creditOfferAffordabilityMessage,
  resolveCounterofferSubmitError,
  resolveOfferFormSubmitError,
  resolveOfferGiveStepError,
  sameTypeExchangeErrorMessage,
} from './workhouse-messages'

export {
  creditCommitmentAffordabilityMessage,
  creditOfferAffordabilityMessage,
  resolveCounterofferSubmitError,
  resolveOfferFormSubmitError,
  resolveOfferGiveStepError,
  sameTypeExchangeErrorMessage,
}

export type CreditCommitmentContext = {
  balance: number
  committed: number
  available: number
}

function usernameKey(username: string): string {
  return username.trim().toLowerCase()
}

function creditsCommittedInOffer(
  offer: WorkhouseOffer,
  userKey: string,
  excludeOfferId?: string
): number {
  if (offer.id === excludeOfferId) return 0
  if (offer.status === 'rejected' || offer.status === 'completed') return 0

  const isFrom = offer.from.toLowerCase() === userKey
  const isTo = offer.to.toLowerCase() === userKey
  if (!isFrom && !isTo) return 0

  if (offer.status === 'accepted') return 0

  if (offer.status === 'pending') {
    if (isFrom && offer.giveType === 'credits') {
      return offer.giveCreditAmount ?? 0
    }
    return 0
  }

  if (offer.status === 'countered') {
    let committed = 0
    if (isFrom && offer.giveType === 'credits') {
      committed += offer.giveCreditAmount ?? 0
    }
    if (isTo && offer.returnType === 'credits') {
      committed += offer.creditAmount ?? 0
    }
    return committed
  }

  return 0
}

function creditsCommittedInExchange(
  exchange: WorkhouseExchange,
  userKey: string,
  excludeExchangeId?: string
): number {
  if (exchange.id === excludeExchangeId) return 0
  if (exchange.status === 'completed') return 0

  const isFrom = exchange.from.toLowerCase() === userKey
  const isTo = exchange.to.toLowerCase() === userKey
  if (!isFrom && !isTo) return 0

  if (isFrom && exchange.giveType === 'credits') {
    return exchange.giveCreditAmount ?? 0
  }
  if (isTo && exchange.returnType === 'credits') {
    return exchange.creditAmount ?? 0
  }
  return 0
}

export function committedCreditsForUser(
  username: string,
  offers: Iterable<WorkhouseOffer>,
  exchanges: Iterable<WorkhouseExchange>,
  exclude?: { offerId?: string; exchangeId?: string }
): number {
  const userKey = usernameKey(username)
  let total = 0

  for (const offer of offers) {
    total += creditsCommittedInOffer(offer, userKey, exclude?.offerId)
  }

  for (const exchange of exchanges) {
    total += creditsCommittedInExchange(exchange, userKey, exclude?.exchangeId)
  }

  return total
}

export function availableCreditsToOffer(
  user: Pick<WorkhouseUser, 'username' | 'credits'>,
  offers: Iterable<WorkhouseOffer>,
  exchanges: Iterable<WorkhouseExchange>,
  exclude?: { offerId?: string; exchangeId?: string }
): number {
  const balance = Math.max(0, Math.trunc(user.credits))
  const committed = committedCreditsForUser(user.username, offers, exchanges, exclude)
  return Math.max(0, balance - committed)
}

export function creditCommitmentContextForUser(
  user: Pick<WorkhouseUser, 'username' | 'credits'>,
  offers: Iterable<WorkhouseOffer>,
  exchanges: Iterable<WorkhouseExchange>,
  exclude?: { offerId?: string; exchangeId?: string }
): CreditCommitmentContext {
  const balance = Math.max(0, Math.trunc(user.credits))
  const committed = committedCreditsForUser(user.username, offers, exchanges, exclude)
  const available = Math.max(0, balance - committed)
  return { balance, committed, available }
}

export function collectOffersFromState(
  offers: WorkhouseOffer[],
  ...more: WorkhouseOffer[][]
): WorkhouseOffer[] {
  const byId = new Map<string, WorkhouseOffer>()
  for (const list of [offers, ...more]) {
    for (const offer of list) {
      byId.set(offer.id, offer)
    }
  }
  return [...byId.values()]
}

export type ExchangeValueType = 'credits' | 'asset' | 'money'

/** @deprecated Use ExchangeValueType */
export type ReturnType = ExchangeValueType

export const LETS_EXCHANGE_LABEL = 'Send'
export const NEW_EXCHANGE_LABEL = 'Find a friend'
export const FIND_FRIEND_PROMPT = 'Who are you looking for?'
export const OFFER_GIVE_TITLE = 'Your offer'
export const OFFER_RECEIVE_TITLE = 'In exchange for'
export const OFFER_GIVE_SUMMARY_LABEL = 'YOUR OFFER'
export const OFFER_TO_LABEL = "Friend's name"
export const ASSETS_RECEIVED_LABEL = 'OFFERS RECEIVED'
export const ACTIVITY_HEADING = 'Activity'
export const ACTIVITY_ACCORDION_DEFAULT_OPEN = false
export const ACCEPT_NOT_COMPLETE_HINT =
  'Accepting is not the end — complete the exchange when you have given or received.'

export function formatCredits(amount: number): string {
  const n = Math.abs(amount)
  return n === 1 ? '1 credit' : `${n} credits`
}

/** @deprecated Use creditOfferAffordabilityMessage */
export function creditAmountRangeMessage(maxCredits: number): string {
  return creditOfferAffordabilityMessage(maxCredits)
}

export function offersCreditsAboveBalance(offered: unknown, balance: number): boolean {
  if (offered === undefined || offered === null || offered === '') return false
  const amount = Number(offered)
  return Number.isFinite(amount) && amount > balance
}

export function normalizeValueType(raw: unknown): ExchangeValueType | null {
  if (raw === 'return_gesture' || raw === 'asset') return 'asset'
  if (raw === 'credits' || raw === 'money') return raw
  return null
}

function formatMoneyLabel(amount: number): string {
  return `£${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`
}

export function valueTypeLabel(type: ExchangeValueType): string {
  if (type === 'asset') return 'Action'
  if (type === 'credits') return 'Credits'
  return 'Money'
}

const ALL_VALUE_TYPES: ExchangeValueType[] = ['credits', 'asset', 'money']

/** Return types allowed in exchange for a given give type (main offer and counteroffer). */
export function allowedReturnTypesForGive(giveType: ExchangeValueType): ExchangeValueType[] {
  if (giveType === 'credits') return ['asset', 'money']
  if (giveType === 'money') return ['credits', 'asset']
  return ALL_VALUE_TYPES
}

export function isSameTypeExchangeBlocked(
  giveType: ExchangeValueType,
  returnType: ExchangeValueType
): boolean {
  return giveType !== 'asset' && giveType === returnType
}

export function creditOfferInsteadLabel(balance: number): string {
  return `Offer ${balance} credits instead`
}
type ValueFields = Pick<
  WorkhouseOffer,
  | 'giveType'
  | 'giveCreditAmount'
  | 'giveMoneyAmount'
  | 'gesture'
  | 'returnType'
  | 'creditAmount'
  | 'returnGesture'
  | 'moneyAmount'
>

export function giveTermsText(offer: ValueFields): string {
  const giveType = offer.giveType ?? 'asset'
  if (giveType === 'credits') return formatCredits(offer.giveCreditAmount ?? 0)
  if (giveType === 'money') return formatMoneyLabel(offer.giveMoneyAmount ?? 0)
  return offer.gesture ?? ''
}

export function receiveTermsText(
  offer: Pick<WorkhouseOffer, 'returnType' | 'creditAmount' | 'returnGesture' | 'moneyAmount'>
): string {
  if (offer.returnType === 'credits') return formatCredits(offer.creditAmount ?? 0)
  if (offer.returnType === 'money') return formatMoneyLabel(offer.moneyAmount ?? 0)
  return offer.returnGesture ?? ''
}

export function originalReceiveTermsText(offer: WorkhouseOffer): string {
  if (offer.originalTerms) return receiveTermsText(offer.originalTerms)
  return receiveTermsText(offer)
}

function viewerMatches(name: string, viewer: string): boolean {
  return name.toLowerCase() === viewer.toLowerCase()
}

export function counterofferedOfferSentence(
  actor: string,
  offerSender: string,
  offer: ValueFields,
  viewer: string
): string {
  const give = giveTermsText(offer)
  const counterReturn = receiveTermsText(offer)
  if (viewerMatches(actor, viewer)) {
    return `You counteroffered ${offerSender}'s offer of ${give} in exchange for ${counterReturn}.`
  }
  if (viewerMatches(offerSender, viewer)) {
    return `${actor} counteroffered your offer of ${give} in exchange for ${counterReturn}.`
  }
  return `${actor} counteroffered ${offerSender}'s offer of ${give} in exchange for ${counterReturn}.`
}

export function acceptCounterofferSentence(
  actor: string,
  counterparty: string,
  offer: ValueFields,
  viewer: string
): string {
  const give = giveTermsText(offer)
  const counterReturn = receiveTermsText(offer)
  if (viewerMatches(actor, viewer)) {
    return `You accepted ${counterparty}'s counteroffer of ${give} in exchange for ${counterReturn}.`
  }
  if (viewerMatches(counterparty, viewer)) {
    return `${actor} accepted your counteroffer of ${give} in exchange for ${counterReturn}.`
  }
  return `${actor} accepted ${counterparty}'s counteroffer of ${give} in exchange for ${counterReturn}.`
}

export function proposedExchangeAuditMessage(from: string, to: string, offer: ValueFields): string {
  return `${from} proposed an offer to ${to} of ${giveTermsText(offer)} in exchange for ${receiveTermsText(offer)}`
}

export function counterofferPromptText(
  offer: Pick<WorkhouseOffer, 'giveType' | 'giveCreditAmount' | 'giveMoneyAmount' | 'gesture'>
): string {
  const give = giveTermsText({
    ...offer,
    returnType: 'asset',
    creditAmount: undefined,
    returnGesture: undefined,
    moneyAmount: undefined,
  })
  return `You wish to propose a counteroffer for the ${give} in exchange for…`
}

export function proposedExchangeSentence(
  proposer: string,
  counterparty: string,
  offer: ValueFields & Pick<WorkhouseOffer, 'originalTerms'>,
  viewer: string
): string {
  const give = giveTermsText(offer)
  const receive = originalReceiveTermsText(offer as WorkhouseOffer)
  const viewerIsProposer = proposer.toLowerCase() === viewer.toLowerCase()
  if (viewerIsProposer) {
    return `You proposed an offer to ${counterparty} of ${give} in exchange for ${receive}.`
  }
  return `${proposer} proposed an offer to you of ${give} in exchange for ${receive}.`
}

export function completedOfferSentence(
  from: string,
  to: string,
  offer: ValueFields,
  viewer: string
): string {
  const give = giveTermsText(offer)
  const receive = receiveTermsText(offer)
  const viewerKey = viewer.toLowerCase()
  const fromLabel = from.toLowerCase() === viewerKey ? 'you' : from
  const toLabel = to.toLowerCase() === viewerKey ? 'you' : to
  return `Offer completed between ${fromLabel} and ${toLabel} for ${give} in exchange for ${receive}.`
}

export function offerTermsFromOffer(offer: WorkhouseOffer): OfferTerms {
  return {
    returnType: offer.returnType,
    creditAmount: offer.creditAmount,
    returnGesture: offer.returnGesture,
    moneyAmount: offer.moneyAmount,
  }
}

export function exchangeGiveFields(offer: WorkhouseOffer): Pick<
  WorkhouseExchange,
  'giveType' | 'giveCreditAmount' | 'giveMoneyAmount' | 'gesture'
> {
  return {
    giveType: offer.giveType ?? 'asset',
    giveCreditAmount: offer.giveCreditAmount,
    giveMoneyAmount: offer.giveMoneyAmount,
    gesture: offer.gesture,
  }
}
