import { createContext } from 'react'
import type { RegisterRequest, UserDto } from '../api/types'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: UserDto | null
  login: (email: string, password: string) => Promise<UserDto>
  register: (input: RegisterRequest) => Promise<UserDto>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
