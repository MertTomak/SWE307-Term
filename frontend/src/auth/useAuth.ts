import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContext'

/** Current user and login / register / logout. Usable in any component inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
