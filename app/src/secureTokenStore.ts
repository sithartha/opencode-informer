import * as SecureStore from "expo-secure-store"
import { DEVICE_NAME_KEY, LIVE_ACTIVITY_KEY, MAC_NAME_KEY, THEME_MODE_KEY, TOKEN_KEY, type TokenStore } from "./tokenStore"

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

export function getThemeMode(): Promise<string | null> {
  return read(THEME_MODE_KEY)
}

export function setThemeMode(mode: string): Promise<void> {
  return write(THEME_MODE_KEY, mode)
}
