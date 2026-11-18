import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Users, Plus, Search, X, Loader2, Pencil, Trash2, Key, Power,
  Shield, ShieldCheck, ShieldX, AlertTriangle, CheckCircle2,
  Phone, UserCheck, UserX, Crown, ShoppingBag,
  MoreVertical, Eye, EyeOff, RefreshCw,
} from 'lucide-react'
import {
  mmilikiUsersApi,
  type MmilikiUser,
  type UserRole,
  type UsersSummary,
} from '../../services/mmiliki'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
const ROLE_LABEL: Record<UserRole, string> = {
  mteja: 'Mteja',
  muuzaji: 'Muuzaji',
  mmiliki: 'Mmiliki',
  admin: 'Admin',
  mhazini: 'Mhazini',
}

const ROLE_STYLE: Record<UserRole, string> = {
  mteja: 'bg-blue-50 text-blue-700 border-blue-200',
  muuzaji: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mmiliki: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  mhazini: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

const ROLE_ICON: Record<UserRole, React.ElementType> = {
  mteja: ShoppingBag,
  muuzaji: UserCheck,
  mmiliki: Crown,
  admin: Shield,
  mhazini: ShieldCheck,
}

const ALL_ROLES: UserRole[] = ['mteja', 'muuzaji', 'mmiliki', 'admin', 'mhazini']

const MENU_WIDTH = 208 // w-52 = 13rem = 208px
const MENU_HEIGHT = 380 // estimate ya menu yote

// ==================================================================
// Page
// ==================================================================
export default function MmilikiUsers() {
  // Data
  const [users, setUsers] = useState<MmilikiUser[]>([])
  const [summary, setSummary] = useState<UsersSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [filterActive, setFilterActive] = useState<string>('')

  // Create/Edit modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<MmilikiUser | null>(null)
  const [formPhone, setFormPhone] = useState('')
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('mteja')
  const [formPassword, setFormPassword] = useState('')
  const [formShowPassword, setFormShowPassword] = useState(false)
  const [formActive, setFormActive] = useState(true)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Password modal
  const [pwdTarget, setPwdTarget] = useState<MmilikiUser | null>(null)
  const [pwdValue, setPwdValue] = useState('')
  const [pwdShow, setPwdShow] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<MmilikiUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Action menu (portal-based)
  const [openMenu, setOpenMenu] = useState<{
    id: string
    top: number
    left: number
  } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Detail modal
  const [detailUser, setDetailUser] = useState<MmilikiUser | null>(null)

  // ------------------------------------------------------------------
  // Close menu on outside click / scroll / resize
  // ------------------------------------------------------------------
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    function onScroll() {
      setOpenMenu(null)
    }
    function onResize() {
      setOpenMenu(null)
    }
    if (openMenu) {
      document.addEventListener('mousedown', onClick)
      window.addEventListener('scroll', onScroll, true)
      window.addEventListener('resize', onResize)
      return () => {
        document.removeEventListener('mousedown', onClick)
        window.removeEventListener('scroll', onScroll, true)
        window.removeEventListener('resize', onResize)
      }
    }
  }, [openMenu])

  // ------------------------------------------------------------------
  // Open action menu (positioned relative to button, rendered in portal)
  // ------------------------------------------------------------------
  const openActionMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    userId: string
  ) => {
    e.stopPropagation()
    if (openMenu?.id === userId) {
      setOpenMenu(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()

    // Horizontal: align right edge of menu to button's right
    let left = rect.right - MENU_WIDTH
    if (left < 8) left = 8
    if (left + MENU_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - MENU_WIDTH - 8
    }

    // Vertical: below button by default; if no space, above
    let top = rect.bottom + 4
    if (top + MENU_HEIGHT > window.innerHeight - 8) {
      top = rect.top - MENU_HEIGHT - 4
      if (top < 8) top = 8
    }

    setOpenMenu({ id: userId, top, left })
  }

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [usersData, summaryData] = await Promise.all([
        mmilikiUsersApi.list({
          role: filterRole || undefined,
          is_active: filterActive === '' ? undefined : filterActive === 'true',
          search: search || undefined,
        }),
        mmilikiUsersApi.summary().catch(() => null),
      ])
      setUsers(usersData)
      setSummary(summaryData)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Imeshindwa kupakua users')
    } finally {
      setLoading(false)
    }
  }, [filterRole, filterActive, search])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Auto-dismiss success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  // ------------------------------------------------------------------
  // Open create/edit
  // ------------------------------------------------------------------
  const openCreate = () => {
    setEditingUser(null)
    setFormPhone('')
    setFormName('')
    setFormRole('mteja')
    setFormPassword('')
    setFormActive(true)
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (u: MmilikiUser) => {
    setEditingUser(u)
    setFormPhone(u.phone)
    setFormName(u.full_name)
    setFormRole(u.role)
    setFormPassword('')
    setFormActive(u.is_active)
    setFormError('')
    setFormOpen(true)
    setOpenMenu(null)
  }

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  const handleSave = async () => {
    setFormError('')
    if (!formPhone.trim() || !formName.trim()) {
      setFormError('Phone na jina ni lazima')
      return
    }
    if (!editingUser && formPassword.length < 6) {
      setFormError('Password lazima iwe angalau herufi 6')
      return
    }

    setFormSaving(true)
    try {
      if (editingUser) {
        const updated = await mmilikiUsersApi.update(editingUser.id, {
          phone: formPhone,
          full_name: formName,
          role: formRole,
          is_active: formActive,
        })
        setUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u))
        )
        setSuccess('Mtumiaji amehaririwa')
      } else {
        const created = await mmilikiUsersApi.create({
          phone: formPhone,
          full_name: formName,
          role: formRole,
          password: formPassword,
          is_active: formActive,
        })
        setUsers((prev) => [created, ...prev])
        setSuccess('Mtumiaji ameundwa')
      }
      setFormOpen(false)
      mmilikiUsersApi.summary().then(setSummary).catch(() => {})
    } catch (e: any) {
      const detail = e?.response?.data
      if (typeof detail === 'object') {
        const first = Object.values(detail)[0]
        setFormError(String(first))
      } else {
        setFormError(detail || 'Imeshindwa kuhifadhi')
      }
    } finally {
      setFormSaving(false)
    }
  }

  // ------------------------------------------------------------------
  // Toggle active
  // ------------------------------------------------------------------
  const handleToggleActive = async (u: MmilikiUser) => {
    setOpenMenu(null)
    try {
      const res = await mmilikiUsersApi.toggleActive(u.id)
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, is_active: res.is_active } : x
        )
      )
      setSuccess(res.detail || 'Hali imebadilishwa')
      mmilikiUsersApi.summary().then(setSummary).catch(() => {})
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Imeshindwa kubadilisha hali')
    }
  }

  // ------------------------------------------------------------------
  // Change role
  // ------------------------------------------------------------------
  const handleChangeRole = async (u: MmilikiUser, role: UserRole) => {
    setOpenMenu(null)
    if (u.role === role) return
    try {
      await mmilikiUsersApi.changeRole(u.id, role)
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, role } : x))
      )
      setSuccess(`Role imebadilishwa kuwa ${ROLE_LABEL[role]}`)
      mmilikiUsersApi.summary().then(setSummary).catch(() => {})
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Imeshindwa kubadilisha role')
    }
  }

  // ------------------------------------------------------------------
  // Set password
  // ------------------------------------------------------------------
  const handleSetPassword = async () => {
    setPwdError('')
    if (!pwdTarget) return
    if (pwdValue.length < 6) {
      setPwdError('Password lazima iwe angalau herufi 6')
      return
    }
    setPwdSaving(true)
    try {
      await mmilikiUsersApi.setPassword(pwdTarget.id, pwdValue)
      setPwdTarget(null)
      setPwdValue('')
      setSuccess('Password imebadilishwa')
    } catch (e: any) {
      setPwdError(e?.response?.data?.detail || 'Imeshindwa kubadilisha password')
    } finally {
      setPwdSaving(false)
    }
  }

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await mmilikiUsersApi.remove(deleteTarget.id)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === deleteTarget.id ? { ...u, is_active: false } : u
        )
      )
      setDeleteTarget(null)
      setSuccess('Mtumiaji amezimwa')
      mmilikiUsersApi.summary().then(setSummary).catch(() => {})
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Imeshindwa kufuta user')
    } finally {
      setDeleting(false)
    }
  }

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={24} className="text-brand-600" />
            Watumiaji Wote
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Simamia watumiaji wote — wateja, wauzaji, mameneja, n.k.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
          >
            <Plus size={16} />
            Ongeza Mtumiaji
          </button>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Jumla" value={summary.total} icon={Users} color="brand" />
          <StatCard label="Active" value={summary.active} icon={UserCheck} color="emerald" />
          <StatCard label="Inactive" value={summary.inactive} icon={UserX} color="red" />
          <StatCard
            label="Wauzaji"
            value={summary.by_role.muuzaji || 0}
            icon={ShieldCheck}
            color="amber"
          />
        </div>
      ) : null}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tafuta jina au phone..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
          >
            <option value="">Roles zote</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
          >
            <option value="">Hali zote</option>
            <option value="true">Active tu</option>
            <option value="false">Inactive tu</option>
          </select>
        </div>
      </div>

      {/* Users list */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Desktop skeleton table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Mtumiaji</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Hali</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Alijiunga</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Last Login</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Vitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: 6 }).map((_, i) => (
                  <UserRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile skeleton cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <UserCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-900">Hakuna watumiaji</h3>
          <p className="text-sm text-slate-500 mt-1">
            Bonyeza "Ongeza Mtumiaji" kuanza
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* ================= DESKTOP TABLE ================= */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Mtumiaji</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Hali</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Alijiunga</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Last Login</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Vitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const RoleIcon = ROLE_ICON[u.role]
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold shrink-0">
                            {u.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate">
                              {u.full_name}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Phone size={10} />
                              {u.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border font-medium ${ROLE_STYLE[u.role]}`}>
                          <RoleIcon size={12} />
                          {ROLE_LABEL[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                            <CheckCircle2 size={12} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-50 text-red-700 font-medium">
                            <ShieldX size={12} />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {u.date_joined?.slice(0, 10) || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {u.last_login_display || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => openActionMenu(e, u.id)}
                            className="p-1.5 rounded-md hover:bg-slate-100"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ================= MOBILE CARDS ================= */}
          <div className="md:hidden divide-y divide-slate-100">
            {users.map((u) => {
              const RoleIcon = ROLE_ICON[u.role]
              return (
                <div key={u.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-brand-600 text-white grid place-items-center text-sm font-bold shrink-0">
                      {u.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 truncate">
                        {u.full_name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {u.phone}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${ROLE_STYLE[u.role]}`}>
                          <RoleIcon size={10} />
                          {ROLE_LABEL[u.role]}
                        </span>
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                            <CheckCircle2 size={10} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">
                            <ShieldX size={10} /> Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Alijiunga: {u.date_joined?.slice(0, 10) || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setDetailUser(u)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                    >
                      <Eye size={12} /> Maelezo
                    </button>
                    <button
                      onClick={() => openEdit(u)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
                    >
                      <Pencil size={12} /> Hariri
                    </button>
                    <button
                      onClick={(e) => openActionMenu(e, u.id)}
                      className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100"
                    >
                      <MoreVertical size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ================= ACTION MENU PORTAL ================= */}
      {openMenu && (() => {
        const targetUser = users.find((u) => u.id === openMenu.id)
        if (!targetUser) return null
        return createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: openMenu.top,
              left: openMenu.left,
              width: MENU_WIDTH,
              zIndex: 100,
            }}
            className="bg-white rounded-lg border border-slate-200 shadow-xl py-1"
          >
            <button
              onClick={() => {
                setDetailUser(targetUser)
                setOpenMenu(null)
              }}
              className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-50 text-left"
            >
              <Eye size={14} className="text-slate-500" /> Ona Maelezo
            </button>
            <button
              onClick={() => openEdit(targetUser)}
              className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-50 text-left"
            >
              <Pencil size={14} className="text-slate-500" /> Hariri
            </button>
            <button
              onClick={() => {
                setPwdTarget(targetUser)
                setPwdValue('')
                setPwdError('')
                setOpenMenu(null)
              }}
              className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-50 text-left"
            >
              <Key size={14} className="text-slate-500" /> Badilisha Password
            </button>
            <div className="border-t border-slate-100 my-1" />
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase">
              Badilisha Role
            </div>
            {ALL_ROLES.filter((r) => r !== targetUser.role).map((r) => {
              const RIcon = ROLE_ICON[r]
              return (
                <button
                  key={r}
                  onClick={() => handleChangeRole(targetUser, r)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-50 text-left"
                >
                  <RIcon size={14} className="text-slate-500" />
                  {ROLE_LABEL[r]}
                </button>
              )
            })}
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => handleToggleActive(targetUser)}
              className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-50 text-left"
            >
              <Power size={14} className="text-slate-500" />
              {targetUser.is_active ? 'Zima (Deactivate)' : 'Washa (Activate)'}
            </button>
            <button
              onClick={() => {
                setDeleteTarget(targetUser)
                setOpenMenu(null)
              }}
              className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-red-50 text-red-600 text-left"
            >
              <Trash2 size={14} /> Futa (Soft)
            </button>
          </div>,
          document.body
        )
      })()}

      {/* ================= CREATE/EDIT MODAL ================= */}
      {formOpen && (
        <Modal onClose={() => setFormOpen(false)}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {editingUser ? 'Hariri Mtumiaji' : 'Ongeza Mtumiaji Mpya'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {editingUser ? 'Badilisha taarifa za mtumiaji' : 'Jaza taarifa za mtumiaji mpya'}
                </p>
              </div>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-md hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Jina Kamili *
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Mfano: Juma Bakari"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Namba ya Simu *
                </label>
                <input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Mfano: 0712345678"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Role *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_ROLES.map((r) => {
                    const Icon = ROLE_ICON[r]
                    const active = formRole === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormRole(r)}
                        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border-2 text-xs font-semibold transition ${
                          active
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon size={14} />
                        {ROLE_LABEL[r]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={formShowPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Angalau herufi 6"
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 text-slate-500"
                    >
                      {formShowPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                <input
                  id="formActive"
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="formActive" className="text-sm text-slate-700 cursor-pointer">
                  Mtumiaji active (anaweza kuingia)
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setFormOpen(false)}
                disabled={formSaving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
              >
                Ghairi
              </button>
              <button
                onClick={handleSave}
                disabled={formSaving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {formSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Inahifadhi...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    {editingUser ? 'Hifadhi' : 'Ongeza'}
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= PASSWORD MODAL ================= */}
      {pwdTarget && (
        <Modal onClose={() => setPwdTarget(null)}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Badilisha Password</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Kwa: <strong>{pwdTarget.full_name}</strong>
                </p>
              </div>
              <button onClick={() => setPwdTarget(null)} className="p-1 rounded-md hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {pwdError && (
              <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {pwdError}
              </div>
            )}

            <div className="relative">
              <input
                type={pwdShow ? 'text' : 'password'}
                value={pwdValue}
                onChange={(e) => setPwdValue(e.target.value)}
                placeholder="Password mpya (angalau 6)"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setPwdShow((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                {pwdShow ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setPwdTarget(null)}
                disabled={pwdSaving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
              >
                Ghairi
              </button>
              <button
                onClick={handleSetPassword}
                disabled={pwdSaving || pwdValue.length < 6}
                className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {pwdSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Key size={14} />
                )}
                Badilisha
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= DELETE MODAL ================= */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)}>
          <div className="p-5 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 grid place-items-center mx-auto">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mt-3">Futa Mtumiaji?</h3>
            <p className="text-sm text-slate-500 mt-1">
              Una uhakika unataka kufuta <strong>{deleteTarget.full_name}</strong>?
              Atapewa soft delete (is_active = false).
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
              >
                Ghairi
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Futa
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= DETAIL MODAL ================= */}
      {detailUser && (
        <Modal onClose={() => setDetailUser(null)}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900">Maelezo ya Mtumiaji</h3>
              <button onClick={() => setDetailUser(null)} className="p-1 rounded-md hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-brand-600 text-white grid place-items-center text-lg font-bold">
                {detailUser.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{detailUser.full_name}</div>
                <div className="text-sm text-slate-500">{detailUser.phone}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <DetailRow label="Role" value={ROLE_LABEL[detailUser.role]} />
              <DetailRow
                label="Hali"
                value={detailUser.is_active ? 'Active' : 'Inactive'}
                color={detailUser.is_active ? 'text-emerald-600' : 'text-red-600'}
              />
              <DetailRow
                label="Alijiunga"
                value={detailUser.date_joined?.slice(0, 10) || '—'}
              />
              <DetailRow
                label="Last Login"
                value={detailUser.last_login_display || '—'}
              />
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setDetailUser(null)
                  openEdit(detailUser)
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
              >
                <Pencil size={14} /> Hariri
              </button>
              <button
                onClick={() => setDetailUser(null)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
              >
                Funga
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ==================================================================
// Helpers
// ==================================================================
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <div className={`p-3 rounded-xl border ${colors[color] || colors.brand}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold opacity-75">{label}</div>
        <Icon size={16} className="opacity-60" />
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="p-2 rounded-lg bg-slate-50">
      <div className="text-[10px] font-semibold text-slate-500 uppercase">{label}</div>
      <div className={`text-sm font-semibold ${color || 'text-slate-900'}`}>{value}</div>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

// ==================================================================
// Skeletons
// ==================================================================
function StatCardSkeleton() {
  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-3 w-16" />
        <div className="w-4 h-4 rounded bg-slate-200 animate-pulse" />
      </div>
      <SkeletonLine className="h-7 w-12 mt-2" />
    </div>
  )
}

function UserRowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-24" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <SkeletonLine className="h-6 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonLine className="h-6 w-16 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonLine className="h-3 w-20" />
      </td>
      <td className="px-4 py-3">
        <SkeletonLine className="h-3 w-20" />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <div className="w-7 h-7 rounded-md bg-slate-200 animate-pulse" />
        </div>
      </td>
    </tr>
  )
}

function UserCardSkeleton() {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-slate-200 animate-pulse shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <SkeletonLine className="h-4 w-40" />
          <SkeletonLine className="h-3 w-28" />
          <div className="flex gap-1.5 mt-2">
            <SkeletonLine className="h-4 w-16 rounded" />
            <SkeletonLine className="h-4 w-14 rounded" />
          </div>
          <SkeletonLine className="h-3 w-32 mt-1" />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <div className="flex-1 h-8 rounded-lg bg-slate-200 animate-pulse" />
        <div className="flex-1 h-8 rounded-lg bg-slate-200 animate-pulse" />
        <div className="w-10 h-8 rounded-lg bg-slate-200 animate-pulse" />
      </div>
    </div>
  )
}