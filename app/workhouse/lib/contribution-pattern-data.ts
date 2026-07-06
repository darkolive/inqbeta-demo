import type { AuditEntry, AuditKind } from './types'

export const CONTRIBUTION_CATEGORIES = [
  'Exchange',
  'Support',
  'Interest',
] as const

export type ContributionCategory = (typeof CONTRIBUTION_CATEGORIES)[number]

const EXCHANGE_KINDS = new Set<AuditKind>([
  'offer',
  'accept',
  'accept-counter',
  'reject',
  'counter',
  'complete',
])

const SUPPORT_KINDS = new Set<AuditKind>([
  'help-report-issue',
  'help-review',
])

const COMMUNITY_KINDS = new Set<AuditKind>(['help-stay-in-touch'])

export function contributionCategoryForKind(
  kind: AuditKind,
): ContributionCategory | null {
  if (EXCHANGE_KINDS.has(kind)) return 'Exchange'
  if (SUPPORT_KINDS.has(kind)) return 'Support'
  if (COMMUNITY_KINDS.has(kind)) return 'Interest'
  return null
}

export function filterFederationParticipationAudit(
  audit: readonly AuditEntry[],
): AuditEntry[] {
  return audit.filter((entry) => {
    if (entry.roomActivity) return false
    return contributionCategoryForKind(entry.kind) !== null
  })
}

export type ContributionEvent = {
  timestamp: string
  category: ContributionCategory
}

export function buildContributionEvents(
  audit: readonly AuditEntry[],
  helpReceipts: readonly AuditEntry[],
): ContributionEvent[] {
  const seen = new Set<string>()
  const events: ContributionEvent[] = []

  for (const entry of [...audit, ...helpReceipts]) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    const category = contributionCategoryForKind(entry.kind)
    if (!category) continue
    events.push({ timestamp: entry.timestamp, category })
  }

  return events.sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  )
}

export type ContributionPatternPoint = {
  timestamp: string
  exchange: number
  support: number
  community: number
}

export function buildContributionPatternSeries(
  events: readonly ContributionEvent[],
): ContributionPatternPoint[] {
  let exchange = 0
  let support = 0
  let community = 0
  const points: ContributionPatternPoint[] = []

  for (const event of events) {
    switch (event.category) {
      case 'Exchange':
        exchange += 1
        break
      case 'Support':
        support += 1
        break
      case 'Interest':
        community += 1
        break
    }
    points.push({
      timestamp: event.timestamp,
      exchange,
      support,
      community,
    })
  }

  return points
}

export function hasContributionPattern(events: readonly ContributionEvent[]): boolean {
  return events.length > 0
}

export const CONTRIBUTION_PATTERN_INTRO = [
  'This is your story in this space — shaped by receipts, not scores.',
] as const

export const CONTRIBUTION_PATTERN_EMPTY =
  'Participate in this space to begin building your story.' as const

export const COMMUNITY_PARTICIPATION_EMPTY =
  'This pattern will emerge as people participate.' as const

export function buildContributionChartSeries(points: ContributionPatternPoint[]) {
  return points.map((point) => ({
    date: point.timestamp,
    exchange: point.exchange,
    support: point.support,
    community: point.community,
  }))
}

export function contributionCategoryDataKey(category: ContributionCategory): string {
  switch (category) {
    case 'Exchange':
      return 'exchange'
    case 'Support':
      return 'support'
    case 'Interest':
      return 'community'
  }
}
