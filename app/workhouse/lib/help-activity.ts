import type { AuditEntry, AuditKind } from './types'
import type {
  HelpSignalRecord,
  HelpSignalType,
  IssueCategory,
  StayInTouchOption,
} from './help-signals'
import { mapStayInTouchSelectionsToSignals } from './help-signals'

export const HELP_RECEIPT_KINDS = [
  'help-stay-in-touch',
  'help-report-issue',
  'help-review',
] as const satisfies readonly AuditKind[]

export type HelpReceiptKind = (typeof HELP_RECEIPT_KINDS)[number]

export const HELP_RECEIPT_HASH_ORIGIN = 'help-local'

function sha256Hex(message: string): string {
  return browserSha256Hex(message)
}

function evidenceHash(payload: string): string {
  return browserSha256Hex(payload).slice(0, 16)
}

function browserSha256Hex(message: string): string {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ])
  const bytes = new TextEncoder().encode(message)
  const bitLength = bytes.length * 8
  const withOne = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6)
  withOne.set(bytes)
  withOne[bytes.length] = 0x80
  const view = new DataView(withOne.buffer)
  view.setUint32(withOne.length - 4, bitLength, false)

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ])
  const w = new Uint32Array(64)

  for (let offset = 0; offset < withOne.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false)
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 =
        rightRotate(w[i - 15], 7) ^
        rightRotate(w[i - 15], 18) ^
        (w[i - 15] >>> 3)
      const s1 =
        rightRotate(w[i - 2], 17) ^
        rightRotate(w[i - 2], 19) ^
        (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let a = h[0]
    let b = h[1]
    let c = h[2]
    let d = h[3]
    let e = h[4]
    let f = h[5]
    let g = h[6]
    let hh = h[7]

    for (let i = 0; i < 64; i += 1) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    h[0] = (h[0] + a) >>> 0
    h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0
    h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0
    h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0
    h[7] = (h[7] + hh) >>> 0
  }

  return Array.from(h, (value) => value.toString(16).padStart(8, '0')).join('')
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount))
}

function helpAuditKind(type: HelpSignalType): AuditKind {
  switch (type) {
    case 'stay_in_touch':
      return 'help-stay-in-touch'
    case 'report_issue':
      return 'help-report-issue'
    case 'review_experience':
      return 'help-review'
  }
}

export function buildStayInTouchActivityMessage(
  selected: readonly StayInTouchOption[],
): string {
  const topics = mapStayInTouchSelectionsToSignals(selected)
  if (topics.length === 0) {
    return 'You asked to stay in touch'
  }
  return `You asked to stay in touch about: ${topics.join(', ')}`
}

export function buildReportIssueActivityMessage(input: {
  title?: string
  description?: string
  category?: IssueCategory | null | undefined
}): string {
  const lines: string[] = ['You reported an issue:']
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const description =
    typeof input.description === 'string' ? input.description.trim() : ''
  const category = input.category

  if (title) {
    lines.push(`"${title}"`)
  }
  if (category) {
    if (lines.length > 1) lines.push('')
    lines.push(`Category: ${category}`)
  }
  if (description) {
    if (lines.length > 1) lines.push('')
    lines.push('Description:')
    lines.push(`"${description}"`)
  }
  return lines.join('\n')
}

export const REVIEW_EXPERIENCE_ACTIVITY_MESSAGE = 'You reviewed your experience'

export function buildReviewExperienceActivityMessage(input: {
  easy: number
  safe: number
  clear: number
  useAgain: number
  comments?: string
}): string {
  const lines = [
    REVIEW_EXPERIENCE_ACTIVITY_MESSAGE,
    '',
    `Easy: ${input.easy} / 5`,
    `Safe: ${input.safe} / 5`,
    `Language clear: ${input.clear} / 5`,
    `Use again: ${input.useAgain} / 5`,
  ]
  const comments = typeof input.comments === 'string' ? input.comments.trim() : ''
  if (comments) {
    lines.push('')
    lines.push('Comment:')
    lines.push(`"${comments}"`)
  }
  return lines.join('\n')
}

export function buildHelpActivityMessage(record: HelpSignalRecord): string {
  switch (record.type) {
    case 'stay_in_touch': {
      const selected = Array.isArray(record.payload.selected)
        ? (record.payload.selected as StayInTouchOption[])
        : []
      return buildStayInTouchActivityMessage(selected)
    }
    case 'report_issue':
      return buildReportIssueActivityMessage({
        title:
          typeof record.payload.title === 'string'
            ? record.payload.title
            : undefined,
        description:
          typeof record.payload.description === 'string'
            ? record.payload.description
            : undefined,
        category: record.payload.category as IssueCategory | null | undefined,
      })
    case 'review_experience':
      return buildReviewExperienceActivityMessage({
        easy: Number(record.payload.easy) || 0,
        safe: Number(record.payload.safe) || 0,
        clear: Number(record.payload.clear) || 0,
        useAgain: Number(record.payload.useAgain) || 0,
        comments:
          typeof record.payload.comments === 'string'
            ? record.payload.comments
            : undefined,
      })
  }
}

export function isHelpReceiptKind(kind: AuditKind): kind is HelpReceiptKind {
  return (HELP_RECEIPT_KINDS as readonly AuditKind[]).includes(kind)
}

export function filterHelpReceipts(receipts: readonly AuditEntry[]): AuditEntry[] {
  return receipts.filter((entry) => isHelpReceiptKind(entry.kind))
}

export function helpReceiptKindLabel(kind: HelpReceiptKind): string {
  switch (kind) {
    case 'help-stay-in-touch':
      return 'Stay in touch'
    case 'help-report-issue':
      return 'Report issue'
    case 'help-review':
      return 'Experience review'
  }
}

/** Calm History bank index label — receipt type only; detail lives in Activity. */
export function helpReceiptIndexTitle(entry: AuditEntry): string {
  return isHelpReceiptKind(entry.kind)
    ? helpReceiptKindLabel(entry.kind)
    : 'Help'
}

export function createHelpReceipt(
  record: HelpSignalRecord,
  previousReceipt: AuditEntry | undefined,
): AuditEntry {
  const kind = helpAuditKind(record.type)
  const message = buildHelpActivityMessage(record)
  const participants = record.characterUsername?.trim()
    ? [record.characterUsername.trim()]
    : []
  const previousHash = previousReceipt?.eventHash ?? HELP_RECEIPT_HASH_ORIGIN
  const scopeId = record.id
  const id = `help_${record.id}`

  const hashPayload = JSON.stringify({
    id,
    timestamp: record.timestamp,
    message,
    kind,
    participants,
    scopeId,
    signalId: record.id,
    previousHash,
  })

  return {
    id,
    timestamp: record.timestamp,
    message,
    kind,
    participants,
    scopeId,
    eventHash: evidenceHash(hashPayload),
    previousHash,
  }
}

export function attachHelpReceipt(
  record: HelpSignalRecord,
  existingRecords: readonly HelpSignalRecord[],
): HelpSignalRecord {
  const sorted = [...existingRecords].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  )
  // Simplified for demo - don't chain receipts
  return record
}

export function helpReceiptsFromSignals(
  records: readonly HelpSignalRecord[],
): AuditEntry[] {
  const sorted = [...records].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  )
  const receipts: AuditEntry[] = []
  let previous: AuditEntry | undefined
  for (const record of sorted) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const receipt = (record as any).receipt ?? createHelpReceipt(record, previous)
    receipts.push(receipt)
    previous = receipt
  }
  return receipts.reverse()
}

export function helpReceiptsForUser(
  records: readonly HelpSignalRecord[],
  username: string,
  characterId?: string,
): AuditEntry[] {
  const key = username.trim().toLowerCase()
  const activeCharacterId = characterId?.trim()
  const owned = records.filter((record) => {
    const recordCharacterId = record.characterId?.trim()
    if (activeCharacterId) {
      if (recordCharacterId) return recordCharacterId === activeCharacterId
      return false
    }
    const owner = record.characterUsername?.trim().toLowerCase()
    return !owner || owner === key
  })
  return helpReceiptsFromSignals(owned)
}

export function mergeActivityWithHelpReceipts(
  serverAudit: AuditEntry[],
  helpReceipts: AuditEntry[],
): AuditEntry[] {
  return [...serverAudit, ...helpReceipts].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  )
}

export function formatHelpActivityMessagePlain(entry: AuditEntry): string {
  return entry.message.replace(/\n+/g, ' — ')
}
