import { useEffect, useMemo, useState } from 'react'
import {
  Package, CheckCircle2, AlertTriangle, Calendar, PackageX,
  RotateCcw, RefreshCw, Search, ListFilter, Loader2,
  XCircle, X, Clock, Store,
} from 'lucide-react'
import {
  reportsApi,
  type ProductReport,
  type ReportType,
  type ReportStatus,
} from '../../services/reports'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
const AINA_META: Record<
  ReportType,
  { label: string; tone: string; bg: string; Icon: React.ElementType }
> = {
  uharibifu: {
    label: 'Uharibifu',
    tone: 'text-red-700',
    bg: 'bg-red-50',
    Icon: AlertTriangle,
  },
  expiry: {
    label: 'Expiry',
    tone: 'text-amber-700',
    bg: 'bg-amber-50',
    Icon: Calendar,
  },
  upotevu: {
    label: 'Upotevu',
    tone: 'text-orange-700',
    bg: 'bg-orange-50',
    Icon: PackageX,
  },
  kurudisha_msambazaji: {
    label: 'Kurudisha',
    tone: 'text-purple-700',
    bg: 'bg-purple-50',
    Icon: RotateCcw,
  },
}

const HALI_META: Record<
  ReportStatus,
  { label: string; tone: string; Icon: React.ElementType }
> = {
  inasubiri: {
    label: 'Inasubiri',
    tone: 'text-amber-600',
    Icon: Clock,
  },
  imethibitishwa: {
    label: 'Imethibitishwa',
    tone: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  imekataliwa: {
    label: 'Imekataliwa',
    tone: 'text-red-600',
    Icon: XCircle,
  },
}

// ==================================================================
// Page
// ==================================================================
export default function MmilikiRipotiBidhaa() {
  const [reports, setReports] = useState<ProductReport[]>([])
  const [stores, setStores] = useState<StoreType[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [q, setQ] = useState('')
  const [filterAina, setFilterAina] = useState<ReportType | 'zote'>('zote')
  const [filterHali, setFilterHali] = useState<ReportStatus | 'zote'>('zote')

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [reps, str] = await Promise.all([
        reportsApi.list(),
        storesApi.list(),
      ])
      setReports(reps)
      setStores(str)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata ripoti. Angalia muunganisho.'
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
    return reports.filter((r) => {
      if (filterAina !== 'zote' && r.report_type !== filterAina) return false
      if (filterHali !== 'zote' && r.status !== filterHali) return false

      const query = q.toLowerCase().trim()
      if (!query) return true
      return (
        r.id.toLowerCase().includes(query) ||
        (r.product_name || '').toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
      )
    })
  }, [reports, q, filterAina, filterHali])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    return {
      zote: reports.length,
      inasubiri: reports.filter((r) => r.status === 'inasubiri').length,
      imethibitishwa: reports.filter((r) => r.status === 'imethibitishwa')
        .length,
      imekataliwa: reports.filter((r) => r.status === 'imekataliwa').length,
      jumlaHasara: reports
        .filter((r) =>
          ['uharibifu', 'expiry', 'upotevu'].includes(r.report_type)
        )
        .reduce((s, r) => s + parseFloat(r.estimated_value || '0'), 0),
    }
  }, [reports])

  // ------------------------------------------------------------------
  // Thibitisha
  // ------------------------------------------------------------------
  const handleThibitisha = async (id: string) => {
    setProcessing(id)
    try {
      await reportsApi.approve(id)
      setReports((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'imethibitishwa' as ReportStatus } : r
        )
      )
      setToast({ msg: 'Ripoti imethibitishwa.', ok: true })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kuthibitisha.',
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
    if (!confirm('Una uhakika unataka kukataa ripoti hii?')) return
    setProcessing(id)
    try {
      await reportsApi.reject(id)
      setReports((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'imekataliwa' as ReportStatus } : r
        )
      )
      setToast({ msg: 'Ripoti imekataliwa.', ok: false })
      setTimeout(() => setToast(null), 3000)
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

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package size={26} className="text-brand-600" /> Ripoti za Bidhaa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Thibitisha au kataa ripoti za uharibifu, expiry, na upotevu
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
              label="Ripoti Zote"
              value={String(stats.zote)}
              Icon={Package}
              tone="text-blue-600"
            />
            <Stat
              label="Zinasubiri"
              value={String(stats.inasubiri)}
              Icon={Clock}
              tone="text-amber-600"
            />
            <Stat
              label="Zimethibitishwa"
              value={String(stats.imethibitishwa)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />
            <Stat
              label="Jumla ya Hasara"
              value={formatTsh(stats.jumlaHasara)}
              Icon={AlertTriangle}
              tone="text-red-600"
            />
          </>
        )}
      </div>

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
            placeholder="Tafuta kwa bidhaa au maelezo..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ListFilter size={14} className="text-slate-400" />

          {/* Hali */}
          {(['zote', 'inasubiri', 'imethibitishwa', 'imekataliwa'] as const).map(
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
                {k === 'zote' ? 'Hali Zote' : HALI_META[k].label}
              </button>
            )
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400">Aina:</span>
          <button
            onClick={() => setFilterAina('zote')}
            className={`px-3 py-1.5 rounded-lg text-xs border transition ${
              filterAina === 'zote'
                ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            Zote
          </button>
          {(Object.keys(AINA_META) as ReportType[]).map((k) => {
            const m = AINA_META[k]
            return (
              <button
                key={k}
                onClick={() => setFilterAina(k)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                  filterAina === k
                    ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <m.Icon size={12} className="inline mr-1" />
                {m.label}
              </button>
            )
          })}
        </div>
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

      {/* Loading — skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <RipotiSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {q || filterAina !== 'zote' || filterHali !== 'zote'
              ? 'Hakuna matokeo'
              : 'Hakuna ripoti bado'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q || filterAina !== 'zote' || filterHali !== 'zote'
              ? 'Badilisha vichujio au utafutaji.'
              : 'Ripoti zitaonekana hapa mara muuzaji atakapotuma.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((r) => {
            const ainaMeta = AINA_META[r.report_type]
            const haliMeta = HALI_META[r.status]
            const store = stores.find((s) => s.id === r.store)
            const isProcessing = processing === r.id

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg ${ainaMeta.bg} border border-slate-200 grid place-items-center shrink-0 ${ainaMeta.tone}`}
                    >
                      <ainaMeta.Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          #{r.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold ${ainaMeta.tone}`}
                        >
                          {ainaMeta.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] uppercase font-semibold ${haliMeta.tone}`}
                        >
                          <haliMeta.Icon size={9} />
                          {haliMeta.label}
                        </span>
                        {store && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            <Store size={9} />
                            {store.name.replace('Smart Hardware - ', '')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm truncate mt-0.5">
                        {r.product_name || r.product}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(r.report_date)} — {r.reported_by_name}
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">
                      {r.quantity} pcs
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatTsh(r.estimated_value)}
                    </div>
                  </div>
                </div>

                {r.description && (
                  <div className="mt-3 p-2 rounded-lg bg-slate-50 text-xs">
                    <span className="text-slate-500">Maelezo: </span>
                    {r.description}
                  </div>
                )}

                {r.status === 'inasubiri' && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => handleThibitisha(r.id)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      Thibitisha
                    </button>
                    <button
                      onClick={() => handleKataa(r.id)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                    >
                      <XCircle size={12} />
                      Kataa
                    </button>
                  </div>
                )}
              </div>
            )
          })}
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
        className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center ${tone}`}
      >
        <Icon size={18} />
      </div>
      <div className="text-xs text-slate-500 mt-3">{label}</div>
      <div className="text-base md:text-lg font-bold text-slate-900 mt-0.5 truncate">
        {value}
      </div>
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
      <SkeletonLine className="h-5 w-16 mt-2" />
    </div>
  )
}

function RipotiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-48" />
            <SkeletonLine className="h-3 w-24" />
          </div>
        </div>
        <div className="sm:text-right space-y-1.5">
          <SkeletonLine className="h-5 w-16 ml-auto" />
          <SkeletonLine className="h-3 w-20 ml-auto" />
        </div>
      </div>
    </div>
  )
}