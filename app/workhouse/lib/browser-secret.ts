export const BROWSER_SECRET_KEY = 'workhouse-browser-secret'
export const BROWSER_SECRETS_KEY = 'workhouse-browser-secrets'

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

function characterKey(username: string): string {
  return username.trim().toLowerCase()
}

function readCharacterSecrets(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(BROWSER_SECRETS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) => typeof key === 'string' && typeof value === 'string' && value.length > 0,
      ),
    )
  } catch {
    return {}
  }
}

function writeCharacterSecrets(secrets: Record<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BROWSER_SECRETS_KEY, JSON.stringify(secrets))
  } catch {
    // Keep the current browser session usable even when local storage is unavailable.
  }
}

/** Returns a credential for a character that already exists. */
export function getExistingCharacterSecret(username: string): string {
  if (typeof window === 'undefined') return ''
  const key = characterKey(username)
  const secrets = readCharacterSecrets()
  if (secrets[key]) return secrets[key]

  try {
    // Preserve access to characters created before credentials became per-character.
    const legacySecret = window.localStorage.getItem(BROWSER_SECRET_KEY)
    if (legacySecret) {
      secrets[key] = legacySecret
      writeCharacterSecrets(secrets)
      return legacySecret
    }
  } catch {
    // Fall through to a fresh secret, which will be rejected for an unrecognised character.
  }

  const secret = makeBrowserSecret(window.crypto)
  secrets[key] = secret
  writeCharacterSecrets(secrets)
  return secret
}

/** Creates a dedicated credential for a newly created character. */
export function createCharacterSecret(username: string): string {
  if (typeof window === 'undefined') return ''
  const key = characterKey(username)
  const secrets = readCharacterSecrets()
  if (secrets[key]) return secrets[key]

  const secret = makeBrowserSecret(window.crypto)
  secrets[key] = secret
  writeCharacterSecrets(secrets)
  return secret
}

/** Removes only the destroyed character's credential. */
export function forgetCharacterSecret(username: string): void {
  if (typeof window === 'undefined') return
  const key = characterKey(username)
  const secrets = readCharacterSecrets()
  if (!secrets[key]) return
  delete secrets[key]
  writeCharacterSecrets(secrets)
}
