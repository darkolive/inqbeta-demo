import { jsPDF } from 'jspdf'
import {
  filterHelpReceipts,
  helpReceiptsForUser,
  isHelpReceiptKind,
  mergeActivityWithHelpReceipts,
} from './help-activity'
import { loadHelpSignals } from './help-signals'
import type { AuditEntry, FederationData, MoneyReceipt, WorkhouseState, WorkhouseUser } from './types'
import { formatVelocity } from './federation-data'

export const FEDERATION_DATA_SNAPSHOT_HEADING = 'Activity snapshot'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 18
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const EXPORT_LOGO_WIDTH = 44
const EXPORT_LOGO_HEIGHT = EXPORT_LOGO_WIDTH * (309 / 1317)
const WEALTH_FORMULA_WIDTH = 88
const WEALTH_FORMULA_HEIGHT = WEALTH_FORMULA_WIDTH * (308 / 1031)

const INTRO_TEXT =
  'This is your personal story of exchange and participation during this proof-of-concept demo — offers completed, support given, and the receipts that remember them.'

const DISCLAIMER =
  'This was generated from a local festival demonstrator. It is a personal record, not a legal receipt or financial statement.'

type CreditMovement = {
  delta: number
  label: string
  timestamp: string
  hash: string
}

export type StoryExportData = {
  username: string
  exportedAt: string
  filenameDate: string
  intro: string
  creditsRemaining: number
  openingBalance: number
  totalCash: string
  offersReceived: { gesture: string; from: string }[]
  creditHistory: CreditMovement[]
  activity: AuditEntry[]
  supportReceipts: AuditEntry[]
  federationData: FederationData
}

export function exchangeActivityEntries(entries: readonly AuditEntry[]): AuditEntry[] {
  return entries.filter((entry) => !isHelpReceiptKind(entry.kind))
}

function isSelf(name: string, currentUser: string) {
  return name.toLowerCase() === currentUser.toLowerCase()
}

function displayName(name: string, currentUser: string) {
  return isSelf(name, currentUser) ? 'You' : name
}

function formatMoneyLabel(amount: number) {
  if (!amount) return '£0'
  return amount % 1 === 0 ? `£${amount}` : `£${amount.toFixed(2)}`
}

function totalCashReceived(receipts: MoneyReceipt[]) {
  return receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
}

function buildCreditHistory(audit: AuditEntry[], username: string): CreditMovement[] {
  const key = username.toLowerCase()
  const rows: CreditMovement[] = []

  for (const entry of [...audit].reverse()) {
    if (entry.kind === 'join') {
      const m = entry.message.match(/^(.+) joined with (\d+) demo credits$/)
      if (!m) continue
      const [, who, credits] = m
      if (who.toLowerCase() !== key) continue
      rows.push({
        delta: Number(credits),
        label: 'Joined session',
        timestamp: entry.timestamp,
        hash: entry.eventHash,
      })
      continue
    }

    if (entry.kind === 'complete') {
      const m = entry.message.match(/^(?:Exchange|Offer) completed — (.+) ↔ (.+): (.+) for (.+)$/)
      if (!m) continue
      const [, from, to, , terms] = m
      const creditsMatch = terms.match(/^(\d+) credits?$/)
      if (!creditsMatch) continue
      const amount = Number(creditsMatch[1])
      if (to.toLowerCase() === key) {
        rows.push({
          delta: -amount,
          label: 'Offer completed',
          timestamp: entry.timestamp,
          hash: entry.eventHash,
        })
      }
      if (from.toLowerCase() === key) {
        rows.push({
          delta: amount,
          label: 'Offer completed',
          timestamp: entry.timestamp,
          hash: entry.eventHash,
        })
      }
    }
  }

  return rows.reverse()
}

function openingCreditsForUser(audit: AuditEntry[], username: string) {
  const key = username.toLowerCase()
  for (const entry of audit) {
    if (entry.kind !== 'join') continue
    const m = entry.message.match(/^(.+) joined with (\d+) demo credits$/)
    if (!m || m[1].toLowerCase() !== key) continue
    return Number(m[2])
  }
  return 5
}

function formatTimestamp(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function formatShortTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

export function formatActivityMessagePlain(entry: AuditEntry, currentUser: string): string {
  switch (entry.kind) {
    case 'join': {
      const m = entry.message.match(/^(.+) joined with (\d+) demo credits$/)
      if (!m) return entry.message
      const [, who, credits] = m
      return `${displayName(who, currentUser)} joined with ${credits} demo credits`
    }
    case 'offer': {
      const proposed = entry.message.match(
        /^(.+) proposed an (?:offer to|exchange with) (.+) of (.+) in exchange for (.+)$/
      )
      if (proposed) {
        const [, from, to, give, receive] = proposed
        if (isSelf(from, currentUser)) {
          return `You proposed an offer to ${displayName(to, currentUser)} of ${give} in exchange for ${receive}.`
        }
        if (isSelf(to, currentUser)) {
          return `${displayName(from, currentUser)} proposed an offer to you of ${give} in exchange for ${receive}.`
        }
        return `${displayName(from, currentUser)} proposed an offer to ${displayName(to, currentUser)} of ${give} in exchange for ${receive}.`
      }
      const legacyProposed = entry.message.match(
        /^(.+) proposed an exchange with (.+): (.+) gives (.+) in exchange for (.+)$/
      )
      if (legacyProposed) {
        const [, from, to, , give, receive] = legacyProposed
        if (isSelf(from, currentUser)) {
          return `You proposed an offer to ${displayName(to, currentUser)} of ${give} in exchange for ${receive}.`
        }
        if (isSelf(to, currentUser)) {
          return `${displayName(from, currentUser)} proposed an offer to you of ${give} in exchange for ${receive}.`
        }
        return `${displayName(from, currentUser)} proposed an offer to ${displayName(to, currentUser)} of ${give} in exchange for ${receive}.`
      }
      const m = entry.message.match(/^(.+) offered (.+) to (.+) for (.+)$/)
      if (!m) return entry.message
      const [, from, gesture, to, terms] = m
      if (isSelf(from, currentUser)) {
        return `You offered ${gesture} to ${displayName(to, currentUser)} for ${terms}.`
      }
      if (isSelf(to, currentUser)) {
        return `${displayName(from, currentUser)} offered ${gesture} to you for ${terms}.`
      }
      return `${displayName(from, currentUser)} offered ${gesture} to ${displayName(to, currentUser)} for ${terms}.`
    }
    case 'accept': {
      const m = entry.message.match(/^(.+) accepted offer from (.+): (.+) for (.+)$/)
      if (!m) {
        const legacy = entry.message.match(/^(.+) accepted offer from (.+)$/)
        if (!legacy) return entry.message
        const [, actor, from] = legacy
        if (isSelf(actor, currentUser)) return 'You accepted this offer.'
        if (isSelf(from, currentUser)) return `${displayName(actor, currentUser)} accepted your offer.`
        return `${displayName(actor, currentUser)} accepted an offer from ${displayName(from, currentUser)}.`
      }
      const [, actor, from, gesture, terms] = m
      if (isSelf(actor, currentUser)) {
        return `You accepted this offer of ${gesture} in exchange for ${terms}.`
      }
      if (isSelf(from, currentUser)) {
        return `${displayName(actor, currentUser)} accepted your offer of ${gesture} in exchange for ${terms}.`
      }
      return `${displayName(actor, currentUser)} accepted an offer from ${displayName(from, currentUser)} of ${gesture} in exchange for ${terms}.`
    }
    case 'accept-counter': {
      const m = entry.message.match(/^(.+) accepted counteroffer from (.+): (.+) for (.+)$/)
      if (!m) return entry.message
      const [, actor, counterparty, counterReturn, originalItem] = m
      if (isSelf(actor, currentUser)) {
        return `You accepted ${displayName(counterparty, currentUser)}'s counteroffer of ${counterReturn} in exchange for ${originalItem}.`
      }
      if (isSelf(counterparty, currentUser)) {
        return `${displayName(actor, currentUser)} accepted your counteroffer of ${counterReturn} in exchange for ${originalItem}.`
      }
      return `${displayName(actor, currentUser)} accepted ${displayName(counterparty, currentUser)}'s counteroffer of ${counterReturn} in exchange for ${originalItem}.`
    }
    case 'reject': {
      const counter = entry.message.match(/^(.+) rejected (.+)'s counteroffer: (.+) for (.+)$/)
      if (counter) {
        const [, actor, counterparty, counterReturn, originalItem] = counter
        if (isSelf(actor, currentUser)) {
          return `You rejected ${displayName(counterparty, currentUser)}'s counteroffer of ${counterReturn} in exchange for ${originalItem}.`
        }
        if (isSelf(counterparty, currentUser)) {
          return `${displayName(actor, currentUser)} rejected your counteroffer of ${counterReturn} in exchange for ${originalItem}.`
        }
        return `${displayName(actor, currentUser)} rejected ${displayName(counterparty, currentUser)}'s counteroffer of ${counterReturn} in exchange for ${originalItem}.`
      }

      const m = entry.message.match(/^(.+) rejected (.+)'s offer: (.+) for (.+)$/)
      if (!m) {
        const legacy = entry.message.match(/^(.+) rejected (.+)'s offer$/)
        if (!legacy) return entry.message
        const [, actor, from] = legacy
        if (isSelf(actor, currentUser)) {
          return `You rejected ${displayName(from, currentUser)}'s offer`
        }
        if (isSelf(from, currentUser)) {
          return `${displayName(actor, currentUser)} rejected your offer`
        }
        return `${displayName(actor, currentUser)} rejected ${displayName(from, currentUser)}'s offer`
      }
      const [, actor, from, gesture, terms] = m
      if (isSelf(actor, currentUser)) {
        return `You rejected ${displayName(from, currentUser)}'s offer of ${gesture} in exchange for ${terms}.`
      }
      if (isSelf(from, currentUser)) {
        return `${displayName(actor, currentUser)} rejected your offer of ${gesture} in exchange for ${terms}.`
      }
      return `${displayName(actor, currentUser)} rejected ${displayName(from, currentUser)}'s offer of ${gesture} in exchange for ${terms}.`
    }
    case 'counter': {
      const m = entry.message.match(/^(.+) counter-offered (.+) with (.+) in exchange for (.+)$/)
      if (!m) return entry.message
      const [, actor, from, counterReturn, originalItem] = m
      if (isSelf(from, currentUser)) {
        return `${displayName(actor, currentUser)} counter-offered your exchange of ${originalItem} in exchange for ${counterReturn}.`
      }
      if (isSelf(actor, currentUser)) {
        return `You counter-offered ${displayName(from, currentUser)}'s exchange of ${originalItem} in exchange for ${counterReturn}.`
      }
      return `${displayName(actor, currentUser)} counter-offered ${displayName(from, currentUser)}'s exchange of ${originalItem} in exchange for ${counterReturn}.`
    }
    case 'complete': {
      const m = entry.message.match(/^(?:Exchange|Offer) completed — (.+) ↔ (.+): (.+) for (.+)$/)
      if (!m) return entry.message
      const [, from, to, gesture, terms] = m
      if (isSelf(from, currentUser)) {
        return `Offer completed between you and ${displayName(to, currentUser)} for ${gesture} in exchange for ${terms}.`
      }
      if (isSelf(to, currentUser)) {
        return `Offer completed between you and ${displayName(from, currentUser)} for ${gesture} in exchange for ${terms}.`
      }
      return `Offer completed between ${displayName(from, currentUser)} and ${displayName(to, currentUser)} for ${gesture} in exchange for ${terms}.`
    }
    case 'help-stay-in-touch':
    case 'help-report-issue':
    case 'help-review':
      return entry.message
    default:
      return entry.message
  }
}

export function formatSupportStoryLines(entry: AuditEntry): string[] {
  return entry.message.split('\n')
}

export function buildStoryFilename(username: string, exportedAt = new Date()) {
  const safeUser = username.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'participant'
  const date = exportedAt.toISOString().slice(0, 10)
  return `workhouse-story-${safeUser}-${date}.pdf`
}

export function buildStoryExportData(
  state: WorkhouseState,
  exportedAt = new Date(),
  options?: { helpReceipts?: AuditEntry[] },
): StoryExportData {
  const user = state.user
  const audit = state.audit ?? []
  const helpReceipts =
    options?.helpReceipts ??
    helpReceiptsForUser(loadHelpSignals(), user.username, user.characterId)
  const mergedActivity = mergeActivityWithHelpReceipts(audit, helpReceipts)
  const cashTotal = totalCashReceived(user.receivedMoney ?? [])

  return {
    username: user.username,
    exportedAt: exportedAt.toLocaleString(),
    filenameDate: exportedAt.toISOString().slice(0, 10),
    intro: INTRO_TEXT,
    creditsRemaining: user.credits ?? 0,
    openingBalance: openingCreditsForUser(audit, user.username),
    totalCash: formatMoneyLabel(cashTotal),
    offersReceived: (user.receivedGestures ?? []).map((item) => ({
      gesture: item.gesture,
      from: item.from,
    })),
    creditHistory: buildCreditHistory(audit, user.username),
    activity: exchangeActivityEntries(mergedActivity),
    supportReceipts: filterHelpReceipts(helpReceipts),
    federationData: state.federationData,
  }
}

async function loadImageDataUrl(path: string) {
  try {
    const response = await fetch(path)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function loadLogoDataUrl() {
  return loadImageDataUrl('/images/inqbeta-export.png')
}

async function loadWealthFormulaDataUrl() {
  return loadImageDataUrl('/images/wealth.png')
}

function downloadPdf(doc: jsPDF, filename: string) {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type PdfWriter = {
  doc: jsPDF
  getY: () => number
  advanceY: (amount: number) => void
  ensureSpace: (height: number) => void
  heading: (text: string) => void
  subheading: (text: string) => void
  body: (text: string, indent?: number) => void
  centered: (text: string) => void
  small: (text: string, indent?: number) => void
  line: () => void
}

function createPdfWriter(doc: jsPDF): PdfWriter {
  const cursor = { y: MARGIN }

  const ensureSpace = (height: number) => {
    if (cursor.y + height > PAGE_HEIGHT - MARGIN) {
      doc.addPage()
      cursor.y = MARGIN
    }
  }

  const heading = (text: string) => {
    ensureSpace(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(30, 30, 30)
    doc.text(text, MARGIN, cursor.y)
    cursor.y += 8
  }

  const subheading = (text: string) => {
    ensureSpace(10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(50, 50, 50)
    doc.text(text, MARGIN, cursor.y)
    cursor.y += 6
  }

  const body = (text: string, indent = 0) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(40, 40, 40)
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent)
    ensureSpace(lines.length * 4.5 + 2)
    doc.text(lines, MARGIN + indent, cursor.y)
    cursor.y += lines.length * 4.5 + 2
  }

  const small = (text: string, indent = 0) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent)
    ensureSpace(lines.length * 3.5 + 2)
    doc.text(lines, MARGIN + indent, cursor.y)
    cursor.y += lines.length * 3.5 + 2
  }

  const centered = (text: string) => {
    ensureSpace(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(40, 40, 40)
    doc.text(text, PAGE_WIDTH / 2, cursor.y, { align: 'center' })
    cursor.y += 6.5
  }

  const line = () => {
    ensureSpace(4)
    doc.setDrawColor(200, 200, 200)
    doc.line(MARGIN, cursor.y, PAGE_WIDTH - MARGIN, cursor.y)
    cursor.y += 5
  }

  return {
    doc,
    getY: () => cursor.y,
    advanceY: (amount: number) => {
      cursor.y += amount
    },
    ensureSpace,
    heading,
    subheading,
    body,
    centered,
    small,
    line,
  }
}

function renderBalanceSheet(writer: PdfWriter, data: StoryExportData, user: WorkhouseUser) {
  writer.heading('History bank')
  writer.body(`Credits remaining: ${data.creditsRemaining}`)
  writer.body(`Opening balance: ${data.openingBalance}`)
  writer.body(`Total cash: ${data.totalCash}`)

  writer.subheading('Actions received')
  if (!data.offersReceived.length) {
    writer.body('None yet.')
  } else {
    for (const item of data.offersReceived) {
      const label = item.gesture.charAt(0).toUpperCase() + item.gesture.slice(1)
      writer.body(`${label} from ${displayName(item.from, user.username)}`)
    }
  }

  writer.subheading('Credit transaction history')
  if (!data.creditHistory.length) {
    writer.body('No credit movements yet.')
  } else {
    for (const row of data.creditHistory) {
      const sign = row.delta > 0 ? '+' : ''
      writer.body(
        `${sign}${row.delta} credit${Math.abs(row.delta) === 1 ? '' : 's'} — ${row.label} (${formatShortTime(row.timestamp)} · ${row.hash})`
      )
    }
  }
}

function renderStoryEntry(
  writer: PdfWriter,
  entry: AuditEntry,
  messageLines: string[],
) {
  writer.ensureSpace(28)
  const dateLine = formatShortDate(entry.timestamp)
  writer.subheading(`${formatShortTime(entry.timestamp)}${dateLine ? ` · ${dateLine}` : ''}`)
  for (const line of messageLines) {
    if (line.trim()) {
      writer.body(line)
    } else {
      writer.advanceY(2)
    }
  }
  writer.small(`Proof ID: ${entry.id}`)
  if (entry.scopeId) writer.small(`Scope ID: ${entry.scopeId}`)
  writer.small(`Evidence hash: ${entry.eventHash}`)
  writer.small(`Previous hash: ${entry.previousHash}`)
  writer.line()
}

function renderActivityTimeline(writer: PdfWriter, data: StoryExportData) {
  writer.heading('Activity timeline')
  if (!data.activity.length) {
    writer.body('No exchange activity recorded yet.')
    return
  }

  for (const entry of data.activity) {
    renderStoryEntry(writer, entry, [
      formatActivityMessagePlain(entry, data.username),
    ])
  }
}

function renderSupportSection(writer: PdfWriter, data: StoryExportData) {
  if (!data.supportReceipts.length) return

  writer.heading('Support')
  writer.body(
    'Help and support actions you took in this Space. Participation here is part of your story — the same receipts also appear in Activity.',
  )

  const receipts = [...data.supportReceipts].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  )

  for (const entry of receipts) {
    renderStoryEntry(writer, entry, formatSupportStoryLines(entry))
  }
}

function renderFederationData(writer: PdfWriter, data: FederationData, wealthFormulaDataUrl: string | null) {
  writer.heading(FEDERATION_DATA_SNAPSHOT_HEADING)
  writer.body('This shows shared federation totals, not private member identities.')

  writer.subheading('Membership')
  writer.body(`Total members: ${data.totalMembers}`)

  writer.subheading('Federation wealth')
  if (wealthFormulaDataUrl) {
    writer.ensureSpace(WEALTH_FORMULA_HEIGHT + 6)
    writer.doc.addImage(
      wealthFormulaDataUrl,
      'PNG',
      MARGIN + (CONTENT_WIDTH - WEALTH_FORMULA_WIDTH) / 2,
      writer.getY(),
      WEALTH_FORMULA_WIDTH,
      WEALTH_FORMULA_HEIGHT,
    )
    writer.advanceY(WEALTH_FORMULA_HEIGHT + 6)
  }
  writer.centered('Credit supply × velocity = federation wealth')
  writer.body(`Credit supply: ${data.creditSupply}`)
  writer.body('Credits currently held by active members, based on five starter credits each.')
  writer.body(`Credits exchanged: ${data.creditsExchanged}`)
  writer.body(`Velocity: ${formatVelocity(data.velocity)}`)
  writer.body(
    'Velocity starts at 1 because held credits already represent value. It increases as credits circulate.'
  )
  writer.body(`Federation wealth: ${data.federationWealth}`)
  writer.body('Federation wealth equals credit supply multiplied by velocity.')

  writer.subheading('Exchange activity')
  const activity = data.exchangeActivity
  writer.body(
    `Offers accepted: ${activity.accepted} · Counteroffers: ${activity.counteroffers} · Rejections: ${activity.rejected} · Completed offers: ${activity.completed} · Incomplete offers: ${activity.incompleteOffers}`
  )

  writer.subheading('Total value gained')
  if (!data.totalValueGained.length) {
    writer.body('No completed action exchanges yet.')
  } else {
    for (const entry of data.totalValueGained) {
      writer.body(`${entry.asset}: ${entry.count} (${Math.round(entry.share * 100)}%)`)
    }
  }
}

function renderFooter(writer: PdfWriter) {
  writer.small(DISCLAIMER)
}

function renderStoryPdf(
  doc: jsPDF,
  data: StoryExportData,
  logoDataUrl: string | null,
  wealthFormulaDataUrl: string | null
) {
  const writer = createPdfWriter(doc)

  if (logoDataUrl) {
    writer.ensureSpace(EXPORT_LOGO_HEIGHT + 6)
    doc.addImage(
      logoDataUrl,
      'PNG',
      MARGIN,
      writer.getY(),
      EXPORT_LOGO_WIDTH,
      EXPORT_LOGO_HEIGHT,
    )
    writer.advanceY(EXPORT_LOGO_HEIGHT + 9)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(30, 30, 30)
  writer.ensureSpace(10)
  doc.text('My Story', MARGIN, writer.getY())
  writer.advanceY(10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  writer.body(`Participant: ${data.username}`)
  writer.body(`Exported: ${data.exportedAt}`)
  writer.line()

  writer.heading('Introduction')
  writer.body(data.intro)
  writer.line()

  renderBalanceSheet(writer, data, { username: data.username } as WorkhouseUser)
  writer.line()
  renderActivityTimeline(writer, data)
  if (data.supportReceipts.length) {
    writer.line()
    renderSupportSection(writer, data)
  }
  writer.line()
  renderFederationData(writer, data.federationData, wealthFormulaDataUrl)
  writer.line()
  renderFooter(writer)
}

export async function exportWorkhouseStoryPdf(state: WorkhouseState) {
  const exportedAt = new Date()
  const data = buildStoryExportData(state, exportedAt)
  const filename = buildStoryFilename(data.username, exportedAt)
  const [logoDataUrl, wealthFormulaDataUrl] = await Promise.all([
    loadLogoDataUrl(),
    loadWealthFormulaDataUrl(),
  ])
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  renderStoryPdf(doc, data, logoDataUrl, wealthFormulaDataUrl)
  downloadPdf(doc, filename)
}
