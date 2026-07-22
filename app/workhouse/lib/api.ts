import type { ExchangeValueType, WorkhouseOffer, WorkhouseState } from './types'
import { getOrCreateBrowserSecret, rotateBrowserSecret } from './browser-secret'
import { WorkhouseMessages } from './workhouse-messages'

const BASE = '/api/workhouse'

export class WorkhouseApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'WorkhouseApiError'
    this.code = code
  }
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = data as { error?: { code: string; message: string } }
    throw new WorkhouseApiError(
      err.error?.code ?? 'unknown',
      err.error?.message ?? WorkhouseMessages.requestFailed
    )
  }
  return data as T
}

/** Source tracking for diagnosing request origins */
let fetchStateSource: string = 'unknown'

export function setFetchStateSource(source: string) {
  fetchStateSource = source
}

export function getFetchStateSource(): string {
  return fetchStateSource
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
  const headers: Record<string, string> = {}
  // Add diagnostic header to trace request source
  if (path === 'state') {
    headers['X-Workhouse-State-Source'] = fetchStateSource
  }
  const res = await fetch(`${BASE}/${path}${qs}`, {
    credentials: 'same-origin',
    headers,
  })
  const data = await res.json()
  if (!res.ok) {
    const err = data as { error?: { code: string; message: string } }
    throw new WorkhouseApiError(
      err.error?.code ?? 'unknown',
      err.error?.message ?? WorkhouseMessages.requestFailed
    )
  }
  return data as T
}

export async function enterSession(username: string) {
  const password = getOrCreateBrowserSecret()
  const result = await post<{ user: WorkhouseState['user']; isNew: boolean }>('session', {
    username,
    password,
  })
  saveSession(result.user.username)
  return result
}

export async function resetDemoIdentity(username: string) {
  const result = await post<{ ok: boolean }>('session/reset', { username })
  if (result.ok) {
    rotateBrowserSecret()
  }
  return result
}

export async function leaveSession() {
  return post<{ ok: boolean }>('session/leave', {})
}

export async function fetchState() {
  return get<WorkhouseState>('state')
}

export async function lookupUsername(username: string) {
  return get<{ exists: boolean; username: string }>('lookup', { username })
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
}) {
  return post<{ offer: WorkhouseOffer }>('offers', input)
}

export async function acceptOffer(offerId: string, username: string) {
  return post<{ exchange: unknown }>(`offers/${offerId}/accept`, { username })
}

export async function rejectOffer(offerId: string, username: string) {
  return post<{ offer: unknown }>(`offers/${offerId}/reject`, { username })
}

export async function counterOffer(
  offerId: string,
  username: string,
  input: {
    returnType?: ExchangeValueType
    creditAmount?: number
    returnAsset?: string
    returnGesture?: string
    moneyAmount?: number
  }
) {
  return post<{ offer: unknown }>(`offers/${offerId}/counteroffer`, { username, ...input })
}

export async function acceptCounterOffer(offerId: string, username: string) {
  return post<{ exchange: unknown }>(`offers/${offerId}/accept-counter`, { username })
}

export async function completeExchange(exchangeId: string, username: string) {
  return post<{ exchange: unknown }>(`exchanges/${exchangeId}/complete`, { username })
}

export const SESSION_KEY = 'workhouse-username'
export const LOGIN_PREFILL_KEY = 'workhouse-login-prefill'

export function loadStoredUsername(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(LOGIN_PREFILL_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveSession(username: string) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SESSION_KEY, username)
    window.localStorage.setItem(LOGIN_PREFILL_KEY, username)
  } catch {
    // Username can still be held in React state for this page load
  }
}

export function saveUsername(username: string) {
  saveSession(username)
}

export function clearUsername() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export function clearSession() {
  clearUsername()
}

export function clearLoginPrefill() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LOGIN_PREFILL_KEY)
  } catch {
    // ignore
  }
}
