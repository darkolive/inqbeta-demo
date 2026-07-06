export const BROWSER_SECRET_KEY = 'workhouse-browser-secret'

function makeBrowserSecret(cryptoObj?: Crypto): string {
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID()
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16)
    cryptoObj.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function makeBrowserSecretForTests(cryptoObj?: Crypto): string {
  return makeBrowserSecret(cryptoObj)
}

export function getOrCreateBrowserSecret(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(BROWSER_SECRET_KEY)
    if (existing) return existing
    const secret = makeBrowserSecret(window.crypto)
    window.localStorage.setItem(BROWSER_SECRET_KEY, secret)
    return secret
  } catch {
    return makeBrowserSecret(window.crypto)
  }
}

export function rotateBrowserSecret(): string {
  if (typeof window === 'undefined') return ''
  try {
    const secret = makeBrowserSecret(window.crypto)
    window.localStorage.setItem(BROWSER_SECRET_KEY, secret)
    return secret
  } catch {
    return makeBrowserSecret(window.crypto)
  }
}
