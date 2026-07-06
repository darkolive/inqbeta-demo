import {
  type StayInTouchTopic,
} from './community-interest-data'

export const HELP_SIGNALS_STORAGE_KEY = 'workhouse-help-signals'
export const HELP_SIGNALS_UPDATED_EVENT = 'workhouse-help-signals-updated'

export const HELP_SIGNAL_CONFIRMATION =
  'Thank you. Your signal has been recorded.'

export type HelpSignalType =
  | 'stay_in_touch'
  | 'report_issue'
  | 'review_experience'

export const STAY_IN_TOUCH_OPTIONS = [
  'Software contributor',
  'Academic / research interest',
  'Neurodiversity interest',
  'Community organisation',
  'Local exchange systems',
  'Festival / event interest',
  'I would like updates',
  'I just want to know more',
] as const

export type StayInTouchOption = (typeof STAY_IN_TOUCH_OPTIONS)[number]

export type IssueCategory =
  | 'Bug'
  | 'Confusing'
  | "Didn't work as expected"
  | 'Accessibility'
  | 'Other'

export type HelpSignalRecord = {
  id: string
  type: HelpSignalType
  timestamp: string
  characterUsername?: string
  characterId?: string
  payload: Record<string, unknown>
}

export const STAY_IN_TOUCH_TO_SIGNAL: Partial<
  Record<StayInTouchOption, StayInTouchTopic>
> = {
  'Software contributor': 'Software',
  'Academic / research interest': 'Research',
  'Neurodiversity interest': 'Neurodiversity',
  'Community organisation': 'Community',
  'Local exchange systems': 'Community',
  'Festival / event interest': 'Events',
  'I would like updates': 'Updates',
  'I just want to know more': 'Updates',
}

function readStorage(): HelpSignalRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HELP_SIGNALS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isHelpSignalRecord)
  } catch {
    return []
  }
}

function writeStorage(records: HelpSignalRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HELP_SIGNALS_STORAGE_KEY, JSON.stringify(records))
    window.dispatchEvent(new CustomEvent(HELP_SIGNALS_UPDATED_EVENT))
  } catch {
    // Local demonstrator capture — ignore quota or privacy errors.
  }
}

function isHelpSignalRecord(value: unknown): value is HelpSignalRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as HelpSignalRecord
  return (
    typeof record.id === 'string' &&
    typeof record.type === 'string' &&
    typeof record.timestamp === 'string' &&
    record.payload !== null &&
    typeof record.payload === 'object'
  )
}

function nextSignalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `signal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function appendSignal(
  type: HelpSignalType,
  payload: Record<string, unknown>,
  character?: { username?: string; characterId?: string },
): HelpSignalRecord {
  const records = readStorage()
  const draft: HelpSignalRecord = {
    id: nextSignalId(),
    type,
    timestamp: new Date().toISOString(),
    characterUsername: character?.username?.trim() || undefined,
    characterId: character?.characterId?.trim() || undefined,
    payload,
  }
  records.push(draft)
  writeStorage(records)
  return draft
}

export function loadHelpSignals(): HelpSignalRecord[] {
  return readStorage()
}

export function saveStayInTouchSignal(input: {
  selected: StayInTouchOption[]
  characterUsername?: string
  characterId?: string
}): HelpSignalRecord {
  return appendSignal(
    'stay_in_touch',
    { selected: input.selected },
    { username: input.characterUsername, characterId: input.characterId },
  )
}

export function saveReportIssueSignal(input: {
  title: string
  description: string
  category: IssueCategory | null
  characterUsername?: string
  characterId?: string
}): HelpSignalRecord {
  return appendSignal(
    'report_issue',
    {
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
    },
    { username: input.characterUsername, characterId: input.characterId },
  )
}

export function saveReviewExperienceSignal(input: {
  easy: number
  safe: number
  clear: number
  useAgain: number
  comments: string
  characterUsername?: string
  characterId?: string
}): HelpSignalRecord {
  return appendSignal(
    'review_experience',
    {
      easy: input.easy,
      safe: input.safe,
      clear: input.clear,
      useAgain: input.useAgain,
      comments: input.comments.trim(),
    },
    { username: input.characterUsername, characterId: input.characterId },
  )
}

export function clearHelpSignalsForCharacter(input: {
  username: string
  characterId?: string
}): void {
  const key = input.username.trim().toLowerCase()
  const characterId = input.characterId?.trim()
  const kept = readStorage().filter((record) => {
    if (characterId && record.characterId === characterId) return false
    const owner = record.characterUsername?.trim().toLowerCase()
    if (owner === key) return false
    return true
  })
  writeStorage(kept)
}

export function mapStayInTouchSelectionsToSignals(
  selected: readonly StayInTouchOption[],
): StayInTouchTopic[] {
  const mapped = new Set<StayInTouchTopic>()
  for (const option of selected) {
    const signal = STAY_IN_TOUCH_TO_SIGNAL[option]
    if (signal) mapped.add(signal)
  }
  return [...mapped]
}

export function hasSavedHelpSignals(): boolean {
  return loadHelpSignals().length > 0
}
