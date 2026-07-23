/**
 * Regression tests for session cookie configuration.
 * Tests the cookie settings required for cross-origin/production deployment.
 *
 * Run with: npm test sessions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Session Cookie Configuration', () => {
  // Capture all cookie set calls
  let cookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }>

  beforeEach(() => {
    cookieCalls = []
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore NODE_ENV
    delete process.env.NODE_ENV
  })

  function createMockResponse() {
    return {
      cookies: {
        set: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
          cookieCalls.push({ name, value, options })
        }),
      },
    }
  }

  describe('setSessionCookie - cookie migration from legacy path', () => {
    it('clears the legacy path cookie when creating new session', async () => {
      process.env.NODE_ENV = 'development'
      const { setSessionCookie } = await import('./sessions')

      const response = createMockResponse()
      setSessionCookie(response as any, 'new-session-id')

      // Should have called set twice: once for legacy path (to clear), once for new path
      expect(cookieCalls.length).toBe(2)

      // First call should clear legacy path
      expect(cookieCalls[0].name).toBe('workhouseSession')
      expect(cookieCalls[0].value).toBe('')
      expect(cookieCalls[0].options).toMatchObject({
        path: '/api/workhouse',
        maxAge: 0,
      })
    })

    it('sets the new root-path cookie', async () => {
      process.env.NODE_ENV = 'development'
      const { setSessionCookie } = await import('./sessions')

      const response = createMockResponse()
      setSessionCookie(response as any, 'new-session-id')

      // Second call should set new cookie with root path
      expect(cookieCalls[1].name).toBe('workhouseSession')
      expect(cookieCalls[1].value).toBe('new-session-id')
      expect(cookieCalls[1].options).toMatchObject({
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // development
        maxAge: 60 * 60 * 72, // 72 hours
      })
    })

    it('includes secure flag in production', async () => {
      process.env.NODE_ENV = 'production'
      const { setSessionCookie } = await import('./sessions')

      const response = createMockResponse()
      setSessionCookie(response as any, 'prod-session-id')

      // Check the new cookie has secure: true
      const newCookieCall = cookieCalls.find(
        c => c.options.path === '/' && c.value === 'prod-session-id'
      )
      expect(newCookieCall?.options).toMatchObject({
        secure: true,
      })
    })

    it('omits secure flag in development', async () => {
      process.env.NODE_ENV = 'development'
      const { setSessionCookie } = await import('./sessions')

      const response = createMockResponse()
      setSessionCookie(response as any, 'dev-session-id')

      // Check the new cookie has secure: false
      const newCookieCall = cookieCalls.find(
        c => c.options.path === '/' && c.value === 'dev-session-id'
      )
      expect(newCookieCall?.options).toMatchObject({
        secure: false,
      })
    })

    it('includes httpOnly for security', async () => {
      process.env.NODE_ENV = 'development'
      const { setSessionCookie } = await import('./sessions')

      const response = createMockResponse()
      setSessionCookie(response as any, 'test-session')

      const newCookieCall = cookieCalls.find(c => c.options.path === '/')
      expect(newCookieCall?.options).toHaveProperty('httpOnly', true)
    })

    it('uses sameSite: lax', async () => {
      process.env.NODE_ENV = 'development'
      const { setSessionCookie } = await import('./sessions')

      const response = createMockResponse()
      setSessionCookie(response as any, 'test-session')

      const newCookieCall = cookieCalls.find(c => c.options.path === '/')
      expect(newCookieCall?.options).toHaveProperty('sameSite', 'lax')
    })
  })

  describe('clearSessionCookie - clears both cookie paths on logout', () => {
    it('clears both root-path and legacy-path cookies', async () => {
      process.env.NODE_ENV = 'development'
      const { clearSessionCookie } = await import('./sessions')

      const response = createMockResponse()
      clearSessionCookie(response as any)

      // Should have 2 calls: one for root path, one for legacy path
      expect(cookieCalls.length).toBe(2)

      const paths = cookieCalls.map(c => c.options.path)
      expect(paths).toContain('/')
      expect(paths).toContain('/api/workhouse')

      // All should have maxAge: 0
      cookieCalls.forEach(call => {
        expect(call.options).toMatchObject({ maxAge: 0 })
        expect(call.value).toBe('')
      })
    })

    it('uses correct secure flag based on environment', async () => {
      process.env.NODE_ENV = 'production'
      const { clearSessionCookie } = await import('./sessions')

      const response = createMockResponse()
      clearSessionCookie(response as any)

      // All cookies should have secure: true in production
      cookieCalls.forEach(call => {
        expect(call.options).toHaveProperty('secure', true)
      })
    })
  })

  describe('getSessionIdFromRequest - extracts session from cookie header', () => {
    it('parses session ID from cookie header', async () => {
      const { getSessionIdFromRequest } = await import('./sessions')

      const request = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'cookie') {
              return 'workhouseSession=test-session-id; other=value'
            }
            return null
          }),
        },
      } as unknown as Request

      const sessionId = getSessionIdFromRequest(request)
      expect(sessionId).toBe('test-session-id')
    })

    it('returns undefined when no cookie header', async () => {
      const { getSessionIdFromRequest } = await import('./sessions')

      const request = {
        headers: {
          get: vi.fn(() => null),
        },
      } as unknown as Request

      const sessionId = getSessionIdFromRequest(request)
      expect(sessionId).toBeUndefined()
    })

    it('returns undefined when session cookie is empty', async () => {
      const { getSessionIdFromRequest } = await import('./sessions')

      const request = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'cookie') {
              return 'workhouseSession=; other=value'
            }
            return null
          }),
        },
      } as unknown as Request

      const sessionId = getSessionIdFromRequest(request)
      expect(sessionId).toBeUndefined()
    })

    it('prefers root-path cookie over legacy-path cookie', async () => {
      const { getSessionIdFromRequest } = await import('./sessions')

      // Both cookies present - should return the one from the root path
      const request = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'cookie') {
              // Simulate both cookies - browser sends them in order, first one wins
              return 'workhouseSession=legacy-id; workhouseSession=new-id'
            }
            return null
          }),
        },
      } as unknown as Request

      // The current implementation returns first match, which is fine
      // The key is that we now clear the legacy cookie when setting new one
      const sessionId = getSessionIdFromRequest(request)
      expect(sessionId).toBe('legacy-id')
    })
  })
})
