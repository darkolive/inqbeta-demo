import type { ExchangeValueType } from './types'

export const WorkhouseMessages = {
  missingExchangeSides: 'Choose what you offer and what you want in exchange.',
  missingUsername: 'Choose a character name.',
  missingPassword: 'Enter a password so only you can access your story.',
  passwordTooLong: 'Password must be 128 characters or fewer.',
  wrongPassword: 'That character name is already in play. Choose another.',
  usernameInUse: 'That character name is already in play. Choose another.',
  usernameTooLong: 'Username must be 32 characters or fewer.',
  missingMoneyAmount: 'Enter an amount of money for this offer.',
  creditsMustBeAtLeastOne: 'Credits must be at least 1.',
  enterAsset: 'Describe the action you are offering.',
  enterReturnType: 'Choose credits, action, or money for what you want in exchange.',
  moneyAmountInvalid: 'Enter a positive amount.',
  moneyAmountTooLarge: 'Amount is too large.',
  sameTypeCredits: 'Credits cannot be exchanged for credits. Choose Action or Money instead.',
  sameTypeMoney: 'Money cannot be exchanged for money. Choose Credits or Action instead.',
  invalidExchange: 'This exchange is not allowed.',
  missingBrowserToken: 'Could not start a browser session. Try refreshing the page.',
  noSession: 'No session found for this browser. Choose a character name to join.',
  identityReset:
    'This character has left the game. Return through Rules of the Game to play again.',
  sessionNotBound: 'This browser is no longer signed in. Choose a character name to join again.',
  unknownUser: (name: string) => `No participant named "${name}".`,
  unknownRecipient: (name: string) => `No participant named "${name}". Check the spelling and try again.`,
  selfOffer: 'You cannot send an offer to yourself.',
  senderInsufficientCredits: 'You do not have enough credits for this offer.',
  recipientInsufficientCredits:
    'You do not have enough credits to accept this offer. Counteroffer or reject instead.',
  participantInsufficientCredits: (name: string) =>
    `${name} does not have enough credits to complete this exchange.`,
  offerNotFound: 'Offer not found. It may have been withdrawn or completed.',
  exchangeNotFound: 'Exchange not found. It may already be complete.',
  onlyRecipientAccept: 'Only the recipient can accept this offer.',
  onlyRecipientReject: 'Only the recipient can reject this offer.',
  onlyRecipientCounter: 'Only the recipient can counter this offer.',
  onlySenderAcceptCounter: 'Only the original sender can accept a counteroffer.',
  offerCannotAccept: 'This offer cannot be accepted in its current state.',
  offerCannotReject: 'This offer cannot be rejected in its current state.',
  offerCannotCounter: 'This offer cannot be countered in its current state.',
  offerNotAwaitingCounter: 'This offer is not awaiting counteroffer acceptance.',
  exchangeNotParticipant: 'You are not part of this exchange.',
  exchangeAlreadyCompleted: 'This exchange is already complete.',
  invalidEmail: 'Enter a valid email address.',
  joinSessionFailed: 'Could not join. Check your character name and try again.',
  saveSubmissionFailed: 'Could not save your submission. Try again.',
  exportStoryFailed: 'Could not export your story. Try again.',
  resetIdentityFailed: 'Could not destroy this character. Try again.',
  somethingWentWrong: 'Something went wrong. Try refreshing the page.',
  requestFailed: 'Request failed. Try again.',
} as const

export function creditCommitmentAffordabilityMessage(input: {
  balance: number
  committed: number
  available: number
}): string {
  const balance = Math.max(0, Math.trunc(input.balance))
  const committed = Math.max(0, Math.trunc(input.committed))
  const available = Math.max(0, Math.trunc(input.available))

  if (balance <= 0) {
    return 'You currently have no credits available to offer.'
  }
  if (available <= 0) {
    return `You have ${balance} credits, but they are already committed to open offers. Complete, reject, or wait for those offers before offering more credits.`
  }
  if (committed > 0) {
    return `You have ${balance} credits, but ${committed} are already committed to open offers. You can offer up to ${available} credits.`
  }
  if (balance === 1) {
    return 'You currently hold 1 credit and cannot offer more than this.'
  }
  return `You can only offer up to the number of credits you hold, which currently is ${balance}.`
}

export function creditOfferAffordabilityMessage(balance: number): string {
  return creditCommitmentAffordabilityMessage({
    balance,
    committed: 0,
    available: Math.max(0, Math.trunc(balance)),
  })
}

export function sameTypeExchangeErrorMessage(giveType: ExchangeValueType): string | null {
  if (giveType === 'credits') return WorkhouseMessages.sameTypeCredits
  if (giveType === 'money') return WorkhouseMessages.sameTypeMoney
  return null
}

function offersCreditsAboveBalance(offered: unknown, balance: number): boolean {
  if (offered === undefined || offered === null || offered === '') return false
  const amount = Number(offered)
  return Number.isFinite(amount) && amount > balance
}

function isMissingMoneyAmount(raw: unknown): boolean {
  if (raw === undefined || raw === null || raw === '') return true
  const amount = Number(raw)
  return !Number.isFinite(amount) || amount <= 0
}

export function resolveSessionFormError(input: { username: string }): string | null {
  if (!input.username.trim()) return WorkhouseMessages.missingUsername
  return null
}

export function messageForWorkhouseApiError(code: string, serverMessage?: string): string {
  switch (code) {
    case 'invalid_password':
      return WorkhouseMessages.wrongPassword
    case 'invalid_username':
      return serverMessage === WorkhouseMessages.usernameTooLong
        ? WorkhouseMessages.usernameTooLong
        : WorkhouseMessages.missingUsername
    case 'missing_browser_token':
      return WorkhouseMessages.missingBrowserToken
    case 'no_session':
      return WorkhouseMessages.noSession
    case 'identity_reset':
      return WorkhouseMessages.identityReset
    case 'session_not_bound':
    case 'unauthenticated':
      return WorkhouseMessages.sessionNotBound
    case 'invalid_email':
      return WorkhouseMessages.invalidEmail
    case 'invalid_credits':
    case 'invalid_money':
    case 'invalid_asset':
    case 'invalid_return_type':
    case 'same_type_exchange':
    case 'unknown_user':
    case 'unknown_recipient':
    case 'self_offer':
    case 'insufficient_credits':
    case 'not_found':
    case 'forbidden':
    case 'invalid_state':
      return serverMessage ?? WorkhouseMessages.somethingWentWrong
    case 'internal':
      return WorkhouseMessages.somethingWentWrong
    default:
      return serverMessage ?? WorkhouseMessages.requestFailed
  }
}

export function resolveOfferFormSubmitError(input: {
  giveType: ExchangeValueType | null
  giveCreditAmount: unknown
  giveMoneyAmount: unknown
  returnType: ExchangeValueType | null
  creditAmount: unknown
  moneyAmount: unknown
  availableCredits: number
  creditBalance?: number
  committedCredits?: number
}): string | null {
  const { giveType, returnType, availableCredits } = input
  const creditMessage = () =>
    creditCommitmentAffordabilityMessage({
      balance: input.creditBalance ?? availableCredits,
      committed: input.committedCredits ?? 0,
      available: availableCredits,
    })

  if (
    giveType === 'credits' &&
    offersCreditsAboveBalance(input.giveCreditAmount, availableCredits)
  ) {
    return creditMessage()
  }

  if (
    giveType &&
    returnType &&
    isSameTypeExchangeBlocked(giveType, returnType)
  ) {
    return sameTypeExchangeErrorMessage(giveType)
  }

  if (giveType === 'money' && returnType && isMissingMoneyAmount(input.giveMoneyAmount)) {
    return WorkhouseMessages.missingMoneyAmount
  }

  if (returnType === 'money' && giveType && isMissingMoneyAmount(input.moneyAmount)) {
    return WorkhouseMessages.missingMoneyAmount
  }

  if (!giveType || !returnType) {
    return WorkhouseMessages.missingExchangeSides
  }

  return null
}

export function resolveOfferGiveStepError(input: {
  giveType: ExchangeValueType | null
  giveCreditAmount: unknown
  giveMoneyAmount: unknown
  giveAsset: unknown
  availableCredits: number
  creditBalance?: number
  committedCredits?: number
}): string | null {
  const { giveType, availableCredits } = input

  if (!giveType) {
    return WorkhouseMessages.missingExchangeSides
  }

  if (
    giveType === 'credits' &&
    offersCreditsAboveBalance(input.giveCreditAmount, availableCredits)
  ) {
    return creditCommitmentAffordabilityMessage({
      balance: input.creditBalance ?? availableCredits,
      committed: input.committedCredits ?? 0,
      available: availableCredits,
    })
  }

  if (giveType === 'credits') {
    const amount = Number(input.giveCreditAmount)
    if (!Number.isFinite(amount) || amount < 1) {
      return WorkhouseMessages.missingExchangeSides
    }
  }

  if (giveType === 'money' && isMissingMoneyAmount(input.giveMoneyAmount)) {
    return WorkhouseMessages.missingMoneyAmount
  }

  if (giveType === 'asset' && !String(input.giveAsset ?? '').trim()) {
    return WorkhouseMessages.enterAsset
  }

  return null
}

export function resolveCounterofferSubmitError(input: {
  returnType: ExchangeValueType
  creditAmount: unknown
  availableCredits: number
  creditBalance?: number
  committedCredits?: number
}): string | null {
  if (
    input.returnType === 'credits' &&
    offersCreditsAboveBalance(input.creditAmount, input.availableCredits)
  ) {
    return creditCommitmentAffordabilityMessage({
      balance: input.creditBalance ?? input.availableCredits,
      committed: input.committedCredits ?? 0,
      available: input.availableCredits,
    })
  }
  return null
}

export function usernameTakenHint(usernameExists: boolean): string | null {
  return usernameExists ? WorkhouseMessages.usernameInUse : null
}

function isSameTypeExchangeBlocked(giveType: ExchangeValueType, returnType: ExchangeValueType): boolean {
  return giveType !== 'asset' && giveType === returnType
}
