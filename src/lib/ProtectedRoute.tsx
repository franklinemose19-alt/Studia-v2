import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { signedIn, loading } = useAuth()
  const location = useLocation()

  // Show a full-screen spinner while the initial session check runs.
  // This prevents the "flash of login page" for users who are already
  // signed in — they'll see the spinner for <100ms, then land on dashboard.
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-blue" />
        </div>
      </div>
    )
  }

  // Session check done — no user found → send to login.
  // Save the attempted URL so we can redirect back after login.
  if (!signedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
