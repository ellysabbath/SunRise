
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users,
  Plus,
  X,
  Save,
  Phone,
  CheckCircle2,
  XCircle,
  Store,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Search,
  ListFilter,
  Pencil,
  ArrowRightLeft,
  MapPin,
} from 'lucide-react'

import {
  usersApi,
  type User as UserType,
  type UserRole,
} from '../../services/users'

import {
  storesApi,
  type Store as StoreType,
} from '../../services/stores'

import { formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// CONFIGURATION
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

const ROLES_ZENYE_DUKA: UserRole[] = ['muuzaji', 'mhazini']

// ==================================================================
// MAIN PAGE
// ==================================================================

export default function MmilikiWafanyakazi() {
  const [users, setUsers] = useState<UserType[]>([])
  const [stores, setStores] = useState<StoreType[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<UserType | null>(null)

  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState<{
    msg: string
    ok: boolean
  } | null>(null)

  const [q, setQ] = useState('')
  const [filterDuka, setFilterDuka] = useState('zote')
  const [filterRole, setFilterRole] = useState<UserRole | 'zote'>('zote')

  // ------------------------------------------------------------------
  // Toast
  // ------------------------------------------------------------------

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })

    window.setTimeout(() => {
      setToast(null)
    }, ok ? 3000 : 5000)
  }

  // ------------------------------------------------------------------
  // Load workers and stores
  // ------------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [allUsers, allStores] = await Promise.all([
        usersApi.list(),
        storesApi.list(),
      ])

      // Wafanyakazi tu, bila wateja.
      setUsers(allUsers.filter((u) => u.role !== 'mteja'))
      setStores(allStores)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata wafanyakazi. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // ------------------------------------------------------------------
  // Open assignment modal
  // ------------------------------------------------------------------

  const openAssignModal = () => {
    setSelectedWorker(null)
    setModalOpen(true)
  }

  // ------------------------------------------------------------------
  // Open reallocation modal for a particular worker
  // ------------------------------------------------------------------

  const openEditModal = (worker: UserType) => {
    setSelectedWorker(worker)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return

    setModalOpen(false)
    setSelectedWorker(null)
  }

  // ------------------------------------------------------------------
  // Assign / reallocate worker to another store
  // ------------------------------------------------------------------

  const saveAllocation = async (userId: string, storeId: string) => {
    setSaving(true)

    try {
      const worker = users.find((u) => u.id === userId)

      if (!worker) {
        throw new Error('Mfanyakazi hajapatikana.')
      }

      const oldStoreId = worker.store

      const updated = await usersApi.update(userId, {
        store: storeId,
      })

      // Update local state immediately.
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                ...updated,
                store: storeId,
              }
            : u
        )
      )

      const oldStore = stores.find((s) => s.id === oldStoreId)
      const newStore = stores.find((s) => s.id === storeId)

      if (oldStoreId && oldStoreId !== storeId) {
        showToast(
          `${worker.full_name} amehamishwa kutoka ${oldStore?.name || 'duka la awali'} kwenda ${newStore?.name || 'duka jipya'}.`,
          true
        )
      } else {
        showToast(
          `Duka limepangwa kwa ${worker.full_name} kikamilifu.`,
          true
        )
      }

      setModalOpen(false)
      setSelectedWorker(null)
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail ||
          err?.response?.data?.store?.[0] ||
          err?.message ||
          'Imeshindikana kuhifadhi mabadiliko.',
        false
      )

      throw err
    } finally {
      setSaving(false)
    }
  }

  // ------------------------------------------------------------------
  // Filter and search
  // ------------------------------------------------------------------

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filterRole !== 'zote' && u.role !== filterRole) {
        return false
      }

      if (filterDuka !== 'zote' && u.store !== filterDuka) {
        return false
      }

      const query = q.toLowerCase().trim()

      if (!query) return true

      return (
        u.full_name.toLowerCase().includes(query) ||
        u.phone.includes(query)
      )
    })
  }, [users, q, filterRole, filterDuka])

  // ------------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------------

  const stats = useMemo(() => {
    return {
      wote: users.length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
      assigned: users.filter((u) => Boolean(u.store)).length,
      unassigned: users.filter((u) => !u.store).length,
    }
  }, [users])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* ============================================================
          HEADER
      ============================================================ */}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users size={26} className="text-brand-600" />
            Wafanyakazi
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Simamia wafanyakazi na upangaji wa maduka yako.
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={loading ? 'animate-spin' : ''}
            />
            Sasisha
          </button>

          <button
            onClick={openAssignModal}
            disabled={loading || stores.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} />
            Panga Duka
          </button>
        </div>
      </div>

      {/* ============================================================
          STATISTICS
      ============================================================ */}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))
        ) : (
          <>
            <Stat
              label="Wafanyakazi"
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

            <Stat
              label="Wenye maduka"
              value={String(stats.assigned)}
              Icon={Store}
              tone="text-purple-600"
            />

            <Stat
              label="Bila duka"
              value={String(stats.unassigned)}
              Icon={AlertTriangle}
              tone="text-amber-600"
            />
          </>
        )}
      </div>

      {/* ============================================================
          ERROR
      ============================================================ */}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <div className="flex-1">{error}</div>

          <button
            onClick={load}
            className="text-xs font-semibold underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* ============================================================
          SEARCH AND FILTERS
      ============================================================ */}

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
            onChange={(e) =>
              setFilterRole(e.target.value as UserRole | 'zote')
            }
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

      {/* ============================================================
          LOADING
      ============================================================ */}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <WorkerSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ============================================================
          EMPTY STATE
      ============================================================ */}

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

      {/* ============================================================
          WORKERS GRID
      ============================================================ */}

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
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-200 transition-colors"
              >
                {/* Worker information */}

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
                    className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${
                      ROLE_COLOR[u.role]
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                {/* Contact and store */}

                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} />
                    {u.phone}
                  </div>

                  <div className="flex items-start gap-1.5">
                    <Store size={12} className="mt-0.5 shrink-0" />

                    {store ? (
                      <div className="min-w-0">
                        <span className="font-medium text-slate-700">
                          {store.name.replace('Smart Hardware - ', '')}
                        </span>

                        {store.location && (
                          <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                            <MapPin size={10} />
                            {store.location}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-amber-600 font-medium">
                        Hana duka lililopangwa
                      </span>
                    )}
                  </div>
                </div>

                {/* Status and date */}

                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                  {u.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                      <CheckCircle2 size={12} />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-700 font-semibold">
                      <XCircle size={12} />
                      Imezuiwa
                    </span>
                  )}

                  <span className="text-[10px] text-slate-400">
                    {u.created_at ? formatDate(u.created_at) : '—'}
                  </span>
                </div>

                {/* Reallocation action */}

                <div className="mt-3">
                  <button
                    onClick={() => openEditModal(u)}
                    disabled={saving || stores.length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 text-xs font-semibold hover:bg-brand-100 disabled:opacity-50 transition-colors"
                  >
                    {u.store ? (
                      <>
                        <ArrowRightLeft size={14} />
                        Badili Duka
                      </>
                    ) : (
                      <>
                        <Pencil size={14} />
                        Mpangie Duka
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ============================================================
          ASSIGN / REALLOCATION MODAL
      ============================================================ */}

      {modalOpen && (
        <FomuPangaDuka
          workers={users.filter((u) =>
            ROLES_ZENYE_DUKA.includes(u.role)
          )}
          stores={stores}
          initialWorker={selectedWorker}
          saving={saving}
          onClose={closeModal}
          onSubmit={saveAllocation}
        />
      )}

      {/* ============================================================
          TOAST
      ============================================================ */}

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
// STATISTICS CARD
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

      <div className="text-xs text-slate-500 mt-2.5">
        {label}
      </div>

      <div className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
        {value}
      </div>
    </div>
  )
}

// ==================================================================
// SKELETONS
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
// ASSIGN / REALLOCATE STORE FORM
// ==================================================================

function FomuPangaDuka({
  workers,
  stores,
  initialWorker,
  saving,
  onClose,
  onSubmit,
}: {
  workers: UserType[]
  stores: StoreType[]
  initialWorker: UserType | null
  saving: boolean
  onClose: () => void
  onSubmit: (userId: string, storeId: string) => Promise<void>
}) {
  const [userId, setUserId] = useState(
    initialWorker?.id || workers[0]?.id || ''
  )

  const [storeId, setStoreId] = useState(
    initialWorker?.store || ''
  )

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ------------------------------------------------------------------
  // Selected worker and current store
  // ------------------------------------------------------------------

  const selectedWorker = workers.find((u) => u.id === userId)

  const currentStore = stores.find(
    (s) => s.id === selectedWorker?.store
  )

  const destinationStore = stores.find(
    (s) => s.id === storeId
  )

  const isReallocation = Boolean(
    selectedWorker?.store &&
    selectedWorker.store !== storeId
  )

  // ------------------------------------------------------------------
  // When worker changes, show their current store
  // ------------------------------------------------------------------

  const handleWorkerChange = (newUserId: string) => {
    setUserId(newUserId)

    const worker = workers.find((u) => u.id === newUserId)

    setStoreId(worker?.store || '')
    setError('')
  }

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!userId) {
      setError('Chagua mfanyakazi.')
      return
    }

    if (!storeId) {
      setError('Chagua duka unalotaka kumpangia.')
      return
    }

    if (!selectedWorker) {
      setError('Mfanyakazi aliyechaguliwa hajapatikana.')
      return
    }

    if (selectedWorker.store === storeId) {
      setError('Mfanyakazi tayari amepangiwa duka hili.')
      return
    }

    setSubmitting(true)

    try {
      await onSubmit(userId, storeId)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.store?.[0] ||
          err?.message ||
          'Imeshindikana kuhifadhi mabadiliko.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">

      {/* Backdrop */}

      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !saving && !submitting && onClose()}
      />

      {/* Modal */}

      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}

        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center z-10">
          <div>
            <div className="font-semibold flex items-center gap-2">
              {initialWorker?.store ? (
                <>
                  <ArrowRightLeft
                    size={17}
                    className="text-brand-600"
                  />
                  Badili Duka la Mfanyakazi
                </>
              ) : (
                <>
                  <Store
                    size={17}
                    className="text-brand-600"
                  />
                  Panga Duka kwa Mfanyakazi
                </>
              )}
            </div>

            <div className="text-xs text-slate-500 mt-0.5">
              Chagua mfanyakazi na duka analopaswa kufanya kazi.
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving || submitting}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}

        <form onSubmit={submit} className="p-4 space-y-4">

          {/* Worker selection */}

          <div>
            <label className="text-sm font-medium text-slate-700">
              Mfanyakazi <span className="text-red-500">*</span>
            </label>

            {workers.length === 0 ? (
              <div className="mt-1 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
                Hakuna wafanyakazi wenye role ya Muuzaji au Mhazini.
              </div>
            ) : (
              <select
                value={userId}
                onChange={(e) => handleWorkerChange(e.target.value)}
                disabled={Boolean(initialWorker) || saving || submitting}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm bg-white disabled:bg-slate-50"
              >
                {workers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} — {u.phone} ({ROLE_LABEL[u.role]})
                  </option>
                ))}
              </select>
            )}

            {initialWorker && (
              <p className="text-[11px] text-slate-500 mt-1">
                Unabadilisha upangaji wa {initialWorker.full_name}.
              </p>
            )}
          </div>

          {/* Current store information */}

          {selectedWorker && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2">
                DUKA LA SASA
              </div>

              {currentStore ? (
                <div className="flex items-start gap-2">
                  <Store
                    size={16}
                    className="text-slate-500 mt-0.5"
                  />

                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {currentStore.name}
                    </div>

                    {currentStore.location && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {currentStore.location}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-amber-700 font-medium">
                  Mfanyakazi huyu bado hajapangiwa duka.
                </div>
              )}
            </div>
          )}

          {/* Destination store */}

          <div>
            <label className="text-sm font-medium text-slate-700">
              {selectedWorker?.store ? 'Duka jipya' : 'Chagua duka'}{' '}
              <span className="text-red-500">*</span>
            </label>

            <select
              value={storeId}
              onChange={(e) => {
                setStoreId(e.target.value)
                setError('')
              }}
              disabled={saving || submitting || stores.length === 0}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm bg-white disabled:bg-slate-50"
            >
              <option value="">-- Chagua duka --</option>

              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.location ? `— ${s.location}` : ''}
                </option>
              ))}
            </select>

            {stores.length === 0 && (
              <p className="text-xs text-red-600 mt-1">
                Hakuna maduka yaliyopatikana.
              </p>
            )}
          </div>

          {/* Reallocation preview */}

          {isReallocation && destinationStore && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-blue-800 text-sm font-semibold">
                <ArrowRightLeft size={16} />
                Muhtasari wa uhamisho
              </div>

              <div className="flex items-center gap-2 text-xs text-blue-700">
                <span className="flex-1 min-w-0 truncate">
                  {currentStore?.name || 'Duka la awali'}
                </span>

                <ArrowRightLeft size={14} className="shrink-0" />

                <span className="flex-1 min-w-0 truncate font-semibold">
                  {destinationStore.name}
                </span>
              </div>

              <p className="text-[11px] text-blue-700">
                Ukihifadhi, mfanyakazi huyu atapangiwa duka jipya
                badala ya duka lake la sasa.
              </p>
            </div>
          )}

          {/* Error */}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || submitting}
              className="px-4 py-2.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              Ghairi
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                submitting ||
                !userId ||
                !storeId ||
                !selectedWorker ||
                selectedWorker.store === storeId
              }
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {saving || submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Inahifadhi...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isReallocation ? 'Hifadhi Mabadiliko' : 'Panga Duka'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
