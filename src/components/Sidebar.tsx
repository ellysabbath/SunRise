import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Package, ShoppingCart, Users, Store, Wallet, TrendingUp,
  HandCoins, Receipt, FileText, X, ShoppingBag, UserPlus, Bell,
  BarChart3, Truck, PackagePlus, HouseCog,
  HouseCogIcon, PackageX, CircleDollarSign, Banknote,
  PersonStanding, CogIcon, LogOut, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ==================================================================
// Nav items
// ==================================================================
type Role = 'mteja' | 'muuzaji' | 'mmiliki'

const navByRole: Record<Role, { to: string; label: string; icon: React.ElementType }[]> = {
  mteja: [
    { to: '/mteja', label: 'Nyumbani', icon: Home },
    { to: '/mteja/bidhaa', label: 'Bidhaa', icon: Package },
    { to: '/mteja/quotation', label: 'Quotation', icon: FileText },
    { to: '/mteja/deni', label: 'Deni Langu', icon: Wallet },
    { to: '/mteja/orders', label: 'Order Zangu', icon: ShoppingBag },
    { to: '/mteja/profile', label: 'Wasifu', icon: PersonStanding },
    { to: '/mteja/settings', label: 'Mipangilio', icon: CogIcon },
    { to: '/mteja/notifications', label: 'Taarifa', icon: Bell },
  ],
  muuzaji: [
    { to: '/muuzaji', label: 'POS', icon: ShoppingCart },
    { to: '/muuzaji/risiti', label: 'Risiti za Leo', icon: Receipt },
    { to: '/muuzaji/pokea', label: 'Pokea Bidhaa', icon: Truck },
    { to: '/muuzaji/wateja', label: 'Wateja', icon: UserPlus },
    { to: '/muuzaji/ripoti-bidhaa', label: 'Ripoti za Stoo', icon: PackageX },
    { to: '/muuzaji/store-manage', label: 'Store', icon: HouseCogIcon },
    { to: '/muuzaji/mshahara', label: 'Mshahara Wangu', icon: CircleDollarSign },
    { to: '/muuzaji/carts', label: 'Carts Zinazosubiri', icon: Bell },
    { to: '/muuzaji/matumizi', label: 'Maombi ya Matumizi', icon: Wallet },
    { to: '/muuzaji/ripoti', label: 'Ripoti za Duka', icon: BarChart3 },
    { to: '/muuzaji/profile', label: 'Wasifu', icon: PersonStanding },
    { to: '/muuzaji/settings', label: 'Mipangilio', icon: CogIcon },
    { to: '/muuzaji/notifications', label: 'Taarifa', icon: Bell },
  ],
  mmiliki: [
    { to: '/mmiliki', label: 'Dashboard', icon: Home },
    { to: '/mmiliki/maduka', label: 'Maduka', icon: Store },
     { to: '/mmiliki/users', label: 'Watumiaji', icon: Users },
    { to: '/mmiliki/wafanyakazi', label: 'Wafanyakazi', icon: Users },
    { to: '/mmiliki/faida', label: 'Faida/Hasara', icon: TrendingUp },
    { to: '/mmiliki/mauzo', label: 'Mauzo na Faida', icon: TrendingUp },
    { to: '/mmiliki/ripoti-bidhaa', label: 'Ripoti za Bidhaa', icon: PackageX },
    { to: '/mmiliki/mishahara', label: 'Mishahara', icon: Banknote },
    { to: '/mmiliki/zaka', label: 'Zaka & Sadaka', icon: HandCoins },
    { to: '/mmiliki/uingiza', label: 'Ingiza Vifaa', icon: PackagePlus },
    { to: '/mmiliki/wateja', label: 'Wateja', icon: UserPlus },
    { to: '/mmiliki/orders', label: 'Order Zote', icon: ShoppingBag },
    { to: '/mmiliki/matumizi', label: 'Maombi ya Matumizi', icon: Wallet },
    { to: '/mmiliki/store-manage', label: 'Store', icon: HouseCog },
    { to: '/mmiliki/ripoti', label: 'Ripoti & Documents', icon: FileText },
    { to: '/mmiliki/notifications', label: 'Taarifa', icon: Bell },
    { to: '/mmiliki/profile', label: 'Wasifu', icon: PersonStanding },
    { to: '/mmiliki/settings', label: 'Mipangilio', icon: CogIcon },
  ],
}

const roleLabels: Record<Role, string> = {
  mteja: 'Mteja Portal',
  muuzaji: 'Muuzaji Duka',
  mmiliki: 'Mmiliki Dashboard',
}

// ==================================================================
// Sidebar
// ==================================================================
interface SidebarProps {
  role: Role
  open: boolean
  onClose: () => void
}

export default function Sidebar({ role, open, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)

  // ✅ Hakikisha nav items zipo — usiruhusu undefined
  const items = navByRole[role] ?? []
  const roleLabel = roleLabels[role] ?? 'Dashboard'

  // ------------------------------------------------------------------
  // ✅ Funga sidebar kila route inabadilika (mobile tu)
  // ------------------------------------------------------------------
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------
  const confirmLogout = () => {
    setLogoutOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  // ==================================================================
  // Content
  // ==================================================================
  const content = (
    <>
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">
            S
          </div>
          <div>
            <div className="font-semibold text-sm">
              SUNRISE GLASSES & ALUMINIUM PROFILES
            </div>
            <div className="text-xs text-slate-500">{roleLabel}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>

      {/* User info */}
      <div className="px-3 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold shrink-0">
            {(user?.full_name || '?')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {user?.full_name || 'Mtumiaji'}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {user?.phone || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            <AlertTriangle size={20} className="mx-auto mb-2 text-amber-500" />
            Hakuna kurasa za role hii.
          </div>
        ) : (
          items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === `/${role}`}
              // ❌ ondoa onClick={handleNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))
        )}
      </nav>

      {/* Footer — Logout */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <button
          onClick={() => setLogoutOpen(true)}
          className="w-full inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-3 py-2.5 rounded-lg hover:bg-red-50 font-medium transition"
        >
          <LogOut size={18} />
          Toka (Logout)
        </button>
      </div>
    </>
  )

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
            {content}
          </aside>
        </div>
      )}

      {/* Logout confirmation modal */}
      {logoutOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setLogoutOpen(false)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 grid place-items-center mx-auto">
                <LogOut size={26} className="text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mt-3">
                Toka Kwenye Akaunti?
              </h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Una uhakika unataka kutoka kwenye akaunti yako? Utahitaji
                kuingia tena.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLogoutOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
                >
                  Ghairi
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 inline-flex items-center justify-center gap-1.5"
                >
                  <LogOut size={14} />
                  Ndiyo, Toka
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}