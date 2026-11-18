
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Package,
  Plus,
  X,
  Save,
  AlertTriangle,
  Calendar,
  RotateCcw,
  PackageX,
  RefreshCw,
  Search,
  ListFilter,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { productsApi, type Product } from '../../services/products'
import { reportsApi } from '../../services/reports'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// TYPES
// ==================================================================

type ReportType =
  | 'uharibifu'
  | 'expiry'
  | 'upotevu'
  | 'kurudisha_msambazaji'

type ReportStatus =
  | 'inasubiri'
  | 'imethibitishwa'
  | 'imekataliwa'

interface ProductReport {
  id: string
  product: string
  product_name?: string
  report_type: ReportType
  status: ReportStatus
  quantity: number
  estimated_value: string | number
  description: string
  report_date: string
}

// ==================================================================
// META
// ==================================================================

const AINA_META: Record<
  ReportType,
  { label: string; tone: string; Icon: React.ElementType }
> = {
  uharibifu: {
    label: 'Uharibifu',
    tone: 'text-red-700',
    Icon: AlertTriangle,
  },
  expiry: {
    label: 'Expiry',
    tone: 'text-amber-700',
    Icon: Calendar,
  },
  upotevu: {
    label: 'Upotevu',
    tone: 'text-orange-700',
    Icon: PackageX,
  },
  kurudisha_msambazaji: {
    label: 'Kurudisha',
    tone: 'text-purple-700',
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
// HELPERS
// ==================================================================

function getErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err
  ) {
    const response = (
      err as {
        response?: {
          data?: {
            detail?: string
          }
        }
      }
    ).response

    if (response?.data?.detail) {
      return response.data.detail
    }
  }

  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
}

// ==================================================================
// PAGE
// ==================================================================

export default function MuuzajiRipotiBidhaa() {
  const { user } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [reports, setReports] = useState<ProductReport[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [open, setOpen] = useState(false)

  const [toast, setToast] = useState<{
    msg: string
    ok: boolean
  } | null>(null)

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ReportType | 'zote'>('zote')

  const storeId = user?.store_id

  // ----------------------------------------------------------------
  // TOAST
  // ----------------------------------------------------------------

  const showToast = useCallback(
    (msg: string, ok: boolean, duration = 3000) => {
      setToast({ msg, ok })

      window.setTimeout(() => {
        setToast(null)
      }, duration)
    },
    []
  )

  // ----------------------------------------------------------------
  // LOAD DATA
  // ----------------------------------------------------------------

  const load = useCallback(async () => {
    if (!storeId) {
      setProducts([])
      setReports([])
      setLoading(false)
      setError('Hujapangiwa duka. Tafadhali wasiliana na msimamizi.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const [prods, reps] = await Promise.all([
        productsApi.list(storeId),
        reportsApi.list(),
      ])

      setProducts(prods)
      setReports(reps)
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Imeshindikana kupata ripoti. Angalia muunganisho.'
        )
      )
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    void load()
  }, [load])

  // ----------------------------------------------------------------
  // FILTER
  // ----------------------------------------------------------------

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filter !== 'zote' && r.report_type !== filter) {
        return false
      }

      const query = q.toLowerCase().trim()

      if (!query) {
        return true
      }

      return (
        r.id.toLowerCase().includes(query) ||
        (r.product_name || '').toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
      )
    })
  }, [reports, q, filter])

  // ----------------------------------------------------------------
  // STATS
  // ----------------------------------------------------------------

  const stats = useMemo(() => {
    const zote = reports.length

    const uharibifu = reports.filter(
      (r) => r.report_type === 'uharibifu'
    ).length

    const expiry = reports.filter(
      (r) => r.report_type === 'expiry'
    ).length

    const hasara = reports
      .filter((r) =>
        ['uharibifu', 'expiry', 'upotevu'].includes(r.report_type)
      )
      .reduce(
        (sum, r) => sum + Number(r.estimated_value || 0),
        0
      )

    return {
      zote,
      uharibifu,
      expiry,
      hasara,
    }
  }, [reports])

  // ----------------------------------------------------------------
  // SUBMIT REPORT
  // ----------------------------------------------------------------

  const tumaRipoti = async (payload: {
    product_id: string
    report_type: ReportType
    quantity: number
    description: string
    estimated_value: number
  }) => {
    if (!storeId) {
      showToast('Hujapangiwa duka.', false)
      throw new Error('Hujapangiwa duka.')
    }

    try {
      const rep = await reportsApi.create({
        product: payload.product_id,
        store: storeId,
        report_type: payload.report_type,
        quantity: payload.quantity,
        estimated_value: payload.estimated_value,
        description: payload.description,
      })

      setReports((prev) => [rep as ProductReport, ...prev])
      setOpen(false)

      showToast(
        `Ripoti #${String(rep.id).slice(0, 8)} imetumwa.`,
        true
      )
    } catch (err: unknown) {
      const detail = getErrorMessage(
        err,
        'Imeshindikana kutuma ripoti.'
      )

      showToast(detail, false, 4000)
      throw err
    }
  }

  // ----------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package size={26} className="text-brand-600" />
            Ripoti za Bidhaa
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Ripoti uharibifu, expiry au upotevu
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void load()}
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
            type="button"
            onClick={() => setOpen(true)}
            disabled={loading || !storeId}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} />
            Ripoti Mpya
          </button>
        </div>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))
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

      {/* FILTERS + SEARCH */}

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
            type="button"
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
                type="button"
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

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <div className="flex-1">
            {error}
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-semibold underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* LOADING */}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <RipotiSkeleton key={i} />
          ))}
        </div>
      )}

      {/* EMPTY */}

      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package
            size={40}
            className="mx-auto text-slate-300 mb-3"
          />

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

      {/* REPORT LIST */}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((r) => {
            const meta = AINA_META[r.report_type]
            const hali = HALI_META[r.status]

            if (!meta || !hali) {
              return null
            }

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
                      {formatTsh(Number(r.estimated_value || 0))}
                    </div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FORM MODAL */}

      {open && (
        <Fomu
          onClose={() => setOpen(false)}
          onSubmit={tumaRipoti}
          products={products}
        />
      )}

      {/* TOAST */}

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
// STAT
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

      <div className="text-xs text-slate-500 mt-3">
        {label}
      </div>

      <div className="text-base md:text-lg font-bold text-slate-900 mt-0.5 truncate">
        {value}
      </div>
    </div>
  )
}

// ==================================================================
// STAT SKELETON
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

// ==================================================================
// REPORT SKELETON
// ==================================================================

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
// REPORT FORM
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

  // ----------------------------------------------------------------
  // SUBMIT
  // ----------------------------------------------------------------

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!b) {
      setError('Chagua bidhaa')
      return
    }

    if (wingi <= 0) {
      setError('Wingi lazima uwe zaidi ya 0')
      return
    }

    if (!Number.isFinite(wingi)) {
      setError('Weka wingi sahihi')
      return
    }

    if (!sababu.trim()) {
      setError('Sababu inahitajika')
      return
    }

    setLoading(true)

    try {
      // Thamani = wingi × bei ya ununuzi
      const estimatedValue =
        wingi * Number(b.cost_price || 0)

      await onSubmit({
        product_id: b.id,
        report_type: aina,
        quantity: wingi,
        description: sababu.trim(),
        estimated_value: estimatedValue,
      })
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Imeshindikana kutuma ripoti.'
        )
      )

      setLoading(false)
    }
  }

  // ----------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">

      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !loading && onClose()}
      />

      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* MODAL HEADER */}

        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">
              Ripoti Bidhaa
            </div>

            <div className="text-xs text-slate-500">
              Chagua bidhaa, aina, na sababu
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM */}

        <form onSubmit={submit} className="p-4 space-y-3">

          {/* PRODUCT */}

          <div>
            <label className="text-sm font-medium">
              Bidhaa
            </label>

            <select
              value={bidhaaId}
              onChange={(e) => setBidhaaId(e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            >
              <option value="">
                -- Chagua bidhaa --
              </option>

              {products.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.sku})
                </option>
              ))}
            </select>
          </div>

          {/* REPORT TYPE */}

          <div>
            <label className="text-sm font-medium">
              Aina ya Ripoti
            </label>

            <div className="grid grid-cols-2 gap-2 mt-1">
              {(Object.keys(AINA_META) as ReportType[]).map((k) => {
                const m = AINA_META[k]

                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setAina(k)}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-1.5 font-medium transition ${
                      aina === k
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <m.Icon size={12} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* QUANTITY */}

          <div>
            <label className="text-sm font-medium">
              Wingi
            </label>

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
                Thamani:{' '}
                {formatTsh(
                  wingi * Number(b.cost_price || 0)
                )}
              </div>
            )}
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="text-sm font-medium">
              Sababu
            </label>

            <input
              value={sababu}
              onChange={(e) => setSababu(e.target.value)}
              placeholder="Mfano: Zimevunjika wakati wa kuhifadhi"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          {/* ERROR */}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {/* BUTTONS */}

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
