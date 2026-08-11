import { useState, useEffect } from 'react'
import { Wrench } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { getSupabase } from '../lib/supabaseClient'

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { userId, loading: authLoading } = useAuth()
  const [maintenanceOn, setMaintenanceOn] = useState(false)
  const [checked, setChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const client = await getSupabase()
        const { data } = await client.from('system_settings').select('value').eq('key', 'maintenance_mode').maybeSingle()
        setMaintenanceOn(data?.value === 'true')
      } catch {
        setMaintenanceOn(false) // fail OPEN — a broken check shouldn't lock out every real student
      } finally {
        setChecked(true)
      }
    }
    check()
  }, [])

  useEffect(() => {
    if (!userId) { setIsAdmin(false); return }
    getSupabase().then(client =>
      client.from('users').select('is_admin').eq('auth_id', userId).maybeSingle()
        .then(({ data }) => setIsAdmin(!!data?.is_admin))
        .catch(() => setIsAdmin(false))
    )
  }, [userId])

  if (!checked || authLoading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-blue" />
      </div>
    )
  }

  if (maintenanceOn && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-6">
            <Wrench size={28} className="text-white" />
          </div>
          <h1 className="font-sora font-bold text-3xl text-white mb-3">We'll be right back</h1>
          <p className="text-white/80 text-sm leading-relaxed">
            STUDIA AI is undergoing scheduled maintenance. We're working to get things back up — please check back shortly.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
