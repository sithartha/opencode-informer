import * as SecureStore from "expo-secure-store"
import { DEFAULT_OPTION, DEFAULT_SKIN, isSkinId, migrateStoredTheme, type SkinId, type ThemeOption } from "./theme"
import { DEVICE_NAME_KEY, LAST_HOST_KEY, LAST_PORT_KEY, LIVE_ACTIVITY_KEY, MAC_NAME_KEY, SKIN_KEY, THEME_MODE_KEY, THEME_OPTION_KEY, TOKEN_KEY, type TokenStore } from "./tokenStore"

// SecureStore needs a keychain entitlement. Unsigned builds (e.g. a simulator build with
// signing disabled) cannot access the keychain, so fall back to an in-memory store to keep
// the connection flow working. Signed builds persist to the Keychain/Keystore as intended.
const memory = new Map<string, string>()

async function read(key: string): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(key)
    if (value != null) return value
  } catch {
    // keychain unavailable
  }
  return memory.get(key) ?? null
}

async function write(key: string, value: string): Promise<void> {
  memory.set(key, value)
  try {
    await SecureStore.setItemAsync(key, value)
  } catch {
    // keychain unavailable
  }
}

async function remove(key: string): Promise<void> {
  memory.delete(key)
  try {
    await SecureStore.deleteItemAsync(key)
  } catch {
    // keychain unavailable
  }
}

/** SecureStore-backed token store with an in-memory fallback. */
export const secureTokenStore: TokenStore = {
  get: () => read(TOKEN_KEY),
  set: (token) => write(TOKEN_KEY, token),
  clear: () => remove(TOKEN_KEY),
}

export function getMacName(): Promise<string | null> {
  return read(MAC_NAME_KEY)
}

export function setMacName(name: string): Promise<void> {
  return write(MAC_NAME_KEY, name)
}

export async function getLiveActivityEnabled(): Promise<boolean> {
  const value = await read(LIVE_ACTIVITY_KEY)
  return value === null ? true : value === "true"
}

export function setLiveActivityEnabled(enabled: boolean): Promise<void> {
  return write(LIVE_ACTIVITY_KEY, enabled ? "true" : "false")
}

export function getDeviceName(): Promise<string | null> {
  return read(DEVICE_NAME_KEY)
}

export function setDeviceName(name: string): Promise<void> {
  return write(DEVICE_NAME_KEY, name)
}

export async function getTheme(): Promise<{ skin: SkinId; option: ThemeOption }> {
  const skin = await read(SKIN_KEY)
  const option = await read(THEME_OPTION_KEY)
  if (skin != null || option != null) {
    return {
      skin: isSkinId(skin) ? skin : DEFAULT_SKIN,
      option: (option as ThemeOption | null) ?? DEFAULT_OPTION,
    }
  }
  // Migrate the legacy single theme value.
  const legacy = await read(THEME_MODE_KEY)
  return migrateStoredTheme(legacy) ?? { skin: DEFAULT_SKIN, option: DEFAULT_OPTION }
}

export async function setTheme(skin: SkinId, option: ThemeOption): Promise<void> {
  await Promise.all([write(SKIN_KEY, skin), write(THEME_OPTION_KEY, option)])
}

/** The last bridge host/port this phone reached, for connecting again directly. */
export function getLastHost(): Promise<string | null> {
  return read(LAST_HOST_KEY)
}

export function setLastHost(host: string): Promise<void> {
  return write(LAST_HOST_KEY, host)
}

export async function getLastPort(): Promise<number | null> {
  const value = await read(LAST_PORT_KEY)
  const port = Number(value)
  return value != null && Number.isInteger(port) && port > 0 && port <= 65535 ? port : null
}

export function setLastPort(port: number): Promise<void> {
  return write(LAST_PORT_KEY, String(port))
}

export async function clearLastAddress(): Promise<void> {
  await remove(LAST_HOST_KEY)
  await remove(LAST_PORT_KEY)
}

/** Generic secure read/write for small internal values (e.g. diagnostics). */
export function readSecure(key: string): Promise<string | null> {
  return read(key)
}

export function writeSecure(key: string, value: string): Promise<void> {
  return write(key, value)
}
