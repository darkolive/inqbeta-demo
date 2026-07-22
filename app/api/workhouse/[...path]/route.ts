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
import { getStorage } from '../../../workhouse/lib/storage'
import { normalizeValueType } from '../../../workhouse/lib/exchange-value'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
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
      if (!sessionId) {
        return json(
          { error: { code: 'unauthenticated', message: WorkhouseMessages.sessionNotBound } },
          401
        )
      }
      const state = await getStateForSession(sessionId)
      return json(state)
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
      await storage.setSession(sessionId, result.user.username.toLowerCase())
      const response = json(result)
      setSessionCookie(response, sessionId)
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
