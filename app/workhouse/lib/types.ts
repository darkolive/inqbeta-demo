import type { CharacterDisplayContext } from './character-display'

export type ExchangeValueType = 'credits' | 'asset' | 'money'

/** @deprecated Use ExchangeValueType */
export type ReturnType = ExchangeValueType

export type OfferStatus =
  | 'pending'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'completed'

export type ExchangeStatus = 'accepted' | 'waiting' | 'completed'

export type GestureAsset = {
  gesture: string
  from: string
  at?: string
}

export type MoneyReceipt = {
  amount: number
  from: string
  at?: string
}

export type WorkhouseUser = {
  username: string
  characterId: string
  credits: number
  receivedGestures: GestureAsset[]
  receivedMoney: MoneyReceipt[]
  createdAt: string
  passwordHash?: string
  passwordSalt?: string
}

export type GetInvolvedSubmission = {
  email: string
  name?: string
  note?: string
  submittedAt: string
}

export type WorkhouseOffer = {
  id: string
  from: string
  to: string
  giveType: ExchangeValueType
  giveCreditAmount?: number
  giveMoneyAmount?: number
  gesture: string
  returnType: ExchangeValueType
  creditAmount?: number
  returnGesture?: string
  moneyAmount?: number
  status: OfferStatus
  rejectionMessage?: string
  originalTerms?: OfferTerms
  acceptedViaCounter?: boolean
  createdAt: string
  updatedAt: string
}

export type WorkhouseExchange = {
  id: string
  offerId: string
  from: string
  to: string
  giveType: ExchangeValueType
  giveCreditAmount?: number
  giveMoneyAmount?: number
  gesture: string
  returnType: ExchangeValueType
  creditAmount?: number
  returnGesture?: string
  moneyAmount?: number
  status: ExchangeStatus
  createdAt: string
  completedAt?: string
}

export type AuditKind =
  | 'join'
  | 'offer'
  | 'accept'
  | 'accept-counter'
  | 'reject'
  | 'counter'
  | 'complete'
  | 'destroy'
  | 'help-stay-in-touch'
  | 'help-report-issue'
  | 'help-review'

export type OfferTerms = {
  returnType: ExchangeValueType
  creditAmount?: number
  returnGesture?: string
  moneyAmount?: number
}

export type AuditEntry = {
  id: string
  timestamp: string
  message: string
  kind: AuditKind
  participants: string[]
  characterIds?: string[]
  offerId?: string
  exchangeId?: string
  scopeId?: string
  eventHash: string
  previousHash: string
  roomActivity?: boolean
}

export type FederationTimePoint = {
  timestamp: string
  value: number
}

export type AssetShareEntry = {
  asset: string
  count: number
  share: number
  isOther?: boolean
}

export type FederationData = {
  totalMembers: number
  federationStartedAt: string
  federationEndsAt: string
  memberGrowth: FederationTimePoint[]
  creditSupply: number
  creditsExchanged: number
  velocity: number
  federationWealth: number
  wealthGrowth: FederationTimePoint[]
  exchangeActivity: {
    accepted: number
    counteroffers: number
    rejected: number
    completed: number
    incompleteOffers: number
  }
  totalValueGained: AssetShareEntry[]
}

export type WorkhouseState = {
  user: WorkhouseUser
  incomingOffers: WorkhouseOffer[]
  outgoingOffers: WorkhouseOffer[]
  counteredOffers: WorkhouseOffer[]
  rejectedOffers: WorkhouseOffer[]
  activeExchanges: WorkhouseExchange[]
  audit: AuditEntry[]
  communityParticipationAudit: AuditEntry[]
  federationData: FederationData
  characterDisplayContext: CharacterDisplayContext
}

export type { CharacterDisplayContext } from './character-display'
