import { Navigate, Outlet, useLocation } from 'react-router'
import type { Role } from '../api/types'
import { homePathFor } from './roles'
import { useAuth } from './useAuth'

/**
 * Route guard. Without `roles`: any logged-in user. With `roles`: only those roles;
 * other logged-in users are sent to their own home page.
 */
export function RequireRole({ roles }: { roles?: Role[] }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <p className="page-status">Loading…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />
  return <Outlet />
}
