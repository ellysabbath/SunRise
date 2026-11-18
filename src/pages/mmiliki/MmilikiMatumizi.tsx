
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Search,
  ListFilter,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Tag,
  Store,
  User,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'

import { expensesApi, type ExpenseRequest } from '../../services/expenses'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ================================================================
// TYPES
// ================================================================

type ExpenseRequestView = ExpenseRequest & {
  reason?: string | null
  category_name?: string | null
  request_date?: string | null
}

type ExpenseStatus = ExpenseRequest['status']

type ModalMode =
  | 'view'
  | 'kubali'
  | 'kataa'
  | 'confirm-kubali'
  | 'confirm-kataa'

type StatusMeta = {
  label: string
  tone: string
  bg: string
  Icon: ElementType
}

// ================================================================
// STATUS METADATA
// ================================================================

const HALI_META: Record<string, StatusMeta> = {
  pending: {
    label: 'Inasubiri',
    tone: 'text-amber-600',
    bg: 'bg-amber-50',
    Icon: Clock,
  },
  approved: {
    label: 'Imekubaliwa',
    tone: 'text-emerald-600',
    bg: 'bg-emerald-50',
    Icon: CheckCircle2,
  },
  rejected: {
    label: 'Imekataliwa',
    tone: 'text-red-600',
    bg: 'bg-red-50',
    Icon: XCircle,
  },
}

const DEFAULT_STATUS_META: StatusMeta = {
  label: 'Hali haijulikani',
  tone: 'text-slate-600',
  bg: 'bg-slate-100',
  Icon: AlertTriangle,
}

// Normalize status kutoka backend.
// Inasaidia Kiingereza, Kiswahili, herufi kubwa na spaces.
function normalizeStatus(status: unknown): ExpenseStatus | null {
  const value = String(status ?? '')
    .trim()
    .toLowerCase()

  switch (value) {
    case 'pending':
    case 'inasubiri':
    case 'in_asubiri':
      return 'pending'

    case 'approved':
    case 'imekubaliwa':
    case 'imekubalika':
      return 'approved'

    case 'rejected':
    case 'imekataliwa':
    case 'imekataliwa_ombi':
      return 'rejected'

    default:
      return null
  }
}

// Hii ndiyo njia pekee ya kupata metadata ya status.
// Haitarudisha undefined.
function getStatusMeta(status: unknown): StatusMeta {
  const normalized = normalizeStatus(status)

  if (!normalized) {
    return DEFAULT_STATUS_META
  }

  return HALI_META[normalized] ?? DEFAULT_STATUS_META
}

// ================================================================
// ERROR HELPER
// ================================================================

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string
        message?: string
      }
    }
    message?: string
  }

  return (
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  )
}

// ================================================================
// PAGE
// ================================================================

export default function MmilikiMatumizi() {
  const [requests, setRequests] = useState<ExpenseRequestView[]>([])
  const [stores, setStores] = useState<StoreType[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const [toast, setToast] = useState<{
    msg: string
    ok: boolean
  } | null>(null)

  const [q, setQ] = useState('')
  const [filterHali, setFilterHali] = useState<ExpenseStatus | 'zote'>('zote')

  const [selected, setSelected] = useState<ExpenseRequestView | null>(null)
  const [mode, setMode] = useState<ModalMode>('view')
  const [maoni, setMaoni] = useState('')

  // ==============================================================
  // TOAST
  // ==============================================================

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok })

    window.setTimeout(() => {
      setToast((current) =>
        current?.msg === msg ? null : current
      )
    }, ok ? 3000 : 4000)
  }, [])

  // ==============================================================
  // LOAD DATA
  // ==============================================================

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [reqs, str] = await Promise.all([
        expensesApi.requests(),
        storesApi.list(),
      ])

      setRequests(Array.isArray(reqs) ? reqs as ExpenseRequestView[] : [])
      setStores(Array.isArray(str) ? str : [])
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Imeshindikana kupata maombi. Angalia muunganisho.'
        )
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // ==============================================================
  // FILTER AND SEARCH
  // ==============================================================

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()

    return requests.filter((r) => {
      const status = normalizeStatus(r.status)

      if (filterHali !== 'zote' && status !== filterHali) {
        return false
      }

      if (!query) return true

      return (
        String(r.id ?? '').toLowerCase().includes(query) ||
        String(r.description ?? '').toLowerCase().includes(query) ||
        String(r.reason ?? '').toLowerCase().includes(query) ||
        String(r.category_name ?? '').toLowerCase().includes(query) ||
        String(r.requested_by_name ?? '').toLowerCase().includes(query)
      )
    })
  }, [requests, q, filterHali])

  // ==============================================================
  // STATISTICS
  // ==============================================================

  const stats = useMemo(() => {
    const pendingRequests = requests.filter(
      (r) => normalizeStatus(r.status) === 'pending'
    )

    return {
      zote: requests.length,

      inasubiri: pendingRequests.length,

      imekubaliwa: requests.filter(
        (r) => normalizeStatus(r.status) === 'approved'
      ).length,

      imekataliwa: requests.filter(
        (r) => normalizeStatus(r.status) === 'rejected'
      ).length,

      jumlaInasubiri: pendingRequests.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      ),
    }
  }, [requests])

  // ==============================================================
  // MODAL
  // ==============================================================

  const funguaModal = (
    request: ExpenseRequestView,
    modalMode: ModalMode = 'view'
  ) => {
    setSelected(request)
    setMode(modalMode)
    setMaoni('')
  }

  const fungaModal = () => {
    if (processing) return

    setSelected(null)
    setMode('view')
    setMaoni('')
  }

  // ==============================================================
  // APPROVE REQUEST
  // ==============================================================

  const handleKubali = async () => {
    if (!selected || processing) return

    const id = selected.id

    setProcessing(id)

    try {
      await expensesApi.approve(id, maoni.trim() || undefined)

      showToast('Ombi limekubaliwa kikamilifu.', true)

      setSelected(null)
      setMode('view')
      setMaoni('')

      await load()
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, 'Imeshindikana kukubali ombi.'),
        false
      )
    } finally {
      setProcessing(null)
    }
  }

  // ==============================================================
  // REJECT REQUEST
  // ==============================================================

  const handleKataa = async () => {
    if (!selected || processing) return

    if (!maoni.trim()) {
      showToast('Tafadhali weka sababu ya kukataa ombi.', false)
      setMode('kataa')
      return
    }

    const id = selected.id

    setProcessing(id)

    try {
      await expensesApi.reject(id, maoni.trim())

      showToast('Ombi limekataliwa.', true)

      setSelected(null)
      setMode('view')
      setMaoni('')

      await load()
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, 'Imeshindikana kukataa ombi.'),
        false
      )
    } finally {
      setProcessing(null)
    }
  }

  // ==============================================================
  // STORE NAME
  // ==============================================================

  const getStoreName = (storeId: string | null | undefined) => {
    if (!storeId) return '—'

    const store = stores.find((s) => s.id === storeId)

    return store
      ? store.name.replace('Smart Hardware - ', '')
      : '—'
  }

  // ==============================================================
  // FILTER OPTIONS
  // ==============================================================

  const filterOptions: {
    value: ExpenseStatus | 'zote'
    label: string
  }[] = [
    { value: 'zote', label: 'Zote' },
    { value: 'pending', label: 'Inasubiri' },
    { value: 'approved', label: 'Imekubaliwa' },
    { value: 'rejected', label: 'Imekataliwa' },
  ]

  // ==============================================================
  // RENDER
  // ==============================================================

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet size={26} className="text-brand-600" />
            Maombi ya Matumizi
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Idhinisha au kataa maombi ya wafanyakazi
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw
            size={14}
            className={loading ? 'animate-spin' : ''}
          />
          Sasisha
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))
        ) : (
          <>
            <Stat
              label="Maombi Yote"
              value={String(stats.zote)}
              Icon={Wallet}
              tone="text-blue-600"
            />

            <Stat
              label="Inasubiri"
              value={String(stats.inasubiri)}
              sub={formatTsh(stats.jumlaInasubiri)}
              Icon={Clock}
              tone="text-amber-600"
            />

            <Stat
              label="Imekubaliwa"
              value={String(stats.imekubaliwa)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />

            <Stat
              label="Imekataliwa"
              value={String(stats.imekataliwa)}
              Icon={XCircle}
              tone="text-red-600"
            />
          </>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <div className="flex-1">{error}</div>

          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-semibold underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta kwa ID, maelezo, au mtumiaji..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ListFilter size={14} className="text-slate-400" />

          {filterOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setFilterHali(option.value)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                filterHali === option.value
                  ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <OmbiSkeleton key={i} />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wallet
            size={40}
            className="mx-auto text-slate-300 mb-3"
          />

          <h3 className="font-semibold">
            {q || filterHali !== 'zote'
              ? 'Hakuna matokeo'
              : 'Hakuna maombi'}
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            {q || filterHali !== 'zote'
              ? 'Badilisha kichujio au utafutaji.'
              : 'Maombi yataonekana hapa mara wafanyakazi watakapoomba.'}
          </p>
        </div>
      )}

      {/* REQUESTS LIST */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((request) => {
            const meta = getStatusMeta(request.status)
            const status = normalizeStatus(request.status)
            const isProcessing = processing === request.id
            const requestId = String(request.id ?? '')

            return (
              <div
                key={requestId}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">

                  <button
                    type="button"
                    onClick={() => funguaModal(request)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg ${meta.bg} border border-slate-200 grid place-items-center shrink-0 ${meta.tone}`}
                    >
                      <meta.Icon size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          #{requestId.slice(0, 8).toUpperCase()}
                        </span>

                        <span
                          className={`text-[10px] uppercase font-semibold ${meta.tone}`}
                        >
                          {meta.label}
                        </span>

                        {request.category_name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                            <Tag size={9} />
                            {request.category_name}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 truncate">
                        {request.description || 'Hakuna maelezo'}
                      </div>

                      <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                        <User size={10} />

                        {request.requested_by_name || '—'}

                        <span className="text-slate-300">|</span>

                        <Store size={10} />

                        {getStoreName(request.store)}
                      </div>
                    </div>
                  </button>

                  <div className="sm:text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">
                      {formatTsh(request.amount)}
                    </div>

                    {status === 'pending' && (
                      <div className="flex gap-1 mt-1 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => funguaModal(request, 'kubali')}
                          disabled={isProcessing}
                          className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2
                            size={10}
                            className="inline"
                          />
                          {' '}Kubali
                        </button>

                        <button
                          type="button"
                          onClick={() => funguaModal(request, 'kataa')}
                          disabled={isProcessing}
                          className="px-2 py-1 rounded-md bg-red-600 text-white text-[10px] font-semibold hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle
                            size={10}
                            className="inline"
                          />
                          {' '}Kataa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ============================================================
          IN-PAGE MODAL
      ============================================================ */}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">

          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Funga dirisha"
            disabled={!!processing}
            onClick={fungaModal}
            className="absolute inset-0 bg-black/50 cursor-default"
          />

          <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

            {/* MODAL HEADER */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-900">
                  #{String(selected.id ?? '').slice(0, 8).toUpperCase()}
                </div>

                <div className="text-xs text-slate-500">
                  {selected.request_date
                    ? formatDate(selected.request_date)
                    : 'Tarehe haijaainishwa'}
                </div>
              </div>

              <button
                type="button"
                onClick={fungaModal}
                disabled={!!processing}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="p-4 space-y-4 text-sm">

              {/* STATUS */}
              {(() => {
                const selectedMeta = getStatusMeta(selected.status)
                const StatusIcon = selectedMeta.Icon

                return (
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${selectedMeta.bg} border border-slate-200`}
                  >
                    <StatusIcon
                      size={16}
                      className={selectedMeta.tone}
                    />

                    <span
                      className={`text-xs font-semibold uppercase ${selectedMeta.tone}`}
                    >
                      {selectedMeta.label}
                    </span>
                  </div>
                )
              })()}

              {/* REQUEST INFORMATION */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500">Aina</div>

                  <div className="font-medium capitalize">
                    {selected.category_name || '—'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Kiasi</div>

                  <div className="font-bold text-brand-700">
                    {formatTsh(selected.amount)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">
                  Maelezo
                </div>

                <div className="text-slate-800">
                  {selected.description || 'Hakuna maelezo'}
                </div>
              </div>

              {selected.reason && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    Sababu
                  </div>

                  <div className="text-slate-800">
                    {selected.reason}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500">
                    Aliyeomba
                  </div>

                  <div className="font-medium">
                    {selected.requested_by_name || '—'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Duka
                  </div>

                  <div className="font-medium">
                    {getStoreName(selected.store)}
                  </div>
                </div>
              </div>

              {/* APPROVAL NOTES */}
              {selected.approval_notes && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">
                    Maoni ya Mmiliki
                  </div>

                  <div className="text-sm">
                    {selected.approval_notes}
                  </div>
                </div>
              )}

              {/* APPROVE FORM */}
              {mode === 'kubali' && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="font-semibold text-slate-800">
                    Maoni ya Mmiliki
                    <span className="text-xs text-slate-400 font-normal">
                      {' '}(Hiari)
                    </span>
                  </div>

                  <textarea
                    value={maoni}
                    onChange={(e) => setMaoni(e.target.value)}
                    rows={3}
                    placeholder="Andika maoni yako hapa..."
                    disabled={!!processing}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm resize-none focus:border-brand-500 disabled:bg-slate-50"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('view')}
                      disabled={!!processing}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                    >
                      Rudi
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('confirm-kubali')}
                      disabled={!!processing}
                      className="flex-1 px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                    >
                      Endelea
                    </button>
                  </div>
                </div>
              )}

              {/* REJECT FORM */}
              {mode === 'kataa' && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="font-semibold text-slate-800">
                    Sababu ya Kukataa
                    <span className="text-red-600"> *</span>
                  </div>

                  <textarea
                    value={maoni}
                    onChange={(e) => setMaoni(e.target.value)}
                    rows={3}
                    placeholder="Eleza sababu ya kukataa ombi hili..."
                    disabled={!!processing}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm resize-none focus:border-brand-500 disabled:bg-slate-50"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('view')}
                      disabled={!!processing}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                    >
                      Rudi
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!maoni.trim()) {
                          showToast(
                            'Tafadhali weka sababu ya kukataa.',
                            false
                          )
                          return
                        }

                        setMode('confirm-kataa')
                      }}
                      disabled={!!processing || !maoni.trim()}
                      className="flex-1 px-3 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      Endelea
                    </button>
                  </div>
                </div>
              )}

              {/* APPROVAL CONFIRMATION */}
              {mode === 'confirm-kubali' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <ShieldCheck size={20} />

                    <h3 className="font-bold">
                      Thibitisha Kukubali
                    </h3>
                  </div>

                  <p className="text-sm text-emerald-900">
                    Una uhakika unataka kukubali ombi hili la matumizi?
                  </p>

                  <div className="bg-white/70 rounded-lg p-3 space-y-1">
                    <div className="text-xs text-slate-500">
                      Kiasi cha ombi
                    </div>

                    <div className="font-bold text-lg text-slate-900">
                      {formatTsh(selected.amount)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('kubali')}
                      disabled={!!processing}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                    >
                      <ArrowLeft size={14} className="inline mr-1" />
                      Rudi
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleKubali()}
                      disabled={!!processing}
                      className="flex-1 px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                          Inakubali...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Ndiyo, Kubali
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* REJECTION CONFIRMATION */}
              {mode === 'confirm-kataa' && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle size={20} />

                    <h3 className="font-bold">
                      Thibitisha Kukataa
                    </h3>
                  </div>

                  <p className="text-sm text-red-900">
                    Una uhakika unataka kukataa ombi hili? Hatua hii
                    itabadilisha hali ya ombi.
                  </p>

                  <div className="bg-white/70 rounded-lg p-3 space-y-1">
                    <div className="text-xs text-slate-500">
                      Sababu ya kukataa
                    </div>

                    <div className="text-sm text-slate-800">
                      {maoni}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('kataa')}
                      disabled={!!processing}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                    >
                      <ArrowLeft size={14} className="inline mr-1" />
                      Rudi
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleKataa()}
                      disabled={!!processing}
                      className="flex-1 px-3 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                          Inakataa...
                        </>
                      ) : (
                        <>
                          <XCircle size={14} />
                          Ndiyo, Kataa
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW MODE ACTIONS */}
              {mode === 'view' &&
                normalizeStatus(selected.status) === 'pending' && (
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setMaoni('')
                        setMode('kubali')
                      }}
                      disabled={!!processing}
                      className="px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2
                        size={14}
                        className="inline mr-1"
                      />
                      Kubali
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMaoni('')
                        setMode('kataa')
                      }}
                      disabled={!!processing}
                      className="px-3 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle
                        size={14}
                        className="inline mr-1"
                      />
                      Kataa
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          role="status"
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

// ================================================================
// STAT COMPONENT
// ================================================================

function Stat({
  label,
  value,
  sub,
  Icon,
  tone,
}: {
  label: string
  value: string
  sub?: string
  Icon: ElementType
  tone: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div
        className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center ${tone}`}
      >
        <Icon size={18} />
      </div>

      <div className="text-xs text-slate-500 mt-3">
        {label}
      </div>

      <div className="text-base md:text-lg font-bold text-slate-900 mt-0.5">
        {value}
      </div>

      {sub && (
        <div className="text-xs text-slate-500 mt-0.5 truncate">
          {sub}
        </div>
      )}
    </div>
  )
}

// ================================================================
// STATISTICS SKELETON
// ==============================================================

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />

      <SkeletonLine className="h-3 w-20 mt-3" />

      <SkeletonLine className="h-5 w-12 mt-2" />
    </div>
  )
}

// ================================================================
// REQUEST SKELETON
// ==============================================================

function OmbiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />

          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-48" />
            <SkeletonLine className="h-3 w-32" />
          </div>
        </div>

        <div className="sm:text-right space-y-1.5">
          <SkeletonLine className="h-5 w-24 ml-auto" />
          <SkeletonLine className="h-3 w-16 ml-auto" />
        </div>
      </div>
    </div>
  )
}
