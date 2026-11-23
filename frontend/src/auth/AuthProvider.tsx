import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onUnauthorized } from '../api/client'
import { api } from '../api/endpoints'
import type { AuthResponse, RegisterRequest, UserDto } from '../api/types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'
import { clearToken, getToken, setToken } from './token'

interface State {
  status: AuthStatus
  user: UserDto | null
}

const ANONYMOUS: State = { status: 'anonymous', user: null }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => (getToken() ? { status: 'loading', user: null } : ANONYMOUS))

  const logout = useCallback(() => {
    clearToken()
    setState(ANONYMOUS)
  }, [])

  // A protected call answered 401 (token expired, NFR-02): forget the token, the guards send the user to /login.
  useEffect(() => {
    onUnauthorized(logout)
    return () => onUnauthorized(null)
  }, [logout])

  // After a page reload the token is still in sessionStorage: ask the API who it belongs to (E03).
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    api.auth
      .me()
      .then(({ user }) => {
        if (!cancelled) setState({ status: 'authenticated', user })
      })
      .catch(() => {
        if (cancelled) return
        clearToken()
        setState(ANONYMOUS)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const accept = useCallback((response: AuthResponse) => {
    setToken(response.token)
    setState({ status: 'authenticated', user: response.user })
    return response.user
  }, [])

  const login = useCallback(
    async (email: string, password: string) => accept(await api.auth.login({ email, password })),
    [accept],
  )

  const register = useCallback(
    async (input: RegisterRequest) => accept(await api.auth.register(input)),
    [accept],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ status: state.status, user: state.user, login, register, logout }),
    [state, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
