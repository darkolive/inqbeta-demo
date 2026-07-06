export type WorkhouseSemanticRole =
  | 'self'
  | 'other'
  | 'character'
  | 'system'
  | 'proof'
  | 'warning'
  | 'success'
  | 'neutral'

export const WORKHOUSE_SEMANTIC_CLASS: Record<WorkhouseSemanticRole, string> = {
  self: 'wh-semantic-self',
  other: 'wh-semantic-other',
  character: 'wh-semantic-character',
  system: 'wh-semantic-system',
  proof: 'wh-semantic-proof',
  warning: 'wh-semantic-warning',
  success: 'wh-semantic-success',
  neutral: 'wh-semantic-neutral',
}

export const WORKHOUSE_SEMANTIC_PROOF_HASH_CLASS = 'wh-semantic-proof-hash'

export function workhouseSemanticClass(
  role: WorkhouseSemanticRole,
  extra?: string
): string {
  const base = WORKHOUSE_SEMANTIC_CLASS[role]
  return extra ? `${base} ${extra}` : base
}
