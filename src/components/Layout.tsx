import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Footer from './Footer'
import SmsToast from './SmsToast'
import { useAuth } from '../context/AuthContext'

type Role = 'mteja' | 'muuzaji' | 'mmiliki'

interface LayoutProps {
  role: Role
  allow?: string[]
}

export default function Layout({ role, allow }: LayoutProps) {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ✅ Funga sidebar kila route inabadilika (mobile tu)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // ✅ Onyesha spinner TU ikiwa bado hatujui user ni nani
  // (sio kila navigation — hii ndio ilikuwa tatizo)
  if (loading && !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-3">Inapakia...</p>
        </div>
      </div>
    )
  }

  // ✅ Hakuna user — rudisha login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ✅ Role check (kama allow imetolewa)
  if (allow && !allow.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar role={role} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>

        <Footer />
      </div>

      {/* SMS Toast — inaonekana juu ya kila kitu */}
      <SmsToast />
    </div>
  )
}