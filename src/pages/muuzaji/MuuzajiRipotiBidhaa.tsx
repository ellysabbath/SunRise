import { useEffect, useMemo, useState } from 'react'
import {
  Package, Plus, X, Save, AlertTriangle, Calendar,
  RotateCcw, PackageX, RefreshCw, Search, ListFilter,
  CheckCircle2, Clock, XCircle, Loader2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { productsApi, type Product } from '../../services/products'
import {
  reportsApi,
  type ProductReport,
  type ReportType,
} from '../../services/reports'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
const AINA_META: Record<
  ReportType,
  { label: string; tone: string; Icon: React.ElementType }
> = {
  uharibifu: { label: 'Uharibifu', tone: 'text-red-700', Icon: AlertTriangle },
  expiry: { label: 'Expiry', tone: 'text-amber-700', Icon: Calendar },
  upotevu: { label: 'Upotevu', tone: 'text-orange-700', Icon: PackageX },
  kurudisha_msambazaji: {
    label: 'Kurudisha',
    tone: 'text-purple-700',
    Icon: RotateCcw,
  },
}

const HALI_META: Record<
  ProductReport['status'],
  { label: string; tone: string; Icon: React.ElementType }
> = {
  inasubiri: { label: 'Inasubiri', tone: 'text-amber-600', Icon: Clock },
  imethibitishwa: {
    label: 'Imethibitishwa',
    tone: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  imekataliwa: { label: 'Imekataliwa', tone: 'text-red-600', Icon: XCircle },
}

// ==================================================================
// Page
// ==================================================================
export default function MuuzajiRipotiBidhaa() {
  const { user } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [reports, setReports] = useState<ProductReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ReportType | 'zote'>('zote')

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const storeId = user?.store_id || undefined
      const [prods, reps] = await Promise.all([
        productsApi.list(storeId),
        reportsApi.list({ store: storeId }),
      ])
      setProducts(prods)
      setReports(reps)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.store_id])

  // ------------------------------------------------------------------
  // Filter
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filter !== 'zote' && r.report_type !== filter) return false
      const query = q.toLowerCase().trim()
      if (!query) return true
      return (
        r.id.toLowerCase().includes(query) ||
        (r.product_name || '').toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
      )
    })
  }, [reports, q, filter])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const zote = reports.length
    const uharibifu = reports.filter(
      (r) => r.report_type === 'uharibifu'
    ).length
    const expiry = reports.filter((r) => r.report_type === 'expiry').length
    const hasara = reports
      .filter((r) =>
        ['uharibifu', 'expiry', 'upotevu'].includes(r.report_type)
      )
      .reduce((s, r) => s + parseFloat(r.estimated_value || '0'), 0)
    return { zote, uharibifu, expiry, hasara }
  }, [reports])

  // ------------------------------------------------------------------
  // Tuma ripoti mpya
  // ------------------------------------------------------------------
  const tumaRipoti = async (payload: {
    product_id: string
    report_type: ReportType
    quantity: number
    description: string
    estimated_value: number
  }) => {
    if (!user?.store_id) {
      setToast({ msg: 'Hujapangiwa duka.', ok: false })
      setTimeout(() => setToast(null), 3000)
      throw new Error('Hujapangiwa duka.')
    }

    try {
      const rep = await reportsApi.create({
        product: payload.product_id,
        store: user.store_id,
        report_type: payload.report_type,
        quantity: payload.quantity,
        estimated_value: payload.estimated_value,
        description: payload.description,
      })
      setReports((prev) => [rep, ...prev])
      setOpen(false)
      setToast({
        msg: `Ripoti #${rep.id.slice(0, 8)} imetumwa.`,
        ok: true,
      })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || 'Imeshindikana kutuma ripoti.'
      setToast({ msg: detail, ok: false })
      setTimeout(() => setToast(null), 4000)
      throw err
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package size={26} className="text-brand-600" /> Ripoti za Bidhaa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ripoti uharibifu, expiry au upotevu
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
            <Plus size={16} /> Ripoti Mpya
          </button>
        </div>
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
              label="Uharibifu"
              value={String(stats.uharibifu)}
              Icon={AlertTriangle}
              tone="text-red-600"
            />
            <Stat
              label="Expiry"
              value={String(stats.expiry)}
              Icon={Calendar}
              tone="text-amber-600"
            />
            <Stat
              label="Jumla ya Hasara"
              value={formatTsh(stats.hasara)}
              Icon={PackageX}
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
            placeholder="Tafuta kwa ID, bidhaa, au maelezo..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ListFilter size={14} className="text-slate-400" />
          <button
            onClick={() => setFilter('zote')}
            className={`px-3 py-1.5 rounded-lg text-xs border transition ${
              filter === 'zote'
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
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                  filter === k
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
          <button
            onClick={load}
            className="text-xs font-semibold underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* Loading — skeleton list */}
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
            {q || filter !== 'zote'
              ? 'Hakuna matokeo'
              : 'Hakuna ripoti bado'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q || filter !== 'zote'
              ? 'Badilisha kichujio au utafutaji.'
              : 'Bofya "Ripoti Mpya" kuanza.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((r) => {
            const meta = AINA_META[r.report_type]
            const hali = HALI_META[r.status]
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${meta.tone}`}
                    >
                      <meta.Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          #{r.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold ${hali.tone}`}
                        >
                          {hali.label}
                        </span>
                      </div>
                      <div className="text-sm truncate">
                        {r.product_name || r.product}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(r.report_date)}
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
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {open && (
        <Fomu
          onClose={() => setOpen(false)}
          onSubmit={tumaRipoti}
          products={products}
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
      <SkeletonLine className="h-5 w-24 mt-2" />
    </div>
  )
}

function RipotiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />
          <div className="min-w-0 space-y-1.5 flex-1">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-48" />
            <SkeletonLine className="h-3 w-24" />
          </div>
        </div>
        <div className="sm:text-right space-y-1.5">
          <SkeletonLine className="h-5 w-20 ml-auto" />
          <SkeletonLine className="h-3 w-16 ml-auto" />
        </div>
      </div>
    </div>
  )
}

// ==================================================================
// Fomu ya ripoti
// ==================================================================
function Fomu({
  onClose,
  onSubmit,
  products,
}: {
  onClose: () => void
  onSubmit: (payload: {
    product_id: string
    report_type: ReportType
    quantity: number
    description: string
    estimated_value: number
  }) => Promise<void>
  products: Product[]
}) {
  const [bidhaaId, setBidhaaId] = useState('')
  const [aina, setAina] = useState<ReportType>('uharibifu')
  const [wingi, setWingi] = useState(0)
  const [sababu, setSababu] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const b = products.find((x) => x.id === bidhaaId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!b) return setError('Chagua bidhaa')
    if (wingi <= 0) return setError('Wingi lazima uwe zaidi ya 0')
    if (!sababu.trim()) return setError('Sababu inahitajika')

    setLoading(true)
    try {
      // Thamani = wingi × bei ya ununuzi
      const estimatedValue = wingi * parseFloat(b.cost_price || '0')
      await onSubmit({
        product_id: b.id,
        report_type: aina,
        quantity: wingi,
        description: sababu.trim(),
        estimated_value: estimatedValue,
      })
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Imeshindikana kutuma ripoti.'
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
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">Ripoti Bidhaa</div>
            <div className="text-xs text-slate-500">
              Chagua bidhaa, aina, na sababu
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
          {/* Bidhaa */}
          <div>
            <label className="text-sm font-medium">Bidhaa</label>
            <select
              value={bidhaaId}
              onChange={(e) => setBidhaaId(e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            >
              <option value="">-- Chagua bidhaa --</option>
              {products.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Aina */}
          <div>
            <label className="text-sm font-medium">Aina ya Ripoti</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(Object.keys(AINA_META) as ReportType[]).map((k) => {
                const m = AINA_META[k]
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAina(k)}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-1.5 font-medium transition ${
                      aina === k
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <m.Icon size={12} /> {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Wingi */}
          <div>
            <label className="text-sm font-medium">Wingi</label>
            <input
              type="number"
              value={wingi || ''}
              onChange={(e) => setWingi(Number(e.target.value))}
              placeholder="0"
              min={1}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
            {b && wingi > 0 && (
              <div className="text-xs text-slate-500 mt-1">
                Thamani: {formatTsh(wingi * parseFloat(b.cost_price || '0'))}
              </div>
            )}
          </div>

          {/* Sababu */}
          <div>
            <label className="text-sm font-medium">Sababu</label>
            <input
              value={sababu}
              onChange={(e) => setSababu(e.target.value)}
              placeholder="Mfano: Zimevunjika wakati wa kuhifadhi"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
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
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Inatuma...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Tuma
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}