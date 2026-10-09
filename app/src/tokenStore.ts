export interface TokenStore {
  get(): Promise<string | null>
  set(token: string): Promise<void>
  clear(): Promise<void>
}

export const TOKEN_KEY = "openisland.token"
export const MAC_NAME_KEY = "openisland.macName"
export const LIVE_ACTIVITY_KEY = "openisland.liveActivity.enabled"
export const DEVICE_NAME_KEY = "openisland.deviceName"
export const THEME_MODE_KEY = "openisland.themeMode"
export const LAST_HOST_KEY = "openisland.lastHost"
export const LAST_PORT_KEY = "openisland.lastPort"
export const DIAGNOSTIC_KEY = "openisland.diagnostics"

/** In-memory store used by tests and as a fallback. */
export function memoryTokenStore(initial: string | null = null): TokenStore {
  let token = initial
  return {
    get: async () => token,
    set: async (next) => {
      token = next
    },
    clear: async () => {
      token = null
    },
  }
}
