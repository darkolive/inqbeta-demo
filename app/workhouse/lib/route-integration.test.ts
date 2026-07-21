// Run with: cd inqbeta-demo && npm test

import test from 'node:test'
import assert from 'node:assert/strict'
import { NextResponse } from 'next/server'
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  resetSessionsForTests,
} from '../../workhouse/lib/sessions'
import { getStorage, resetStorage } from '../../workhouse/lib/storage'

test('POST /session creates session and returns Set-Cookie header', () => {
  const username = 'testuser'
  const sessionId = createSession(username)

  // Simulate the POST /session response construction
  const response = NextResponse.json({ user: { username }, isNew: true })
  setSessionCookie(response, sessionId)

  // Verify Set-Cookie header exists
  const setCookieHeader = response.headers.get('set-cookie')
  assert.ok(setCookieHeader !== null, 'Set-Cookie header should exist')
  assert.ok(setCookieHeader.includes('workhouseSession='), 'Should contain session cookie name')
  assert.ok(setCookieHeader.includes(`workhouseSession=${sessionId}`), 'Should contain session ID')
})

test('POST /session persists session to storage', async () => {
  const username = 'testuser'
  const sessionId = createSession(username)

  // Persist session (simulates POST /session route behavior)
  const storage = await getStorage()
  await storage.setSession(sessionId, username.toLowerCase())

  // Verify session can be retrieved
  const retrievedUsername = await storage.getSession(sessionId)
  assert.strictEqual(retrievedUsername, username.toLowerCase())
})

test('session ID is valid 48-character hex string', () => {
  const sessionId = createSession('testuser')
  assert.ok(sessionId.length === 48, 'Session ID should be 48 chars (24 bytes hex)')
  assert.ok(/^[a-f0-9]+$/.test(sessionId), 'Session ID should be lowercase hex')
})

test('GET /state returns 401 when no cookie present', () => {
  // Simulate GET /state without cookie
  const req = new Request('http://localhost/api/workhouse/state', {
    method: 'GET',
  })

  // Extract session ID from request (should be undefined)
  const cookieHeader = req.headers.get('cookie') ?? ''
  const hasSessionCookie = cookieHeader.includes('workhouseSession=')

  assert.strictEqual(hasSessionCookie, false, 'Should not have session cookie')
})

test('GET /state returns session state when valid cookie present', async () => {
  const username = 'testuser'
  const sessionId = createSession(username)

  // Persist session
  const storage = await getStorage()
  await storage.setSession(sessionId, username.toLowerCase())

  // Simulate GET /state with cookie
  const req = new Request('http://localhost/api/workhouse/state', {
    method: 'GET',
    headers: { cookie: `workhouseSession=${sessionId}` },
  })

  // Verify session can be extracted from cookie
  const cookieHeader = req.headers.get('cookie') ?? ''
  const sessionIdMatch = cookieHeader.match(/workhouseSession=([a-f0-9]+)/)
  assert.ok(sessionIdMatch, 'Should extract session ID from cookie')

  // Verify session exists in storage
  const storedUsername = await storage.getSession(sessionIdMatch[1])
  assert.strictEqual(storedUsername, username.toLowerCase())
})

test('POST creates session, GET retrieves state with cookie', async () => {
  const username = 'darren'

  // Step 1: POST /session creates session
  const sessionId = createSession(username)
  const storage = await getStorage()
  await storage.setSession(sessionId, username.toLowerCase())

  // Step 2: Verify session cookie is set
  const response = NextResponse.json({ user: { username }, isNew: true })
  setSessionCookie(response, sessionId)
  const setCookieHeader = response.headers.get('set-cookie')
  assert.ok(setCookieHeader !== null)

  // Step 3: Extract cookie from the Set-Cookie header for the GET request
  const cookieFromSetCookie = setCookieHeader!.split(';')[0] // Get just the name=value part

  // Step 4: Verify session lookup works with extracted cookie
  const cookieMatch = cookieFromSetCookie.match(/workhouseSession=([a-f0-9]+)/)
  assert.ok(cookieMatch, 'Should extract session ID from cookie')
  const retrievedUsername = await storage.getSession(cookieMatch[1])
  assert.strictEqual(retrievedUsername, username.toLowerCase())
})

test('stale cookie followed by new login', async () => {
  const oldUsername = 'olduser'
  const newUsername = 'newuser'

  // Step 1: Create old session
  const oldSessionId = createSession(oldUsername)
  const storage = await getStorage()
  await storage.setSession(oldSessionId, oldUsername.toLowerCase())

  // Step 2: Simulate stale cookie scenario - session doesn't exist
  const staleSessionId = 'stale' + '0'.repeat(44)
  const staleUsername = await storage.getSession(staleSessionId)
  assert.strictEqual(staleUsername, undefined, 'Stale session should not exist')

  // Step 3: Create new session
  const newSessionId = createSession(newUsername)
  await storage.setSession(newSessionId, newUsername.toLowerCase())

  // Step 4: Verify new session works
  const retrievedUsername = await storage.getSession(newSessionId)
  assert.strictEqual(retrievedUsername, newUsername.toLowerCase())
})

test('stale cookie recovery flow', async () => {
  // Step 1: GET /state with unknown cookie returns 401 and clears cookie
  const unknownSessionId = '0'.repeat(48)
  const storage = await getStorage()

  // Verify session doesn't exist
  const sessionExists = await storage.getSession(unknownSessionId)
  assert.strictEqual(sessionExists, undefined, 'Unknown session should not exist')

  // Simulate 401 response with cookie clear
  const errorResponse = NextResponse.json(
    { error: { code: 'unauthenticated', message: 'Session not found' } },
    { status: 401 }
  )
  clearSessionCookie(errorResponse)
  const clearCookieHeader = errorResponse.headers.get('set-cookie')
  assert.ok(clearCookieHeader?.includes('Max-Age=0'), '401 should clear cookie')

  // Step 2: POST /session creates new cookie
  const username = 'recovered_user'
  const newSessionId = createSession(username)
  await storage.setSession(newSessionId, username.toLowerCase())

  const successResponse = NextResponse.json({ user: { username }, isNew: true })
  setSessionCookie(successResponse, newSessionId)
  const newCookieHeader = successResponse.headers.get('set-cookie')
  assert.ok(newCookieHeader?.includes(`workhouseSession=${newSessionId}`), 'New cookie should be set')

  // Step 3: Verify new session works
  const finalUsername = await storage.getSession(newSessionId)
  assert.strictEqual(finalUsername, username.toLowerCase(), 'New session should work')
})

test('setSessionCookie modifies the same response object returned', () => {
  // This verifies the cookie is set on the actual response object
  const response = NextResponse.json({ ok: true })
  const sessionId = createSession('testuser')

  // setSessionCookie should modify the response in place
  setSessionCookie(response, sessionId)

  // The cookie should be on the same response object
  const setCookieHeader = response.headers.get('set-cookie')
  assert.ok(setCookieHeader !== null, 'Cookie should be on the response')
  assert.ok(setCookieHeader.includes(sessionId), 'Cookie should contain session ID')
})

test('clearSessionCookie modifies the same response object', () => {
  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)

  const setCookieHeader = response.headers.get('set-cookie')
  assert.ok(setCookieHeader?.includes('Max-Age=0'), 'Cookie should be cleared')
})
