/**
 * Permanent regression tests for storage.ts.
 * Tests the safe handling of KV values returned by @vercel/kv.
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock @vercel/kv module
const mockKv = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}

vi.mock('@vercel/kv', () => ({
  kv: mockKv,
}))

// Set up KV env vars before importing storage
process.env.KV_URL = 'https://fake.upstash.io'
process.env.KV_REST_API_URL = 'https://fake.upstash.io'
process.env.KV_REST_API_TOKEN = 'fake-token'

// Import after mocking
const { getStorage, resetStorage } = await import('./storage')

describe('kvGet - handles both string and object from @vercel/kv', () => {
  beforeEach(() => {
    vi.resetModules()
    resetStorage()
    mockKv.get.mockReset()
    mockKv.set.mockReset()
  })

  it('returns null when Redis returns null (missing key)', async () => {
    mockKv.get.mockResolvedValue(null)
    const storage = await getStorage()
    const result = await storage.getSession('nonexistent-session')
    expect(result).toBeUndefined()
  })

  it('returns null when Redis returns undefined', async () => {
    mockKv.get.mockResolvedValue(undefined)
    const storage = await getStorage()
    const result = await storage.getSession('nonexistent-session')
    expect(result).toBeUndefined()
  })

  it('parses JSON string value', async () => {
    // Simulate sessions stored as JSON string: '{"session1":"user1"}'
    mockKv.get.mockResolvedValue('{"session1":"user1"}')
    const storage = await getStorage()
    const result = await storage.getSession('session1')
    expect(result).toBe('user1')
  })

  it('returns pre-deserialized object directly', async () => {
    // Simulate Upstash auto-deserializing: returns object directly
    mockKv.get.mockResolvedValue({ session1: 'user1' })
    const storage = await getStorage()
    const result = await storage.getSession('session1')
    expect(result).toBe('user1')
  })
})

describe('kvGet - error handling', () => {
  beforeEach(() => {
    vi.resetModules()
    resetStorage()
    mockKv.get.mockReset()
  })

  it('throws StorageError on malformed JSON string (does not appear as missing)', async () => {
    mockKv.get.mockResolvedValue('not-valid-json')
    const storage = await getStorage()

    // The fix throws StorageError for malformed JSON - errors propagate up
    await expect(storage.getSession('session1')).rejects.toThrow('Failed to parse JSON')
  })

  it('throws StorageError on Redis client error (does not appear as missing)', async () => {
    mockKv.get.mockRejectedValue(new Error('Redis connection failed'))
    const storage = await getStorage()

    // The fix throws StorageError for Redis errors - errors propagate up
    await expect(storage.getSession('session1')).rejects.toThrow('KV get failed')
  })
})

describe('KvStorage setSession followed by getSession', () => {
  beforeEach(() => {
    vi.resetModules()
    resetStorage()
    mockKv.get.mockReset()
    mockKv.set.mockReset()
  })

  it('persists and restores username when Redis initially returns null', async () => {
    // Initially, the sessions key doesn't exist (returns null)
    mockKv.get.mockResolvedValue(null)

    const storage = await getStorage()

    // Set a session on empty storage
    await storage.setSession('new-session-123', 'newuser')

    // Verify kv.set was called with the correct value
    expect(mockKv.set).toHaveBeenCalled()
    const setCall = mockKv.set.mock.calls[0]
    expect(setCall[0]).toBe('inqbeta:sessions')
    // The value should be JSON-stringified: {"new-session-123":"newuser"}
    expect(setCall[1]).toBe('{"new-session-123":"newuser"}')
    // And TTL of 72 hours
    expect(setCall[2]).toEqual({ ex: 60 * 60 * 72 })

    // Now mock kv.get to return what was written (simulating subsequent reads)
    mockKv.get.mockResolvedValue('{"new-session-123":"newuser"}')

    // Get the session back
    const username = await storage.getSession('new-session-123')
    expect(username).toBe('newuser')
  })

  it('restores username when Redis returns an already-deserialized object', async () => {
    // Initially, the sessions key returns an object (Upstash auto-deserialized)
    mockKv.get.mockResolvedValue({ 'existing-session': 'existinguser' })

    const storage = await getStorage()

    // Get the session - should work with deserialized object
    const username = await storage.getSession('existing-session')
    expect(username).toBe('existinguser')
  })

  it('restores username when Redis returns a JSON string', async () => {
    // Initially, the sessions key returns a JSON string
    mockKv.get.mockResolvedValue('{"string-session":"stringuser"}')

    const storage = await getStorage()

    // Get the session - should parse the JSON string
    const username = await storage.getSession('string-session')
    expect(username).toBe('stringuser')
  })

  it('adds to existing sessions without losing data', async () => {
    // Start with existing sessions
    mockKv.get
      .mockResolvedValueOnce({ 'session-a': 'user-a' }) // initial load
      .mockResolvedValueOnce({ 'session-a': 'user-a' }) // load before set
      .mockResolvedValueOnce('{"session-a":"user-a","session-b":"user-b"}') // after set

    const storage = await getStorage()

    // Add a new session
    await storage.setSession('session-b', 'user-b')

    // Verify both sessions are preserved
    const userA = await storage.getSession('session-a')
    const userB = await storage.getSession('session-b')

    expect(userA).toBe('user-a')
    expect(userB).toBe('user-b')
  })
})

describe('kvSet - TTL handling', () => {
  beforeEach(() => {
    vi.resetModules()
    resetStorage()
    mockKv.get.mockReset()
    mockKv.set.mockReset()
  })

  it('applies the 72-hour session TTL', async () => {
    mockKv.set.mockResolvedValue('OK')
    mockKv.get.mockResolvedValue(null)

    const storage = await getStorage()

    // Set a session
    await storage.setSession('session-789', 'testuser')

    // Verify set was called with 72-hour TTL
    expect(mockKv.set).toHaveBeenCalled()
    const setCall = mockKv.set.mock.calls[0]
    expect(setCall[2]).toEqual({ ex: 60 * 60 * 72 })
  })

  it('applies the 30-day TTL to user storage', async () => {
    mockKv.set.mockResolvedValue('OK')
    mockKv.get.mockResolvedValue(null)

    const storage = await getStorage()

    // Set a user (uses 30-day TTL)
    await storage.setUser('testuser', {
      username: 'TestUser',
      characterId: 'char123',
      credits: 5,
      createdAt: '2026-01-01T00:00:00Z',
      receivedGestures: [],
      receivedMoney: [],
    })

    // Verify set was called with 30-day TTL
    expect(mockKv.set).toHaveBeenCalled()
    const setCall = mockKv.set.mock.calls[0]
    expect(setCall[2]).toEqual({ ex: 60 * 60 * 24 * 30 })
  })
})

describe('Workhouse state restoration', () => {
  beforeEach(() => {
    vi.resetModules()
    resetStorage()
    mockKv.get.mockReset()
    mockKv.set.mockReset()
  })

  it('getStateForSession succeeds when session and user records exist', async () => {
    // First, create a session and user via the storage API
    const mockUser = {
      username: 'TestUser',
      characterId: 'char123',
      credits: 10,
      createdAt: '2026-01-01T00:00:00Z',
      receivedGestures: [],
      receivedMoney: [],
    }

    // Mock the full session map loading and user lookup
    mockKv.get
      .mockResolvedValueOnce({ 'valid-session': 'testuser' }) // getSession loads sessions
      .mockResolvedValueOnce({ testuser: mockUser }) // getUser loads user

    const storage = await getStorage()

    // Get session - should find the username
    const username = await storage.getSession('valid-session')
    expect(username).toBe('testuser')

    // Get user - should find the user record
    const user = await storage.getUser('testuser')
    expect(user).toBeDefined()
    expect(user?.username).toBe('TestUser')
    expect(user?.credits).toBe(10)
  })
})
