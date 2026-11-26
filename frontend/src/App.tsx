import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequireRole } from './auth/RequireRole'
import { ADMIN_ROLES, CAMPUS_USER_ROLES } from './auth/roles'
import { Layout } from './components/Layout'
import AdminApprovalsPage from './pages/admin/AdminApprovalsPage'
import AdminPenaltiesPage from './pages/admin/AdminPenaltiesPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminResourcesPage from './pages/admin/AdminResourcesPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import MyReservationsPage from './pages/campus/MyReservationsPage'
import NewReservationPage from './pages/campus/NewReservationPage'
import HomeRedirect from './pages/shared/HomeRedirect'
import NotFoundPage from './pages/shared/NotFoundPage'
import NotificationsPage from './pages/shared/NotificationsPage'
import ResourceDetailPage from './pages/shared/ResourceDetailPage'
import ResourceSearchPage from './pages/shared/ResourceSearchPage'

// Check-in carries the QR library (about 480 kB). It is loaded only when the page is opened,
// so the other pages stay small ("lazy loading").
const CheckInPage = lazy(() => import('./pages/campus/CheckInPage'))

// Development only (H23). In `npm run build` DEV is false, so this import is removed from the bundle.
const QrTestPage = import.meta.env.DEV ? lazy(() => import('./pages/dev/QrTestPage')) : null

const loading = <p className="page-status">Loading…</p>

// Route map. Access per role follows the access table in 5.4 (FR-05, D3).
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Any logged-in user */}
          <Route element={<RequireRole />}>
            <Route element={<Layout />}>
              <Route index element={<HomeRedirect />} />
              <Route path="resources" element={<ResourceSearchPage />} />
              <Route path="resources/:resourceId" element={<ResourceDetailPage />} />
              <Route path="notifications" element={<NotificationsPage />} />

              {/* STUDENT and ACADEMIC_STAFF (Campus User) */}
              <Route element={<RequireRole roles={CAMPUS_USER_ROLES} />}>
                <Route path="reservations/new" element={<NewReservationPage />} />
                <Route path="my-reservations" element={<MyReservationsPage />} />
                <Route path="check-in" element={<Suspense fallback={loading}><CheckInPage /></Suspense>} />
              </Route>

              {/* RESOURCE_ADMIN */}
              <Route element={<RequireRole roles={ADMIN_ROLES} />}>
                <Route path="admin/resources" element={<AdminResourcesPage />} />
                <Route path="admin/approvals" element={<AdminApprovalsPage />} />
                <Route path="admin/reports" element={<AdminReportsPage />} />
                <Route path="admin/penalties" element={<AdminPenaltiesPage />} />
              </Route>
            </Route>
          </Route>

          {/* Development only: test QR code for the phone test of the Check-in page (H23). Removed from the build. */}
          {QrTestPage && <Route path="/dev/qr-test" element={<Suspense fallback={loading}><QrTestPage /></Suspense>} />}

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
