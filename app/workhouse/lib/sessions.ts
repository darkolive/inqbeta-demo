import { randomBytes } from 'crypto'
import type { NextResponse } from 'next/server'
import { getStorage } from './storage'

export const WORKHOUSE_SESSION_COOKIE = 'workhouseSession'
export const WORKHOUSE_SESSION_MAX_AGE = 60 * 60 * 72

// In-memory session store for testing (mirrors what storage.ts uses)
const testSessionStore = new Map<string, string>()

export function resetSessionsForTests(): void {
  testSessionStore.clear()
}

export function createSession(username: string): string {
  const sessionId = randomBytes(24).toString('hex')
  return sessionId
}

export async function getSessionUsername(sessionId: string): Promise<string | undefined> {
  const id = sessionId.trim()
  if (!id) return undefined
  const storage = await getStorage()
  return await storage.getSession(id)
}

export function getSessionIdFromRequest(req: Request): string | undefined {
  const sessionId = parseCookie(req.headers.get('cookie') ?? '', WORKHOUSE_SESSION_COOKIE)
  return sessionId?.trim() || undefined
}

export async function getSessionFromRequest(req: Request): Promise<string | undefined> {
  const sessionId = getSessionIdFromRequest(req)
  if (!sessionId) return undefined
  return await getSessionUsername(sessionId)
}

export async function clearSession(sessionId: string): Promise<boolean> {
  const storage = await getStorage()
  return await storage.deleteSession(sessionId.trim())
}

export async function clearSessionsForUsername(usernameRaw: string): Promise<void> {
  const key = usernameRaw.trim().toLowerCase()
  const storage = await getStorage()
  await storage.deleteSessionsForUser(key)
}

export function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set({
    name: WORKHOUSE_SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: WORKHOUSE_SESSION_MAX_AGE,
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: WORKHOUSE_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

function parseCookie(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    if (key === name) return trimmed.slice(eq + 1)
  }
  return undefined
}
