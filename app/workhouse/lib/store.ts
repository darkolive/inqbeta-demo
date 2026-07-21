import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getStorage } from './storage'
import { filterFederationParticipationAudit } from './contribution-pattern-data'
import { type CharacterDisplayContext } from './character-display'
import { computeFederationData } from './federation-data'
import {
  exchangeGiveFields,
  giveTermsText,
  isSameTypeExchangeBlocked,
  normalizeValueType,
  proposedExchangeAuditMessage,
  receiveTermsText,
  creditCommitmentAffordabilityMessage,
  creditCommitmentContextForUser,
} from './exchange-value'
import {
  WorkhouseMessages,
  sameTypeExchangeErrorMessage,
} from './workhouse-messages'
import {
  clearSession,
  clearSessionsForUsername,
  getSessionUsername,
} from './sessions'
import type {
  AuditEntry,
  AuditKind,
  ExchangeValueType,
  GestureAsset,
  WorkhouseExchange,
  WorkhouseOffer,
  WorkhouseState,
  WorkhouseUser,
} from './types'

export const INITIAL_CREDITS = 5

const PASSWORD_SALT_BYTES = 16
const PASSWORD_KEY_BYTES = 64

function hashPassword(password: string, salt: Buffer): string {
  return scryptSync(password, salt, PASSWORD_KEY_BYTES).toString('hex')
}

function createPasswordRecord(password: string): { passwordSalt: string; passwordHash: string } {
  const salt = randomBytes(PASSWORD_SALT_BYTES)
  return {
    passwordSalt: salt.toString('hex'),
    passwordHash: hashPassword(password, salt),
  }
}

function verifyPassword(password: string, saltHex: string, hashHex: string): boolean {
  const salt = Buffer.from(saltHex, 'hex')
  const computed = Buffer.from(hashPassword(password, salt), 'hex')
  const stored = Buffer.from(hashHex, 'hex')
  if (computed.length !== stored.length) return false
  return timingSafeEqual(computed, stored)
}

function assertPassword(passwordRaw: string): string {
  const password = passwordRaw.trim()
  if (!password) {
    throw new WorkhouseError('invalid_password', WorkhouseMessages.missingPassword)
  }
  if (password.length > 128) {
    throw new WorkhouseError('invalid_password', WorkhouseMessages.passwordTooLong)
  }
  return password
}

function toPublicUser(user: WorkhouseUser): WorkhouseUser {
  const { passwordHash: _hash, passwordSalt: _salt, ...publicUser } = user
  return publicUser
}

function nowIso(): string {
  return new Date().toISOString()
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeUsername(username: string): string {
  return username.trim()
}

function evidenceHash(payload: string): string {
  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}

function addGestureAsset(user: WorkhouseUser, gesture: string, from: string): void {
  const asset: GestureAsset = { gesture, from, at: nowIso() }
  user.receivedGestures.push(asset)
}

function addMoneyReceipt(user: WorkhouseUser, amount: number, from: string): void {
  user.receivedMoney.push({ amount, from, at: nowIso() })
}

type AuditInput = {
  message: string
  kind: AuditKind
  participants: string[]
  offerId?: string
  exchangeId?: string
  roomActivity?: boolean
  characterIds?: string[]
}

async function characterIdsForParticipantNames(names: readonly string[]): Promise<string[]> {
  const ids: string[] = []
  const seen = new Set<string>()
  const storage = await getStorage()

  for (const name of names) {
    const user = await storage.getUser(name.toLowerCase())
    const characterId = user?.characterId?.trim()
    if (!characterId || seen.has(characterId)) continue
    seen.add(characterId)
    ids.push(characterId)
  }

  return ids
}

async function buildAuditEntry(input: AuditInput): Promise<AuditEntry> {
  const id = newId('audit')
  const timestamp = nowIso()
  const storage = await getStorage()
  const audit = await storage.getAudit()
  const previousEntry = audit[0]
  const previousHash = previousEntry?.eventHash ?? 'demo-local'
  const scopeId = input.exchangeId ?? input.offerId
  const resolvedCharacterIds =
    input.characterIds ?? await characterIdsForParticipantNames(input.participants)

  const hashPayload = JSON.stringify({
    id,
    timestamp,
    message: input.message,
    kind: input.kind,
    participants: input.participants,
    characterIds: resolvedCharacterIds,
    offerId: input.offerId,
    exchangeId: input.exchangeId,
    scopeId,
    previousHash,
  })
  const eventHash = evidenceHash(hashPayload)

  return {
    id,
    timestamp,
    message: input.message,
    kind: input.kind,
    participants: input.participants,
    characterIds: resolvedCharacterIds.length ? resolvedCharacterIds : undefined,
    offerId: input.offerId,
    exchangeId: input.exchangeId,
    scopeId,
    eventHash,
    previousHash,
    roomActivity: input.roomActivity,
  }
}

async function commitConstitutionalOccurrence(input: AuditInput): Promise<AuditEntry> {
  const entry = await buildAuditEntry(input)
  const storage = await getStorage()
  await storage.prependAudit(entry)
  return entry
}

function normalizeCreditAmount(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') {
    return NaN
  }
  return Number(raw)
}

function assertCreditAmountAtLeastOne(raw: unknown): number {
  const amount = normalizeCreditAmount(raw)
  if (!Number.isFinite(amount) || amount < 1 || !Number.isInteger(amount)) {
    throw new WorkhouseError('invalid_credits', WorkhouseMessages.creditsMustBeAtLeastOne)
  }
  return amount
}

async function assertCreditAmountWithinBalance(
  raw: unknown,
  user: WorkhouseUser,
  exclude?: { offerId?: string; exchangeId?: string }
): Promise<number> {
  const amount = assertCreditAmountAtLeastOne(raw)
  const storage = await getStorage()
  const offers = await storage.getAllOffers()
  const exchanges = await storage.getAllExchanges()
  const context = creditCommitmentContextForUser(
    user,
    offers.values(),
    exchanges.values(),
    exclude
  )
  if (amount > context.available) {
    throw new WorkhouseError(
      'invalid_credits',
      creditCommitmentAffordabilityMessage(context)
    )
  }
  return amount
}

function normalizeMoneyAmount(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') {
    return NaN
  }
  return Number(raw)
}

function assertMoneyAmount(raw: unknown): number {
  const amount = normalizeMoneyAmount(raw)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new WorkhouseError('invalid_money', WorkhouseMessages.moneyAmountInvalid)
  }
  const rounded = Math.round(amount * 100) / 100
  if (rounded > 99999.99) {
    throw new WorkhouseError('invalid_money', WorkhouseMessages.moneyAmountTooLarge)
  }
  return rounded
}

function transferCredits(from: WorkhouseUser, to: WorkhouseUser, amount: number): void {
  if (from.credits < amount) {
    throw new WorkhouseError(
      'insufficient_credits',
      WorkhouseMessages.participantInsufficientCredits(from.username)
    )
  }
  from.credits -= amount
  to.credits += amount
}

async function parseGiveSide(
  input: {
    giveType?: unknown
    giveCreditAmount?: unknown
    giveAsset?: unknown
    giveMoneyAmount?: unknown
    gesture?: unknown
  },
  user: WorkhouseUser
): Promise<{
  giveType: ExchangeValueType
  giveCreditAmount?: number
  giveMoneyAmount?: number
  gesture: string
}> {
  const giveType = normalizeValueType(input.giveType) ?? 'asset'
  let giveCreditAmount: number | undefined
  let giveMoneyAmount: number | undefined
  let gesture = ''

  if (giveType === 'credits') {
    giveCreditAmount = await assertCreditAmountWithinBalance(input.giveCreditAmount, user)
  } else if (giveType === 'money') {
    giveMoneyAmount = assertMoneyAmount(input.giveMoneyAmount)
  } else {
    gesture = String(input.giveAsset ?? input.gesture ?? '').trim()
    if (!gesture) {
      throw new WorkhouseError('invalid_asset', WorkhouseMessages.enterAsset)
    }
  }

  return { giveType, giveCreditAmount, giveMoneyAmount, gesture }
}

function parseReceiveSide(
  input: {
    returnType: unknown
    creditAmount?: unknown
    returnAsset?: unknown
    returnGesture?: unknown
    moneyAmount?: unknown
  },
  user?: WorkhouseUser
): {
  returnType: ExchangeValueType
  creditAmount?: number
  returnGesture?: string
  moneyAmount?: number
} {
  const returnType = normalizeValueType(input.returnType)
  if (!returnType) {
    throw new WorkhouseError('invalid_return_type', WorkhouseMessages.enterReturnType)
  }

  let creditAmount: number | undefined
  let returnGesture: string | undefined
  let moneyAmount: number | undefined

  if (returnType === 'credits') {
    creditAmount =
      user !== undefined
        ? assertCreditAmountAtLeastOne(input.creditAmount)
        : assertCreditAmountAtLeastOne(input.creditAmount)
  } else if (returnType === 'money') {
    moneyAmount = assertMoneyAmount(input.moneyAmount)
  } else {
    returnGesture = String(input.returnAsset ?? input.returnGesture ?? '').trim()
    if (!returnGesture) {
      throw new WorkhouseError('invalid_asset', WorkhouseMessages.enterAsset)
    }
  }

  return { returnType, creditAmount, returnGesture, moneyAmount }
}

function assertCompatibleExchangeTypes(
  giveType: ExchangeValueType,
  returnType: ExchangeValueType
): void {
  if (!isSameTypeExchangeBlocked(giveType, returnType)) return
  const message = sameTypeExchangeErrorMessage(giveType)
  throw new WorkhouseError('same_type_exchange', message ?? WorkhouseMessages.invalidExchange)
}

function normalizedUsernameKey(name: string): string {
  return normalizeUsername(name).toLowerCase()
}

function auditParticipantNames(...names: string[]): string[] {
  const seen = new Set<string>()
  const participants: string[] = []

  for (const name of names) {
    participants.push(normalizeUsername(name))
  }

  return participants
}

function isUserInvolvedByUsername(entry: AuditEntry, viewerKey: string): boolean {
  if (entry.roomActivity) return false

  for (const participant of entry.participants ?? []) {
    if (normalizedUsernameKey(participant) === viewerKey) return true
  }

  return false
}

async function inferCreatedAtFromAudit(usernameKey: string): Promise<string | undefined> {
  const storage = await getStorage()
  const audit = await storage.getAudit()
  let earliest: string | undefined

  for (const entry of audit) {
    if (entry.roomActivity) continue
    if (!isUserInvolvedByUsername(entry, usernameKey)) continue
    if (!earliest || entry.timestamp < earliest) {
      earliest = entry.timestamp
    }
  }

  return earliest
}

function ensureUserIdentityFields(user: WorkhouseUser, createdAt?: string): void {
  const key = user.username.toLowerCase()
  if (!user.characterId?.trim()) {
    user.characterId = newId('char')
  }
  if (!user.createdAt?.trim()) {
    user.createdAt = createdAt ?? nowIso()
  }
}

async function cancelActiveExchangesForOffer(offerId: string): Promise<void> {
  const storage = await getStorage()
  const exchanges = await storage.getAllExchanges()
  for (const [id, exchange] of exchanges.entries()) {
    if (exchange.offerId === offerId && exchange.status !== 'completed') {
      await storage.deleteExchange(id)
    }
  }
}

async function assertSenderCanAffordOfferCredits(offer: WorkhouseOffer, sender: WorkhouseUser): Promise<void> {
  if (offer.giveType !== 'credits') return
  const amount = offer.giveCreditAmount ?? 0
  const storage = await getStorage()
  const offers = await storage.getAllOffers()
  const exchanges = await storage.getAllExchanges()
  const context = creditCommitmentContextForUser(
    sender,
    offers.values(),
    exchanges.values(),
    { offerId: offer.id }
  )
  if (amount > context.available) {
    throw new WorkhouseError(
      'insufficient_credits',
      WorkhouseMessages.senderInsufficientCredits
    )
  }
}

async function assertRecipientCanAffordCredits(offer: WorkhouseOffer, recipient: WorkhouseUser): Promise<void> {
  if (offer.returnType !== 'credits') return
  const amount = offer.creditAmount ?? 0
  const storage = await getStorage()
  const offers = await storage.getAllOffers()
  const exchanges = await storage.getAllExchanges()
  const context = creditCommitmentContextForUser(
    recipient,
    offers.values(),
    exchanges.values(),
    { offerId: offer.id }
  )
  if (amount > context.available) {
    throw new WorkhouseError(
      'insufficient_credits',
      WorkhouseMessages.recipientInsufficientCredits
    )
  }
}

function assertPartiesCanAffordCreditsOnComplete(
  offer: Pick<
    WorkhouseOffer,
    'giveType' | 'giveCreditAmount' | 'returnType' | 'creditAmount'
  >,
  fromUser: WorkhouseUser,
  toUser: WorkhouseUser
): void {
  if (offer.giveType === 'credits') {
    const amount = offer.giveCreditAmount ?? 0
    if (fromUser.credits < amount) {
      throw new WorkhouseError(
        'insufficient_credits',
        WorkhouseMessages.participantInsufficientCredits(fromUser.username)
      )
    }
  }
  if (offer.returnType === 'credits') {
    const amount = offer.creditAmount ?? 0
    if (toUser.credits < amount) {
      throw new WorkhouseError(
        'insufficient_credits',
        WorkhouseMessages.participantInsufficientCredits(toUser.username)
      )
    }
  }
}

function settleExchangeValues(exchange: WorkhouseExchange, fromUser: WorkhouseUser, toUser: WorkhouseUser): void {
  const giveType = exchange.giveType ?? 'asset'
  if (giveType === 'credits') {
    transferCredits(fromUser, toUser, exchange.giveCreditAmount ?? 0)
  } else if (giveType === 'asset') {
    addGestureAsset(toUser, exchange.gesture, fromUser.username)
  } else {
    addMoneyReceipt(toUser, exchange.giveMoneyAmount ?? 0, fromUser.username)
  }

  if (exchange.returnType === 'credits') {
    transferCredits(toUser, fromUser, exchange.creditAmount ?? 0)
  } else if (exchange.returnType === 'asset') {
    addGestureAsset(fromUser, exchange.returnGesture ?? '', toUser.username)
  } else {
    addMoneyReceipt(fromUser, exchange.moneyAmount ?? 0, toUser.username)
  }
}

async function filterAuditForUser(user: WorkhouseUser): Promise<AuditEntry[]> {
  const usernameKey = user.username.toLowerCase()
  const characterId = user.characterId?.trim()
  const storage = await getStorage()
  const audit = await storage.getAudit()
  const result: AuditEntry[] = []

  for (const entry of audit) {
    if (entry.roomActivity) continue

    if (entry.characterIds?.length && characterId) {
      if (entry.characterIds.includes(characterId)) {
        result.push(entry)
      }
      continue
    }

    if (entry.timestamp < user.createdAt) continue
    if (isUserInvolvedByUsername(entry, usernameKey)) {
      result.push(entry)
    }
  }

  return result
}

async function buildCharacterDisplayContext(): Promise<CharacterDisplayContext> {
  const storage = await getStorage()
  const users = await storage.getAllUsers()
  const destroyed = await storage.getDestroyedKeys()
  const activeSince: Record<string, string> = {}
  for (const [key, user] of users.entries()) {
    activeSince[key] = user.createdAt
  }
  return {
    retiredKeys: [...destroyed],
    activeSince,
  }
}

export class WorkhouseError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export async function enterSession(
  usernameRaw: string,
  passwordRaw: string
): Promise<{ user: WorkhouseUser; isNew: boolean }> {
  const username = normalizeUsername(usernameRaw)
  const password = assertPassword(passwordRaw)
  if (!username) {
    throw new WorkhouseError('invalid_username', WorkhouseMessages.missingUsername)
  }
  if (username.length > 32) {
    throw new WorkhouseError('invalid_username', WorkhouseMessages.usernameTooLong)
  }

  const key = username.toLowerCase()
  const storage = await getStorage()
  const existing = await storage.getUser(key)

  if (existing) {
    if (!existing.passwordSalt || !existing.passwordHash) {
      throw new WorkhouseError('invalid_password', WorkhouseMessages.wrongPassword)
    }
    if (!verifyPassword(password, existing.passwordSalt, existing.passwordHash)) {
      throw new WorkhouseError('invalid_password', WorkhouseMessages.wrongPassword)
    }
    const createdAt = await inferCreatedAtFromAudit(key)
    ensureUserIdentityFields(existing, createdAt)
    await storage.setUser(key, existing)
    return { user: toPublicUser(existing), isNew: false }
  }

  const resetKeys = await storage.getResetIdentityKeys()
  resetKeys.delete(key)
  await storage.setAudit(await storage.getAudit())
  await clearSessionsForUsername(key)

  const { passwordSalt, passwordHash } = createPasswordRecord(password)
  const user: WorkhouseUser = {
    username,
    characterId: newId('char'),
    credits: INITIAL_CREDITS,
    receivedGestures: [],
    receivedMoney: [],
    createdAt: nowIso(),
    passwordSalt,
    passwordHash,
  }

  await commitConstitutionalOccurrence({
    message: `${username} joined with ${INITIAL_CREDITS} demo credits`,
    kind: 'join',
    participants: [username],
    characterIds: [user.characterId],
    roomActivity: true,
  })

  await storage.setUser(key, user)
  return { user: toPublicUser(user), isNew: true }
}

export async function leaveSession(sessionIdRaw: string): Promise<{ ok: boolean }> {
  const sessionId = sessionIdRaw.trim()
  if (!sessionId) {
    return { ok: false }
  }
  return { ok: await clearSession(sessionId) }
}

export async function hasUserAccount(usernameRaw: string): Promise<boolean> {
  const storage = await getStorage()
  return !!(await storage.getUser(normalizeUsername(usernameRaw).toLowerCase()))
}

export async function resetDemoIdentity(
  usernameRaw: string,
  sessionIdRaw: string
): Promise<{ ok: boolean }> {
  const username = normalizeUsername(usernameRaw)
  const sessionId = sessionIdRaw.trim()
  if (!username || !sessionId) {
    return { ok: false }
  }

  const key = username.toLowerCase()
  const sessionKey = await getSessionUsername(sessionId)
  if (!sessionKey || sessionKey !== key) {
    return { ok: false }
  }

  const storage = await getStorage()
  const existing = await storage.getUser(key)
  if (!existing) {
    return { ok: false }
  }

  const destroyCharacterId = existing.characterId?.trim()
  await commitConstitutionalOccurrence({
    message: `${existing.username} destroyed demo character`,
    kind: 'destroy',
    participants: [existing.username],
    characterIds: destroyCharacterId ? [destroyCharacterId] : undefined,
  })

  const resetKeys = await storage.getResetIdentityKeys()
  resetKeys.add(key)
  await storage.addResetIdentityKey(key)

  const destroyed = await storage.getDestroyedKeys()
  destroyed.add(key)
  await storage.addDestroyedKey(key)

  await storage.deleteUser(key)

  const offers = await storage.getAllOffers()
  for (const [id, offer] of offers.entries()) {
    if (offer.from.toLowerCase() !== key && offer.to.toLowerCase() !== key) continue
    if (offer.status === 'completed') continue
    await storage.deleteOffer(id)
    await cancelActiveExchangesForOffer(id)
  }

  const exchanges = await storage.getAllExchanges()
  for (const [id, exchange] of exchanges.entries()) {
    if (exchange.from.toLowerCase() !== key && exchange.to.toLowerCase() !== key) continue
    if (exchange.status === 'completed') continue
    await storage.deleteExchange(id)
  }

  await clearSession(sessionId)
  await clearSessionsForUsername(username)

  return { ok: true }
}

export async function lookupUsername(usernameRaw: string): Promise<{ exists: boolean; username: string }> {
  const username = normalizeUsername(usernameRaw)
  const storage = await getStorage()
  const user = await storage.getUser(username.toLowerCase())
  return { exists: !!user, username: user?.username ?? username }
}

export async function getStateForSession(sessionIdRaw: string): Promise<WorkhouseState> {
  const sessionId = sessionIdRaw.trim()
  if (!sessionId) {
    throw new WorkhouseError('unauthenticated', WorkhouseMessages.sessionNotBound)
  }

  const key = await getSessionUsername(sessionId)
  if (!key) {
    throw new WorkhouseError('unauthenticated', WorkhouseMessages.sessionNotBound)
  }

  // For demo: allow re-entry with same name after reset (don't block on resetKeys)

  const storage = await getStorage()
  const user = await storage.getUser(key)
  if (!user) {
    throw new WorkhouseError('unauthenticated', WorkhouseMessages.sessionNotBound)
  }

  return getState(user.username)
}

export async function getState(usernameRaw: string): Promise<WorkhouseState> {
  const key = normalizeUsername(usernameRaw).toLowerCase()
  const storage = await getStorage()
  const user = await storage.getUser(key)
  if (!user) {
    throw new WorkhouseError('unknown_user', WorkhouseMessages.unknownUser(normalizeUsername(usernameRaw)))
  }

  const allUsers = await storage.getAllUsers()
  const allOffers = await storage.getAllOffers()
  const allExchanges = await storage.getAllExchanges()
  const audit = await storage.getAudit()

  const incomingOffers: WorkhouseOffer[] = []
  const outgoingOffers: WorkhouseOffer[] = []
  const counteredOffers: WorkhouseOffer[] = []
  const rejectedOffers: WorkhouseOffer[] = []
  const activeExchanges: WorkhouseExchange[] = []

  for (const offer of allOffers.values()) {
    const isRecipient = offer.to.toLowerCase() === key
    const isSender = offer.from.toLowerCase() === key

    if (
      isRecipient &&
      (offer.status === 'pending' || offer.status === 'accepted' || offer.status === 'countered')
    ) {
      incomingOffers.push(offer)
    }
    if (isSender && (offer.status === 'pending' || offer.status === 'accepted')) {
      outgoingOffers.push(offer)
    }
    if (isSender && offer.status === 'countered') {
      counteredOffers.push(offer)
    }
  }

  for (const exchange of allExchanges.values()) {
    const involved =
      exchange.from.toLowerCase() === key || exchange.to.toLowerCase() === key
    if (!involved || exchange.status === 'completed') continue

    const linkedOffer = allOffers.get(exchange.offerId)
    if (!linkedOffer || linkedOffer.status === 'rejected' || linkedOffer.status === 'completed') {
      continue
    }
    if (linkedOffer.status !== 'accepted') continue

    activeExchanges.push(exchange)
  }

  incomingOffers.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  outgoingOffers.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  counteredOffers.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  rejectedOffers.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  activeExchanges.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const userAudit = await filterAuditForUser(user)
  const fedData = computeFederationData({
    participantCount: allUsers.size,
    audit,
    exchanges: allExchanges.values(),
    offers: allOffers.values(),
  })

  return {
    user: {
      ...toPublicUser(user),
      receivedMoney: user.receivedMoney ?? [],
    },
    incomingOffers,
    outgoingOffers,
    counteredOffers,
    rejectedOffers,
    activeExchanges,
    audit: userAudit,
    communityParticipationAudit: filterFederationParticipationAudit(audit),
    federationData: fedData,
    characterDisplayContext: await buildCharacterDisplayContext(),
  }
}

export async function createOffer(input: {
  from: string
  to: string
  giveType?: ExchangeValueType
  giveCreditAmount?: number
  giveAsset?: string
  giveMoneyAmount?: number
  gesture?: string
  returnType: ExchangeValueType
  creditAmount?: number
  returnAsset?: string
  returnGesture?: string
  moneyAmount?: number
}): Promise<WorkhouseOffer> {
  const storage = await getStorage()
  const fromUser = await storage.getUser(input.from.toLowerCase())
  if (!fromUser) {
    throw new WorkhouseError('unknown_user', WorkhouseMessages.unknownUser(input.from))
  }
  const toUsername = normalizeUsername(input.to)
  const toUser = await storage.getUser(toUsername.toLowerCase())

  if (!toUser) {
    throw new WorkhouseError('unknown_recipient', WorkhouseMessages.unknownRecipient(toUsername))
  }
  if (fromUser.username.toLowerCase() === toUser.username.toLowerCase()) {
    throw new WorkhouseError('self_offer', WorkhouseMessages.selfOffer)
  }

  const give = await parseGiveSide(input, fromUser)
  const receive = parseReceiveSide(input)
  assertCompatibleExchangeTypes(give.giveType, receive.returnType)

  const offer: WorkhouseOffer = {
    id: newId('offer'),
    from: fromUser.username,
    to: toUser.username,
    giveType: give.giveType,
    giveCreditAmount: give.giveCreditAmount,
    giveMoneyAmount: give.giveMoneyAmount,
    gesture: give.gesture,
    returnType: receive.returnType,
    creditAmount: receive.creditAmount,
    returnGesture: receive.returnGesture,
    moneyAmount: receive.moneyAmount,
    status: 'pending',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  await assertSenderCanAffordOfferCredits(offer, fromUser)

  await commitConstitutionalOccurrence({
    message: proposedExchangeAuditMessage(fromUser.username, toUser.username, offer),
    kind: 'offer',
    participants: auditParticipantNames(fromUser.username, toUser.username),
    offerId: offer.id,
  })

  await storage.setOffer(offer.id, offer)
  return offer
}

export async function acceptOffer(offerId: string, actor: string): Promise<WorkhouseExchange> {
  const storage = await getStorage()
  const offer = await storage.getOffer(offerId)
  if (!offer) {
    throw new WorkhouseError('not_found', WorkhouseMessages.offerNotFound)
  }

  const actorUser = await storage.getUser(actor.toLowerCase())
  if (!actorUser) {
    throw new WorkhouseError('unauthenticated', WorkhouseMessages.sessionNotBound)
  }
  if (offer.to.toLowerCase() !== actorUser.username.toLowerCase()) {
    throw new WorkhouseError('forbidden', WorkhouseMessages.onlyRecipientAccept)
  }
  if (offer.status !== 'pending' && offer.status !== 'countered') {
    throw new WorkhouseError('invalid_state', WorkhouseMessages.offerCannotAccept)
  }

  await assertRecipientCanAffordCredits(offer, actorUser)

  const exchange: WorkhouseExchange = {
    id: newId('exchange'),
    offerId: offer.id,
    from: offer.from,
    to: offer.to,
    ...exchangeGiveFields(offer),
    returnType: offer.returnType,
    creditAmount: offer.creditAmount,
    returnGesture: offer.returnGesture,
    moneyAmount: offer.moneyAmount,
    status: 'accepted',
    createdAt: nowIso(),
  }

  await commitConstitutionalOccurrence({
    message: `${actorUser.username} accepted offer from ${offer.from}: ${giveTermsText(offer)} for ${receiveTermsText(offer)}`,
    kind: 'accept',
    participants: auditParticipantNames(offer.from, offer.to, actorUser.username),
    offerId: offer.id,
    exchangeId: exchange.id,
  })

  offer.status = 'accepted'
  offer.updatedAt = nowIso()
  await storage.setOffer(offer.id, offer)
  await storage.setExchange(exchange.id, exchange)
  return exchange
}

export async function rejectOffer(offerId: string, actor: string): Promise<WorkhouseOffer> {
  const storage = await getStorage()
  const offer = await storage.getOffer(offerId)
  if (!offer) {
    throw new WorkhouseError('not_found', WorkhouseMessages.offerNotFound)
  }

  const actorUser = await storage.getUser(actor.toLowerCase())
  if (!actorUser) {
    throw new WorkhouseError('unauthenticated', WorkhouseMessages.sessionNotBound)
  }
  const isSender = offer.from.toLowerCase() === actorUser.username.toLowerCase()
  const isRecipient = offer.to.toLowerCase() === actorUser.username.toLowerCase()

  if (!isSender && !isRecipient) {
    throw new WorkhouseError('forbidden', WorkhouseMessages.onlyRecipientReject)
  }

  const isPending = offer.status === 'pending'
  const isCountered = offer.status === 'countered'
  const canReject = isPending || isCountered
  if (!canReject) {
    throw new WorkhouseError('invalid_state', WorkhouseMessages.offerCannotReject)
  }

  const isCounterDecline = isCountered && isSender

  if (isCounterDecline) {
    await commitConstitutionalOccurrence({
      message: `${actorUser.username} rejected ${offer.to}'s counteroffer: ${giveTermsText(offer)} for ${receiveTermsText(offer)}`,
      kind: 'reject',
      participants: auditParticipantNames(offer.from, offer.to, actorUser.username),
      offerId: offer.id,
    })
  } else {
    await commitConstitutionalOccurrence({
      message: `${actorUser.username} rejected ${offer.from}'s offer: ${giveTermsText(offer)} for ${receiveTermsText(offer)}`,
      kind: 'reject',
      participants: auditParticipantNames(offer.from, offer.to, actorUser.username),
      offerId: offer.id,
    })
  }

  offer.status = 'rejected'
  offer.rejectionMessage = 'Sorry, no thanks.'
  offer.updatedAt = nowIso()
  await storage.setOffer(offer.id, offer)
  await cancelActiveExchangesForOffer(offer.id)
  return offer
}

export async function counterOffer(
  offerId: string,
  actor: string,
  input: {
    returnType?: ExchangeValueType
    creditAmount?: number
    returnAsset?: string
    returnGesture?: string
    moneyAmount?: number
  }
): Promise<WorkhouseOffer> {
  const storage = await getStorage()
  const offer = await storage.getOffer(offerId)
  if (!offer) {
    throw new WorkhouseError('not_found', WorkhouseMessages.offerNotFound)
  }

  const actorUser = await storage.getUser(actor.toLowerCase())
  if (!actorUser) {
    throw new WorkhouseError('unauthenticated', WorkhouseMessages.sessionNotBound)
  }
  if (offer.to.toLowerCase() !== actorUser.username.toLowerCase()) {
    throw new WorkhouseError('forbidden', WorkhouseMessages.onlyRecipientCounter)
  }
  if (offer.status !== 'pending') {
    throw new WorkhouseError('invalid_state', WorkhouseMessages.offerCannotCounter)
  }

  const receive = parseReceiveSide(
    {
      returnType: input.returnType ?? offer.returnType,
      creditAmount:
        input.creditAmount !== undefined && input.creditAmount !== null
          ? input.creditAmount
          : offer.creditAmount,
      returnAsset: input.returnAsset ?? input.returnGesture ?? offer.returnGesture,
      returnGesture: input.returnAsset ?? input.returnGesture ?? offer.returnGesture,
      moneyAmount:
        input.moneyAmount !== undefined && input.moneyAmount !== null
          ? input.moneyAmount
          : offer.moneyAmount,
    },
    actorUser
  )
  assertCompatibleExchangeTypes(offer.giveType ?? 'asset', receive.returnType)

  const counterTermsView: WorkhouseOffer = {
    ...offer,
    returnType: receive.returnType,
    creditAmount: receive.creditAmount,
    returnGesture: receive.returnGesture,
    moneyAmount: receive.moneyAmount,
  }

  await commitConstitutionalOccurrence({
    message: `${actorUser.username} counter-offered ${offer.from} with ${receiveTermsText(counterTermsView)} in exchange for ${giveTermsText(offer)}`,
    kind: 'counter',
    participants: auditParticipantNames(offer.from, offer.to, actorUser.username),
    offerId: offer.id,
  })

  if (!offer.originalTerms) {
    offer.originalTerms = {
      returnType: offer.returnType,
      creditAmount: offer.creditAmount,
      returnGesture: offer.returnGesture,
      moneyAmount: offer.moneyAmount,
    }
  }

  offer.returnType = receive.returnType
  offer.creditAmount = receive.creditAmount
  offer.returnGesture = receive.returnGesture
  offer.moneyAmount = receive.moneyAmount

  offer.status = 'countered'
  offer.updatedAt = nowIso()

  await storage.setOffer(offer.id, offer)
  return offer
}

export async function acceptCounterOffer(offerId: string, actor: string): Promise<WorkhouseExchange> {
  const storage = await getStorage()
  const offer = await storage.getOffer(offerId)
  if (!offer) {
    throw new WorkhouseError('not_found', WorkhouseMessages.offerNotFound)
  }

  const actorUser = await storage.getUser(actor.toLowerCase())
  if (!actorUser) {
    throw new WorkhouseError('unauthenticated', WorkhouseMessages.sessionNotBound)
  }
  if (offer.from.toLowerCase() !== actorUser.username.toLowerCase()) {
    throw new WorkhouseError('forbidden', WorkhouseMessages.onlySenderAcceptCounter)
  }
  if (offer.status !== 'countered') {
    throw new WorkhouseError('invalid_state', WorkhouseMessages.offerNotAwaitingCounter)
  }

  const recipient = await storage.getUser(offer.to.toLowerCase())
  if (!recipient) {
    throw new WorkhouseError('unknown_user', WorkhouseMessages.unknownUser(offer.to))
  }
  await assertRecipientCanAffordCredits(offer, recipient)

  const exchange: WorkhouseExchange = {
    id: newId('exchange'),
    offerId: offer.id,
    from: offer.from,
    to: offer.to,
    ...exchangeGiveFields(offer),
    returnType: offer.returnType,
    creditAmount: offer.creditAmount,
    returnGesture: offer.returnGesture,
    moneyAmount: offer.moneyAmount,
    status: 'accepted',
    createdAt: nowIso(),
  }

  await commitConstitutionalOccurrence({
    message: `${actorUser.username} accepted counteroffer from ${offer.to}: ${receiveTermsText(offer)} for ${giveTermsText(offer)}`,
    kind: 'accept-counter',
    participants: auditParticipantNames(offer.from, offer.to, actorUser.username),
    offerId: offer.id,
    exchangeId: exchange.id,
  })

  offer.status = 'accepted'
  offer.acceptedViaCounter = true
  offer.updatedAt = nowIso()
  await storage.setOffer(offer.id, offer)
  await storage.setExchange(exchange.id, exchange)
  return exchange
}

export async function completeExchange(exchangeId: string, actor: string): Promise<WorkhouseExchange> {
  const storage = await getStorage()
  const exchange = await storage.getExchange(exchangeId)
  if (!exchange) {
    throw new WorkhouseError('not_found', WorkhouseMessages.exchangeNotFound)
  }

  const actorUser = await storage.getUser(actor.toLowerCase())
  if (!actorUser) {
    throw new WorkhouseError('unauthenticated', WorkhouseMessages.sessionNotBound)
  }
  const involved =
    exchange.from.toLowerCase() === actorUser.username.toLowerCase() ||
    exchange.to.toLowerCase() === actorUser.username.toLowerCase()
  if (!involved) {
    throw new WorkhouseError('forbidden', WorkhouseMessages.exchangeNotParticipant)
  }
  if (exchange.status === 'completed') {
    throw new WorkhouseError('invalid_state', WorkhouseMessages.exchangeAlreadyCompleted)
  }

  const fromUser = await storage.getUser(exchange.from.toLowerCase())
  const toUser = await storage.getUser(exchange.to.toLowerCase())
  if (!fromUser || !toUser) {
    throw new WorkhouseError('not_found', WorkhouseMessages.exchangeNotParticipant)
  }

  try {
    assertPartiesCanAffordCreditsOnComplete(exchange, fromUser, toUser)
    settleExchangeValues(exchange, fromUser, toUser)
    await storage.setUser(fromUser.username.toLowerCase(), fromUser)
    await storage.setUser(toUser.username.toLowerCase(), toUser)
  } catch (err) {
    await cancelActiveExchangesForOffer(exchange.offerId)
    throw err
  }

  await commitConstitutionalOccurrence({
    message: `Offer completed — ${exchange.from} ↔ ${exchange.to}: ${giveTermsText(exchange)} for ${receiveTermsText(exchange)}`,
    kind: 'complete',
    participants: auditParticipantNames(exchange.from, exchange.to, actorUser.username),
    offerId: exchange.offerId,
    exchangeId: exchange.id,
  })

  exchange.status = 'completed'
  exchange.completedAt = nowIso()

  const offer = await storage.getOffer(exchange.offerId)
  if (offer) {
    offer.status = 'completed'
    offer.updatedAt = nowIso()
    await storage.setOffer(offer.id, offer)
  }

  await storage.setExchange(exchange.id, exchange)
  return exchange
}
