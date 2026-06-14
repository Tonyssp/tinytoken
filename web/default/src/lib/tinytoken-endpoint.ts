export const TINYTOKEN_APP_BASE_URL = 'https://tinyapi.org'
export const TINYTOKEN_API_BASE_URL = 'https://api.tinyapi.org'

function normalizeBaseUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\/+$/, '')
}

function isTinyApiHostname(hostname: string): boolean {
  return hostname === 'tinyapi.org' || hostname === 'www.tinyapi.org'
}

function isTinyApiEndpointHostname(hostname: string): boolean {
  return hostname === 'api.tinyapi.org'
}

function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

export function resolveTinyTokenAppBaseUrl(value?: unknown): string {
  const baseUrl = normalizeBaseUrl(value)
  if (!baseUrl) return TINYTOKEN_APP_BASE_URL

  const parsed = tryParseUrl(baseUrl)
  if (!parsed) return TINYTOKEN_APP_BASE_URL

  if (isTinyApiEndpointHostname(parsed.hostname)) return TINYTOKEN_APP_BASE_URL

  return baseUrl
}

export function resolveTinyTokenApiBaseUrl(value?: unknown): string {
  const baseUrl = normalizeBaseUrl(value)
  if (!baseUrl) return TINYTOKEN_API_BASE_URL

  const parsed = tryParseUrl(baseUrl)
  if (!parsed) return TINYTOKEN_API_BASE_URL

  if (isTinyApiHostname(parsed.hostname)) return TINYTOKEN_API_BASE_URL

  return baseUrl
}
