/**
 * Storage abstraction layer for inqbeta-demo.
 *
 * Strategy:
 * - When KV env vars are present (Vercel deployed): use Vercel KV (Upstash Redis)
 * - When KV env vars are absent (local dev): use in-memory singleton
 *
 * Both stores expose the same interface so the rest of the code is unchanged.
 */

import type { AuditEntry, WorkhouseExchange, WorkhouseOffer, WorkhouseUser } from './types'

// ---------------------------------------------------------------------------
// KV store (Vercel / Upstash)
// ---------------------------------------------------------------------------

function isKvAvailable(): boolean {
  return !!(
    process.env.KV_URL &&
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  )
}

async function getKvClient() {
  if (!isKvAvailable()) return null
  const { kv } = await import('@vercel/kv')
  return kv
}

async function kvGet<T>(key: string): Promise<T | null> {
  const kv = await getKvClient()
  if (!kv) return null
  try {
    const raw = await kv.get<string>(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function kvSet(key: string, value: unknown, _opts?: { ex?: number }): Promise<void> {
  const kv = await getKvClient()
  if (!kv) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await kv.set(key, JSON.stringify(value) as any)
}

async function kvDel(key: string): Promise<void> {
  const kv = await getKvClient()
  if (!kv) return
  await kv.del(key)
}

async function kvKeys(pattern: string): Promise<string[]> {
  const kv = await getKvClient()
  if (!kv) return []
  try {
    return await kv.keys(pattern)
  } catch {
    return []
  }
}

// KV key prefixes
const KV_USERS = 'inqbeta:users'
const KV_OFFERS = 'inqbeta:offers'
const KV_EXCHANGES = 'inqbeta:exchanges'
const KV_AUDIT = 'inqbeta:audit'
const KV_RESET_IDENTITY = 'inqbeta:reset_identity'
const KV_DESTROYED = 'inqbeta:destroyed'
const KV_SESSIONS = 'inqbeta:sessions'

async function loadKvUsers(): Promise<Map<string, WorkhouseUser>> {
  const data = await kvGet<Record<string, WorkhouseUser>>(KV_USERS)
  if (!data) return new Map()
  return new Map(Object.entries(data))
}

async function saveKvUsers(users: Map<string, WorkhouseUser>): Promise<void> {
  const obj = Object.fromEntries(users)
  await kvSet(KV_USERS, obj, { ex: 60 * 60 * 24 * 30 }) // 30-day TTL
}

async function loadKvOffers(): Promise<Map<string, WorkhouseOffer>> {
  const data = await kvGet<Record<string, WorkhouseOffer>>(KV_OFFERS)
  if (!data) return new Map()
  return new Map(Object.entries(data))
}

async function saveKvOffers(offers: Map<string, WorkhouseOffer>): Promise<void> {
  const obj = Object.fromEntries(offers)
  await kvSet(KV_OFFERS, obj, { ex: 60 * 60 * 24 * 30 })
}

async function loadKvExchanges(): Promise<Map<string, WorkhouseExchange>> {
  const data = await kvGet<Record<string, WorkhouseExchange>>(KV_EXCHANGES)
  if (!data) return new Map()
  return new Map(Object.entries(data))
}

async function saveKvExchanges(exchanges: Map<string, WorkhouseExchange>): Promise<void> {
  const obj = Object.fromEntries(exchanges)
  await kvSet(KV_EXCHANGES, obj, { ex: 60 * 60 * 24 * 30 })
}

async function loadKvAudit(): Promise<AuditEntry[]> {
  const data = await kvGet<AuditEntry[]>(KV_AUDIT)
  return data ?? []
}

async function saveKvAudit(audit: AuditEntry[]): Promise<void> {
  await kvSet(KV_AUDIT, audit, { ex: 60 * 60 * 24 * 30 })
}

async function loadKvResetIdentity(): Promise<Set<string>> {
  const data = await kvGet<string[]>(KV_RESET_IDENTITY)
  return new Set(data ?? [])
}

async function saveKvResetIdentity(keys: Set<string>): Promise<void> {
  await kvSet(KV_RESET_IDENTITY, [...keys], { ex: 60 * 60 * 24 * 30 })
}

async function loadKvDestroyed(): Promise<Set<string>> {
  const data = await kvGet<string[]>(KV_DESTROYED)
  return new Set(data ?? [])
}

async function saveKvDestroyed(keys: Set<string>): Promise<void> {
  await kvSet(KV_DESTROYED, [...keys], { ex: 60 * 60 * 24 * 30 })
}

async function loadKvSessions(): Promise<Map<string, string>> {
  const data = await kvGet<Record<string, string>>(KV_SESSIONS)
  if (!data) return new Map()
  return new Map(Object.entries(data))
}

async function saveKvSessions(sessions: Map<string, string>): Promise<void> {
  const obj = Object.fromEntries(sessions)
  await kvSet(KV_SESSIONS, obj, { ex: 60 * 60 * 72 }) // 72h TTL (matches session max age)
}

// ---------------------------------------------------------------------------
// In-memory store (local dev fallback)
// ---------------------------------------------------------------------------

const g = globalThis as typeof globalThis & {
  __inqbetaMemUsers?: Map<string, WorkhouseUser>
  __inqbetaMemOffers?: Map<string, WorkhouseOffer>
  __inqbetaMemExchanges?: Map<string, WorkhouseExchange>
  __inqbetaMemAudit?: AuditEntry[]
  __inqbetaMemResetIdentity?: Set<string>
  __inqbetaMemDestroyed?: Set<string>
  __inqbetaMemSessions?: Map<string, string>
  __inqbetaMemReady?: boolean
}

function memStore() {
  if (!g.__inqbetaMemUsers) g.__inqbetaMemUsers = new Map()
  if (!g.__inqbetaMemOffers) g.__inqbetaMemOffers = new Map()
  if (!g.__inqbetaMemExchanges) g.__inqbetaMemExchanges = new Map()
  if (!g.__inqbetaMemAudit) g.__inqbetaMemAudit = []
  if (!g.__inqbetaMemResetIdentity) g.__inqbetaMemResetIdentity = new Set()
  if (!g.__inqbetaMemDestroyed) g.__inqbetaMemDestroyed = new Set()
  if (!g.__inqbetaMemSessions) g.__inqbetaMemSessions = new Map()
  g.__inqbetaMemReady = true
  return g
}

// ---------------------------------------------------------------------------
// Unified storage interface
// ---------------------------------------------------------------------------

export interface DemoStorage {
  // Users
  getUser(key: string): Promise<WorkhouseUser | undefined>
  setUser(key: string, user: WorkhouseUser): Promise<void>
  deleteUser(key: string): Promise<void>
  getAllUsers(): Promise<Map<string, WorkhouseUser>>

  // Offers
  getOffer(id: string): Promise<WorkhouseOffer | undefined>
  setOffer(id: string, offer: WorkhouseOffer): Promise<void>
  deleteOffer(id: string): Promise<void>
  getAllOffers(): Promise<Map<string, WorkhouseOffer>>

  // Exchanges
  getExchange(id: string): Promise<WorkhouseExchange | undefined>
  setExchange(id: string, exchange: WorkhouseExchange): Promise<void>
  deleteExchange(id: string): Promise<void>
  getAllExchanges(): Promise<Map<string, WorkhouseExchange>>

  // Audit
  getAudit(): Promise<AuditEntry[]>
  setAudit(entries: AuditEntry[]): Promise<void>
  prependAudit(entry: AuditEntry): Promise<void>

  // Identity management
  getResetIdentityKeys(): Promise<Set<string>>
  addResetIdentityKey(key: string): Promise<void>
  deleteResetIdentityKey(key: string): Promise<void>

  getDestroyedKeys(): Promise<Set<string>>
  addDestroyedKey(key: string): Promise<void>

  // Sessions
  getSession(sessionId: string): Promise<string | undefined>
  setSession(sessionId: string, usernameKey: string): Promise<void>
  deleteSession(sessionId: string): Promise<boolean>
  deleteSessionsForUser(usernameKey: string): Promise<void>
}

// ---------------------------------------------------------------------------
// KV storage implementation
// ---------------------------------------------------------------------------

class KvStorage implements DemoStorage {
  async getUser(key: string): Promise<WorkhouseUser | undefined> {
    const users = await loadKvUsers()
    return users.get(key)
  }

  async setUser(key: string, user: WorkhouseUser): Promise<void> {
    const users = await loadKvUsers()
    users.set(key, user)
    await saveKvUsers(users)
  }

  async deleteUser(key: string): Promise<void> {
    const users = await loadKvUsers()
    users.delete(key)
    await saveKvUsers(users)
  }

  async getAllUsers(): Promise<Map<string, WorkhouseUser>> {
    return loadKvUsers()
  }

  async getOffer(id: string): Promise<WorkhouseOffer | undefined> {
    const offers = await loadKvOffers()
    return offers.get(id)
  }

  async setOffer(id: string, offer: WorkhouseOffer): Promise<void> {
    const offers = await loadKvOffers()
    offers.set(id, offer)
    await saveKvOffers(offers)
  }

  async deleteOffer(id: string): Promise<void> {
    const offers = await loadKvOffers()
    offers.delete(id)
    await saveKvOffers(offers)
  }

  async getAllOffers(): Promise<Map<string, WorkhouseOffer>> {
    return loadKvOffers()
  }

  async getExchange(id: string): Promise<WorkhouseExchange | undefined> {
    const exchanges = await loadKvExchanges()
    return exchanges.get(id)
  }

  async setExchange(id: string, exchange: WorkhouseExchange): Promise<void> {
    const exchanges = await loadKvExchanges()
    exchanges.set(id, exchange)
    await saveKvExchanges(exchanges)
  }

  async deleteExchange(id: string): Promise<void> {
    const exchanges = await loadKvExchanges()
    exchanges.delete(id)
    await saveKvExchanges(exchanges)
  }

  async getAllExchanges(): Promise<Map<string, WorkhouseExchange>> {
    return loadKvExchanges()
  }

  async getAudit(): Promise<AuditEntry[]> {
    return loadKvAudit()
  }

  async setAudit(entries: AuditEntry[]): Promise<void> {
    await saveKvAudit(entries)
  }

  async prependAudit(entry: AuditEntry): Promise<void> {
    const audit = await loadKvAudit()
    audit.unshift(entry)
    if (audit.length > 200) audit.length = 200
    await saveKvAudit(audit)
  }

  async getResetIdentityKeys(): Promise<Set<string>> {
    return loadKvResetIdentity()
  }

  async addResetIdentityKey(key: string): Promise<void> {
    const keys = await loadKvResetIdentity()
    keys.add(key)
    await saveKvResetIdentity(keys)
  }

  async deleteResetIdentityKey(key: string): Promise<void> {
    const keys = await loadKvResetIdentity()
    keys.delete(key)
    await saveKvResetIdentity(keys)
  }

  async getDestroyedKeys(): Promise<Set<string>> {
    return loadKvDestroyed()
  }

  async addDestroyedKey(key: string): Promise<void> {
    const keys = await loadKvDestroyed()
    keys.add(key)
    await saveKvDestroyed(keys)
  }

  async getSession(sessionId: string): Promise<string | undefined> {
    const sessions = await loadKvSessions()
    return sessions.get(sessionId)
  }

  async setSession(sessionId: string, usernameKey: string): Promise<void> {
    const sessions = await loadKvSessions()
    sessions.set(sessionId, usernameKey)
    await saveKvSessions(sessions)
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const sessions = await loadKvSessions()
    const had = sessions.has(sessionId)
    sessions.delete(sessionId)
    await saveKvSessions(sessions)
    return had
  }

  async deleteSessionsForUser(usernameKey: string): Promise<void> {
    const sessions = await loadKvSessions()
    for (const [id, user] of sessions.entries()) {
      if (user === usernameKey) sessions.delete(id)
    }
    await saveKvSessions(sessions)
  }
}

// ---------------------------------------------------------------------------
// In-memory storage implementation
// ---------------------------------------------------------------------------

class MemStorage implements DemoStorage {
  private s = memStore()

  async getUser(key: string): Promise<WorkhouseUser | undefined> {
    return this.s.__inqbetaMemUsers!.get(key)
  }

  async setUser(key: string, user: WorkhouseUser): Promise<void> {
    this.s.__inqbetaMemUsers!.set(key, user)
  }

  async deleteUser(key: string): Promise<void> {
    this.s.__inqbetaMemUsers!.delete(key)
  }

  async getAllUsers(): Promise<Map<string, WorkhouseUser>> {
    return new Map(this.s.__inqbetaMemUsers!)
  }

  async getOffer(id: string): Promise<WorkhouseOffer | undefined> {
    return this.s.__inqbetaMemOffers!.get(id)
  }

  async setOffer(id: string, offer: WorkhouseOffer): Promise<void> {
    this.s.__inqbetaMemOffers!.set(id, offer)
  }

  async deleteOffer(id: string): Promise<void> {
    this.s.__inqbetaMemOffers!.delete(id)
  }

  async getAllOffers(): Promise<Map<string, WorkhouseOffer>> {
    return new Map(this.s.__inqbetaMemOffers!)
  }

  async getExchange(id: string): Promise<WorkhouseExchange | undefined> {
    return this.s.__inqbetaMemExchanges!.get(id)
  }

  async setExchange(id: string, exchange: WorkhouseExchange): Promise<void> {
    this.s.__inqbetaMemExchanges!.set(id, exchange)
  }

  async deleteExchange(id: string): Promise<void> {
    this.s.__inqbetaMemExchanges!.delete(id)
  }

  async getAllExchanges(): Promise<Map<string, WorkhouseExchange>> {
    return new Map(this.s.__inqbetaMemExchanges!)
  }

  async getAudit(): Promise<AuditEntry[]> {
    return [...this.s.__inqbetaMemAudit!]
  }

  async setAudit(entries: AuditEntry[]): Promise<void> {
    this.s.__inqbetaMemAudit!.length = 0
    this.s.__inqbetaMemAudit!.push(...entries)
  }

  async prependAudit(entry: AuditEntry): Promise<void> {
    this.s.__inqbetaMemAudit!.unshift(entry)
    if (this.s.__inqbetaMemAudit!.length > 200) {
      this.s.__inqbetaMemAudit!.length = 200
    }
  }

  async getResetIdentityKeys(): Promise<Set<string>> {
    return new Set(this.s.__inqbetaMemResetIdentity!)
  }

  async addResetIdentityKey(key: string): Promise<void> {
    this.s.__inqbetaMemResetIdentity!.add(key)
  }

  async deleteResetIdentityKey(key: string): Promise<void> {
    this.s.__inqbetaMemResetIdentity!.delete(key)
  }

  async getDestroyedKeys(): Promise<Set<string>> {
    return new Set(this.s.__inqbetaMemDestroyed!)
  }

  async addDestroyedKey(key: string): Promise<void> {
    this.s.__inqbetaMemDestroyed!.add(key)
  }

  async getSession(sessionId: string): Promise<string | undefined> {
    return this.s.__inqbetaMemSessions!.get(sessionId)
  }

  async setSession(sessionId: string, usernameKey: string): Promise<void> {
    this.s.__inqbetaMemSessions!.set(sessionId, usernameKey)
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.s.__inqbetaMemSessions!.delete(sessionId)
  }

  async deleteSessionsForUser(usernameKey: string): Promise<void> {
    for (const [id, user] of this.s.__inqbetaMemSessions!.entries()) {
      if (user === usernameKey) this.s.__inqbetaMemSessions!.delete(id)
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton storage instance
// ---------------------------------------------------------------------------

let _storage: DemoStorage | null = null

export async function getStorage(): Promise<DemoStorage> {
  if (_storage) return _storage
  if (isKvAvailable()) {
    _storage = new KvStorage()
  } else {
    _storage = new MemStorage()
  }
  return _storage
}

/** For serverless: re-resolve storage per cold start (Vercel) */
export function resetStorage(): void {
  _storage = null
}
