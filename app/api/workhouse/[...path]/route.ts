import { NextResponse } from 'next/server'
import {
  WorkhouseError,
  acceptCounterOffer,
  acceptOffer,
  completeExchange,
  counterOffer,
  createOffer,
  enterSession,
  getStateForSession,
  leaveSession,
  lookupUsername,
  rejectOffer,
  resetDemoIdentity,
} from '../../../workhouse/lib/store'
import { WorkhouseMessages } from '../../../workhouse/lib/workhouse-messages'
import {
  clearSessionCookie,
  createSession,
  getSessionIdFromRequest,
  setSessionCookie,
} from '../../../workhouse/lib/sessions'
import { getStorage, getPersistenceStatus } from '../../../workhouse/lib/storage'
import { normalizeValueType } from '../../../workhouse/lib/exchange-value'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

function parseCreditAmountField(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined
  }
  const amount = Number(raw)
  return Number.isFinite(amount) ? amount : undefined
}

function parseMoneyAmountField(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined
  }
  const amount = Number(raw)
  return Number.isFinite(amount) ? amount : undefined
}

function errorResponse(err: unknown) {
  if (err instanceof WorkhouseError) {
    const status = err.code === 'unauthenticated' ? 401 : 400
    return json({ error: { code: err.code, message: err.message } }, status)
  }
  console.error('[workhouse]', err)
  return json({ error: { code: 'internal', message: WorkhouseMessages.somethingWentWrong } }, 500)
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await ctx.params

    if (path.length === 1 && path[0] === 'state') {
      const sessionId = getSessionIdFromRequest(req)
      const storage = await getStorage()
      const status = await getPersistenceStatus()

      console.log('[workhouse] GET /state', {
        route: 'state',
        cookiePresent: !!sessionId,
        cookiePrefix: sessionId?.slice(0, 6),
        sessionFound: false, // Will be updated below
        storageBackend: status.persistence,
      })

      if (!sessionId) {
        console.log('[workhouse] GET /state - no cookie')
        const response = json(
          { error: { code: 'unauthenticated', message: WorkhouseMessages.sessionNotBound } },
          401
        )
        clearSessionCookie(response)
        return response
      }

      try {
        const state = await getStateForSession(sessionId)
        if (!state) {
          console.log('[workhouse] GET /state - session not found in storage')
          const response = json(
            { error: { code: 'unauthenticated', message: WorkhouseMessages.sessionNotBound } },
            401
          )
          clearSessionCookie(response)
          return response
        }
        console.log('[workhouse] GET /state - success', {
          route: 'state',
          cookiePresent: true,
          cookiePrefix: sessionId.slice(0, 6),
          sessionFound: true,
          usernameFound: true,
          storageBackend: status.persistence,
        })
        return json(state)
      } catch (err) {
        if (err instanceof WorkhouseError && err.code === 'unauthenticated') {
          console.log('[workhouse] GET /state - session lookup failed')
          const response = json(
            { error: { code: 'unauthenticated', message: err.message } },
            401
          )
          clearSessionCookie(response)
          return response
        }
        throw err
      }
    }

    if (path.length === 1 && path[0] === 'lookup') {
      const url = new URL(req.url)
      const username = url.searchParams.get('username') ?? ''
      return json(await lookupUsername(username))
    }

    if (path.length === 1 && path[0] === 'participants') {
      // Return list of active participants for friend search
      const storage = await getStorage()
      const users = await storage.getAllUsers()
      const participants = [...users.values()].map(u => u.username)
      return json({ participants })
    }

    if (path.length === 1 && path[0] === 'health') {
      const status = await getPersistenceStatus()
      if (status.persistence === 'kv-error') {
        return json({ ok: false, ...status }, 503)
      }
      return json({ ok: true, ...status })
    }

    return json({ error: { code: 'not_found', message: 'Not found' } }, 404)
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await ctx.params
    const body = await readBody(req)

    if (path.length === 1 && path[0] === 'session') {
      const username = String(body.username ?? '')
      const password = String(body.password ?? '')
      const result = await enterSession(username, password)
      const sessionId = createSession(result.user.username)
      const storage = await getStorage()
      const status = await getPersistenceStatus()

      console.log('[workhouse] POST /session', {
        route: 'session',
        isNew: result.isNew,
        sessionCreated: true,
        storageBackend: status.persistence,
      })

      let sessionPersisted = false
      try {
        await storage.setSession(sessionId, result.user.username.toLowerCase())
        sessionPersisted = true
        console.log('[workhouse] POST /session - session persisted', {
          route: 'session',
          sessionIdPrefix: sessionId.slice(0, 6),
          sessionPersisted: true,
          storageBackend: status.persistence,
        })
      } catch (err) {
        console.error('[workhouse] POST /session - session persist failed', {
          route: 'session',
          sessionIdPrefix: sessionId.slice(0, 6),
          error: err instanceof Error ? err.message : 'unknown',
        })
      }

      const response = json(result)
      setSessionCookie(response, sessionId)
      response.headers.set('X-Workhouse-Session-Cookie', sessionPersisted ? 'set' : 'set-but-persist-failed')
      response.headers.set('Cache-Control', 'no-store')
      return response
    }

    if (path.length === 2 && path[0] === 'session' && path[1] === 'leave') {
      const sessionId = getSessionIdFromRequest(req) ?? ''
      if (sessionId) {
        await leaveSession(sessionId)
      }
      const response = json({ ok: true })
      clearSessionCookie(response)
      return response
    }

    if (path.length === 2 && path[0] === 'session' && path[1] === 'reset') {
      const username = String(body.username ?? '')
      const sessionId = getSessionIdFromRequest(req) ?? ''
      const result = await resetDemoIdentity(username, sessionId)
      const response = json(result)
      if (result.ok) {
        clearSessionCookie(response)
      }
      return response
    }

    if (path.length === 1 && path[0] === 'offers') {
      const returnType = normalizeValueType(body.returnType)
      if (!returnType) {
        return json(
          { error: { code: 'invalid_return_type', message: WorkhouseMessages.enterReturnType } },
          400
        )
      }
      const offer = await createOffer({
        from: String(body.from ?? ''),
        to: String(body.to ?? ''),
        giveType: normalizeValueType(body.giveType) ?? undefined,
        giveCreditAmount: parseCreditAmountField(body.giveCreditAmount),
        giveAsset: body.giveAsset != null ? String(body.giveAsset) : undefined,
        giveMoneyAmount: parseMoneyAmountField(body.giveMoneyAmount),
        gesture: body.gesture != null ? String(body.gesture) : undefined,
        returnType,
        creditAmount: parseCreditAmountField(body.creditAmount),
        returnAsset: body.returnAsset != null ? String(body.returnAsset) : undefined,
        returnGesture: body.returnGesture != null ? String(body.returnGesture) : undefined,
        moneyAmount: parseMoneyAmountField(body.moneyAmount),
      })
      return json({ offer })
    }

    if (path.length === 3 && path[0] === 'offers') {
      const offerId = path[1]
      const action = path[2]
      const actor = String(body.username ?? '')

      if (action === 'accept') {
        const exchange = await acceptOffer(offerId, actor)
        return json({ exchange })
      }
      if (action === 'reject') {
        const offer = await rejectOffer(offerId, actor)
        return json({ offer })
      }
      if (action === 'counteroffer') {
        const offer = await counterOffer(offerId, actor, {
          returnType: normalizeValueType(body.returnType) ?? undefined,
          creditAmount: parseCreditAmountField(body.creditAmount),
          returnAsset: body.returnAsset != null ? String(body.returnAsset) : undefined,
          returnGesture: body.returnGesture != null ? String(body.returnGesture) : undefined,
          moneyAmount: parseMoneyAmountField(body.moneyAmount),
        })
        return json({ offer })
      }
      if (action === 'accept-counter') {
        const exchange = await acceptCounterOffer(offerId, actor)
        return json({ exchange })
      }
    }

    if (path.length === 3 && path[0] === 'exchanges' && path[2] === 'complete') {
      const exchangeId = path[1]
      const actor = String(body.username ?? '')
      const exchange = await completeExchange(exchangeId, actor)
      return json({ exchange })
    }

    return json({ error: { code: 'not_found', message: 'Not found' } }, 404)
  } catch (err) {
    return errorResponse(err)
  }
}
