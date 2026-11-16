import { useEffect, useMemo, useState } from 'react'
import {
  Users, Plus, X, Save, Phone, CheckCircle2, XCircle,
  Store, RefreshCw, Loader2, AlertTriangle, Search,
  ListFilter, UserPlus, Shield, UserCheck,
} from 'lucide-react'
import {
  usersApi,
  type User as UserType,
  type UserRole,
} from '../../services/users'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
const ROLE_LABEL: Record<UserRole, string> = {
  mteja: 'Mteja',
  muuzaji: 'Muuzaji',
  mhazini: 'Mhazini',
  mmiliki: 'Mmiliki',
  admin: 'Admin',
}

const ROLE_COLOR: Record<UserRole, string> = {
  mteja: 'bg-blue-50 text-blue-700 border-blue-200',
  muuzaji: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mhazini: 'bg-amber-50 text-amber-700 border-amber-200',
  mmiliki: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-slate-50 text-slate-700 border-slate-200',
}

// Roles zinazohitaji duka
const ROLES_ZENYE_DUKA: UserRole[] = ['muuzaji', 'mhazini']

// ==================================================================
// Page
// ==================================================================
export default function MmilikiWafanyakazi() {
  const [users, setUsers] = useState<UserType[]>([])
  const [stores, setStores] = useState<StoreType[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [q, setQ] = useState('')
  const [filterDuka, setFilterDuka] = useState<string>('zote')
  const [filterRole, setFilterRole] = useState<UserRole | 'zote'>('zote')

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [usrs, str] = await Promise.all([
        usersApi.list(),
        storesApi.list(),
      ])
      // Onyesha wafanyakazi tu (sio mteja)
      setUsers(usrs.filter((u) => u.role !== 'mteja'))
      setStores(str)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata wafanyakazi. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // ------------------------------------------------------------------
  // Filter + search
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filterRole !== 'zote' && u.role !== filterRole) return false
      if (filterDuka !== 'zote' && u.store !== filterDuka) return false

      const query = q.toLowerCase().trim()
      if (!query) return true
      return (
        u.full_name.toLowerCase().includes(query) ||
        u.phone.includes(query)
      )
    })
  }, [users, q, filterRole, filterDuka])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    return {
      wote: users.length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
    }
  }, [users])

  // ------------------------------------------------------------------
  // Weka duka kwa mtumiaji
  // ------------------------------------------------------------------
  const wekaDuka = async (userId: string, storeId: string) => {
    try {
      const updated = await usersApi.update(userId, { store: storeId })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updated } : u))
      )
      setOpen(false)
      setToast({
        msg: `Duka limepangwa kwa ${updated.full_name}.`,
        ok: true,
      })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kuhifadhi.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
      throw err
    }
  }

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users size={26} className="text-brand-600" /> Wafanyakazi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Wafanyakazi wote wa maduka yako
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Sasisha
          </button>
          <button
            onClick={() => setOpen(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} /> Panga Duka
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat
              label="Wote"
              value={String(stats.wote)}
              Icon={Users}
              tone="text-blue-600"
            />
            <Stat
              label="Active"
              value={String(stats.active)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />
            <Stat
              label="Imezuiwa"
              value={String(stats.inactive)}
              Icon={XCircle}
              tone="text-red-600"
            />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={load} className="text-xs font-semibold underline">
            Jaribu tena
          </button>
        </div>
      )}

      {/* Filters + Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta kwa jina au simu..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ListFilter size={14} className="text-slate-400" />

          <select
            value={filterDuka}
            onChange={(e) => setFilterDuka(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white"
          >
            <option value="zote">Maduka yote</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.replace('Smart Hardware - ', '')}
              </option>
            ))}
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white"
          >
            <option value="zote">Roles zote</option>
            {ROLES_ZENYE_DUKA.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading — skeleton grid */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <WorkerSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {q || filterDuka !== 'zote' || filterRole !== 'zote'
              ? 'Hakuna matokeo'
              : 'Hakuna wafanyakazi bado'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q || filterDuka !== 'zote' || filterRole !== 'zote'
              ? 'Badilisha vichujio au utafutaji.'
              : 'Bofya "Panga Duka" kuanza.'}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((u) => {
            const initials = u.full_name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()

            const store = stores.find((s) => s.id === u.store)

            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200 text-slate-700 grid place-items-center text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">
                      {u.full_name}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      {ROLE_LABEL[u.role]}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${ROLE_COLOR[u.role]}`}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} /> {u.phone}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Store size={12} />
                    {store ? (
                      store.name.replace('Smart Hardware - ', '')
                    ) : (
                      <span className="text-amber-600 font-medium">
                        Hana duka
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                  {u.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-700 font-semibold">
                      <XCircle size={12} /> Imezuiwa
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {u.created_at ? formatDate(u.created_at) : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {open && (
        <FomuPangaDuka
          onClose={() => setOpen(false)}
          onSubmit={wekaDuka}
          stores={stores}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] text-white text-sm px-4 py-3 rounded-xl shadow-2xl max-w-md flex items-center gap-2 ${
            toast.ok ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.ok ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <XCircle size={16} className="shrink-0" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ==================================================================
// Stat
// ==================================================================
function Stat({
  label,
  value,
  Icon,
  tone,
}: {
  label: string
  value: string
  Icon: React.ElementType
  tone: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div
        className={`w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center ${tone}`}
      >
        <Icon size={16} />
      </div>
      <div className="text-xs text-slate-500 mt-2.5">{label}</div>
      <div className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
        {value}
      </div>
    </div>
  )
}

// ==================================================================
// Skeletons
// ==================================================================
function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="w-9 h-9 rounded-lg bg-slate-200 animate-pulse" />
      <SkeletonLine className="h-3 w-16 mt-2.5" />
      <SkeletonLine className="h-5 w-12 mt-2" />
    </div>
  )
}

function WorkerSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-slate-200 animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5">
          <SkeletonLine className="h-4 w-3/4" />
          <SkeletonLine className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <SkeletonLine className="h-3 w-1/2" />
        <SkeletonLine className="h-3 w-2/5" />
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
        <SkeletonLine className="h-3 w-16" />
        <SkeletonLine className="h-3 w-20" />
      </div>
    </div>
  )
}

// ==================================================================
// Fomu ya Kupanga Duka kwa Mtumiaji Aliyepo
// ==================================================================
function FomuPangaDuka({
  onClose,
  onSubmit,
  stores,
}: {
  onClose: () => void
  onSubmit: (userId: string, storeId: string) => Promise<void>
  stores: StoreType[]
}) {
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userId, setUserId] = useState('')
  const [storeId, setStoreId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch watumiaji wasio na duka
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const data = await usersApi.withoutStore()
        setAvailableUsers(data)
        if (data.length > 0) setUserId(data[0].id)
      } catch {
        setError('Imeshindikana kupata watumiaji.')
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsers()
  }, [])

  // Chagua duka la kwanza
  useEffect(() => {
    if (stores.length > 0 && !storeId) {
      setStoreId(stores[0].id)
    }
  }, [stores, storeId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!userId) return setError('Chagua mtumiaji')
    if (!storeId) return setError('Chagua duka')

    setLoading(true)
    try {
      await onSubmit(userId, storeId)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.store?.[0] ||
          'Imeshindikana kuhifadhi.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !loading && onClose()}
      />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">Panga Duka kwa Mfanyakazi</div>
            <div className="text-xs text-slate-500">
              Chagua mtumiaji aliyepo, kisha duka
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          {/* Mtumiaji */}
          <div>
            <label className="text-sm font-medium">
              Mtumiaji <span className="text-red-500">*</span>
            </label>
            {loadingUsers ? (
              <div className="mt-1 p-3 rounded-lg bg-slate-50 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Inapakia watumiaji...
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="mt-1 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
                Hakuna watumiaji wasio na duka. Wote wamepangwa.
              </div>
            ) : (
              <>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={loading}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50 bg-white"
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} — {u.phone} ({ROLE_LABEL[u.role]})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Watumiaji {availableUsers.length} wasio na duka.
                </p>
              </>
            )}
          </div>

          {/* Duka */}
          <div>
            <label className="text-sm font-medium">
              Duka <span className="text-red-500">*</span>
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50 bg-white"
            >
              {stores.length === 0 ? (
                <option value="">Hakuna maduka</option>
              ) : (
                stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.location}
                  </option>
                ))
              )}
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              Ghairi
            </button>
            <button
              type="submit"
              disabled={loading || availableUsers.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Inahifadhi...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Panga Duka
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}