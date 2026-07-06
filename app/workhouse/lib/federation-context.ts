const FEDERATION_NAME_ENV = "NEXT_PUBLIC_WORKHOUSE_FEDERATION_NAME";
const FEDERATION_DESCRIPTION_ENV =
  "NEXT_PUBLIC_WORKHOUSE_FEDERATION_DESCRIPTION";

export const DEFAULT_FEDERATION_NAME = "Workhouse Festival";
export const DEFAULT_FEDERATION_DESCRIPTION =
  "A shared festival space for playful exchange — credits, offers, and the receipt of what happened.";

let cachedName: string | undefined;
let cachedDescription: string | undefined;

export function getFederationDisplayName(): string {
  if (!cachedName) {
    const fromEnv = process.env[FEDERATION_NAME_ENV]?.trim();
    cachedName = fromEnv || DEFAULT_FEDERATION_NAME;
  }
  return cachedName;
}

export function getFederationDescription(): string {
  if (!cachedDescription) {
    const fromEnv = process.env[FEDERATION_DESCRIPTION_ENV]?.trim();
    cachedDescription = fromEnv || DEFAULT_FEDERATION_DESCRIPTION;
  }
  return cachedDescription;
}

export function resetFederationContextCacheForTests(): void {
  cachedName = undefined;
  cachedDescription = undefined;
}
