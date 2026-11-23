import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'

const CAMPUS_USER_LINKS = [
  { to: '/resources', label: 'Find resources' },
  { to: '/my-reservations', label: 'My reservations' },
  { to: '/check-in', label: 'Check in' },
  { to: '/notifications', label: 'Notifications' },
]

const ADMIN_LINKS = [
  { to: '/admin/resources', label: 'Resources' },
  { to: '/admin/approvals', label: 'Approvals' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/penalties', label: 'Penalties' },
]

/** Frame of every page after login: header, role-based navigation, page content. */
export function Layout() {
  const { user, logout } = useAuth()
  const links = user?.role === 'RESOURCE_ADMIN' ? ADMIN_LINKS : CAMPUS_USER_LINKS

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">CampusSlot</span>
        <nav className="app-nav" aria-label="Main">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-user">
          <span>{user?.fullName}</span>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
