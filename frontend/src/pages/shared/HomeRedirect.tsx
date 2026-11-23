import { Navigate } from 'react-router'
import { homePathFor } from '../../auth/roles'
import { useAuth } from '../../auth/useAuth'

/** "/" sends each role to its own first page. */
export default function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}
