export const FORMER_CHARACTER_SUFFIX = ' (former character)'

export type CharacterDisplayContext = {
  retiredKeys: string[]
  activeSince: Record<string, string>
}

export function emptyCharacterDisplayContext(): CharacterDisplayContext {
  return { retiredKeys: [], activeSince: {} }
}

function usernameKey(name: string): string {
  return name.trim().toLowerCase()
}

export function characterDisplayName(
  name: string,
  context: CharacterDisplayContext,
  eventTimestamp?: string
): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed

  const key = usernameKey(trimmed)
  if (!context.retiredKeys.includes(key)) return trimmed

  const activeSince = context.activeSince[key]
  if (!activeSince) return `${trimmed}${FORMER_CHARACTER_SUFFIX}`

  if (eventTimestamp && eventTimestamp < activeSince) {
    return `${trimmed}${FORMER_CHARACTER_SUFFIX}`
  }

  return trimmed
}
