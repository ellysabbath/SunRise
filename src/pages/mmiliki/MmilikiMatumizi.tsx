import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, CheckCircle2, XCircle, Clock, X, Search, ListFilter,
  RefreshCw, AlertTriangle, Loader2, Receipt, Tag, Store, User,
} from 'lucide-react'
import {
  expensesApi,
  type ExpenseRequest,
  type ExpenseStatus,
} from '../../services/expenses'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
const HALI_META: Record<
  ExpenseStatus,
  { label: string; tone: string; bg: string; Icon: React.ElementType }
> = {
  inasubiri: {
    label: 'Inasubiri',
    tone: 'text-amber-600',
    bg: 'bg-amber-50',
    Icon: Clock,
  },
  imekubaliwa: {
    label: 'Imekubaliwa',
    tone: 'text-emerald-600',
    bg: 'bg-emerald-50',
    Icon: CheckCircle2,
  },
  imekataliwa: {
    label: 'Imekataliwa',
    tone: 'text-red-600',
    bg: 'bg-red-50',
    Icon: XCircle,
  },
}

// ==================================================================
// Page
// ==================================================================
export default function MmilikiMatumizi() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [q, setQ] = useState('')
  const [filterHali, setFilterHali] = useState<ExpenseStatus | 'zote'>('zote')

  // Modal state
  const [selected, setSelected] = useState<ExpenseRequest | null>(null)
  const [mode, setMode] = useState<'view' | 'kubali' | 'kataa'>('view')
  const [maoni, setMaoni] = useState('')

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [reqs, str] = await Promise.all([
        expensesApi.requests(),
        storesApi.list(),
      ])
      setRequests(reqs)
      setStores(str)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata maombi. Angalia muunganisho.'
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
    return requests.filter((r) => {
      if (filterHali !== 'zote' && r.status !== filterHali) return false
      const query = q.toLowerCase().trim()
      if (!query) return true
      return (
        r.id.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.reason.toLowerCase().includes(query) ||
        (r.requested_by_name || '').toLowerCase().includes(query)
      )
    })
  }, [requests, q, filterHali])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    return {
      zote: requests.length,
      inasubiri: requests.filter((r) => r.status === 'inasubiri').length,
      imekubaliwa: requests.filter((r) => r.status === 'imekubaliwa').length,
      imekataliwa: requests.filter((r) => r.status === 'imekataliwa').length,
      jumlaInasubiri: requests
        .filter((r) => r.status === 'inasubiri')
        .reduce((s, r) => s + parseFloat(r.amount || '0'), 0),
    }
  }, [requests])

  // ------------------------------------------------------------------
  // Kubali
  // ------------------------------------------------------------------
  const handleKubali = async (id: string) => {
    setProcessing(id)
    try {
      await expensesApi.approve(id, maoni || undefined)
      setToast({ msg: 'Ombi limekubaliwa.', ok: true })
      setTimeout(() => setToast(null), 3000)
      await load()
      setSelected(null)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kukubali.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Kataa
  // ------------------------------------------------------------------
  const handleKataa = async (id: string) => {
    if (!maoni.trim()) {
      setToast({ msg: 'Sababu ya kukataa inahitajika.', ok: false })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setProcessing(id)
    try {
      await expensesApi.reject(id, maoni)
      setToast({ msg: 'Ombi limekataliwa.', ok: false })
      setTimeout(() => setToast(null), 3000)
      await load()
      setSelected(null)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kukataa.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Helper — pata jina la duka
  // ------------------------------------------------------------------
  const getStoreName = (storeId: string) => {
    const s = stores.find((x) => x.id === storeId)
    return s ? s.name.replace('Smart Hardware - ', '') : '—'
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
            <Wallet size={26} className="text-brand-600" /> Maombi ya Matumizi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Idhinisha au kataa maombi ya wafanyakazi
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Sasisha
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
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
            placeholder="Tafuta kwa ID, maelezo, au mtumiaji..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ListFilter size={14} className="text-slate-400" />
          {(['zote', 'inasubiri', 'imekubaliwa', 'imekataliwa'] as const).map(
            (k) => (
              <button
                key={k}
                onClick={() => setFilterHali(k)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                  filterHali === k
                    ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {k === 'zote' ? 'Zote' : HALI_META[k].label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Loading — skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <OmbiSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {q || filterHali !== 'zote' ? 'Hakuna matokeo' : 'Hakuna maombi'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q || filterHali !== 'zote'
              ? 'Badilisha kichujio au utafutaji.'
              : 'Maombi yataonekana hapa mara wafanyakazi watakapoomba.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((m) => {
            const meta = HALI_META[m.status]
            const isProcessing = processing === m.id

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <button
                    onClick={() => {
                      setSelected(m)
                      setMode('view')
                      setMaoni('')
                    }}
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
                          #{m.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                        {m.category_name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                            <Tag size={9} />
                            {m.category_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {m.description}
                      </div>
                      <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                        <User size={10} />
                        {m.requested_by_name || '—'}
                        <span className="text-slate-300">|</span>
                        <Store size={10} />
                        {getStoreName(m.store)}
                      </div>
                    </div>
                  </button>
                  <div className="sm:text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">
                      {formatTsh(m.amount)}
                    </div>
                    {m.status === 'inasubiri' && (
                      <div className="flex gap-1 mt-1 sm:justify-end">
                        <button
                          onClick={() => {
                            setSelected(m)
                            setMode('kubali')
                            setMaoni('')
                          }}
                          disabled={isProcessing}
                          className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={10} className="inline" /> Kubali
                        </button>
                        <button
                          onClick={() => {
                            setSelected(m)
                            setMode('kataa')
                            setMaoni('')
                          }}
                          disabled={isProcessing}
                          className="px-2 py-1 rounded-md bg-red-600 text-white text-[10px] font-semibold hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle size={10} className="inline" /> Kataa
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

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !processing && setSelected(null)}
          />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-semibold">
                  #{selected.id.slice(0, 8).toUpperCase()}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(selected.request_date)}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                disabled={!!processing}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm">
              {/* Status */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${HALI_META[selected.status].bg} border border-slate-200`}
              >
                {(() => {
                  const M = HALI_META[selected.status]
                  return (
                    <>
                      <M.Icon size={16} className={M.tone} />
                      <span
                        className={`text-xs font-semibold uppercase ${M.tone}`}
                      >
                        {M.label}
                      </span>
                    </>
                  )
                })()}
              </div>

              {/* Grid */}
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
                <div className="text-xs text-slate-500">Maelezo</div>
                <div>{selected.description}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Sababu</div>
                <div>{selected.reason}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500">Aliyeomba</div>
                  <div className="font-medium">
                    {selected.requested_by_name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Duka</div>
                  <div className="font-medium">
                    {getStoreName(selected.store)}
                  </div>
                </div>
              </div>

              {/* Mode: kubali */}
              {mode === 'kubali' && (
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <textarea
                    value={maoni}
                    onChange={(e) => setMaoni(e.target.value)}
                    rows={2}
                    placeholder="Maoni (hiari)"
                    disabled={!!processing}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm resize-none disabled:bg-slate-50"
                  />
                  <button
                    onClick={() => handleKubali(selected.id)}
                    disabled={!!processing}
                    className="w-full px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Inakubali...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Thibitisha Kukubali
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Mode: kataa */}
              {mode === 'kataa' && (
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <textarea
                    value={maoni}
                    onChange={(e) => setMaoni(e.target.value)}
                    rows={2}
                    placeholder="Sababu ya kukataa (lazima)"
                    disabled={!!processing}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm resize-none disabled:bg-slate-50"
                  />
                  <button
                    onClick={() => handleKataa(selected.id)}
                    disabled={!!processing}
                    className="w-full px-3 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Inakataa...
                      </>
                    ) : (
                      <>
                        <XCircle size={14} />
                        Thibitisha Kukataa
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Mode: view */}
              {mode === 'view' && selected.status === 'inasubiri' && (
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setMode('kubali')}
                    className="px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    Kubali
                  </button>
                  <button
                    onClick={() => setMode('kataa')}
                    className="px-3 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                  >
                    Kataa
                  </button>
                </div>
              )}

              {/* Maoni ya mmiliki */}
              {selected.approval_notes && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">
                    Maoni ya Mmiliki
                  </div>
                  <div className="text-sm">{selected.approval_notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
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
  sub,
  Icon,
  tone,
}: {
  label: string
  value: string
  sub?: string
  Icon: React.ElementType
  tone: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div
        className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center ${tone}`}
      >
        <Icon size={18} />
      </div>
      <div className="text-xs text-slate-500 mt-3">{label}</div>
      <div className="text-base md:text-lg font-bold text-slate-900 mt-0.5">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-slate-500 mt-0.5 truncate">{sub}</div>
      )}
    </div>
  )
}

// ==================================================================
// Skeleton
// ==================================================================
function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
      <SkeletonLine className="h-3 w-20 mt-3" />
      <SkeletonLine className="h-5 w-12 mt-2" />
    </div>
  )
}

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