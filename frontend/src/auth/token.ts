// The JWT is kept in sessionStorage, so it is removed when the tab is closed (5.8.4.2, API-A3).
// Storage can be blocked (private mode, strict settings), so every access is guarded.

const TOKEN_KEY = 'campusslot.token'

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage blocked: the user stays logged in only until the page is reloaded.
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing to clear.
  }
}
