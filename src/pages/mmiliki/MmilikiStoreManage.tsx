
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import {
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Search,
  ListFilter,
  Store,
} from 'lucide-react'

import {
  inventoryApi,
  type StockAdjustment,
  type AdjustmentStatus,
} from '../../services/inventory'
import {
  storesApi,
  type Store as StoreType,
} from '../../services/stores'
import { formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta ya hali za marekebisho
// ==================================================================

const HALI_META: Record<
  AdjustmentStatus,
  {
    label: string
    tone: string
    bg: string
    Icon: ElementType
  }
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

export default function MmilikiStoreManage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [stores, setStores] = useState<StoreType[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const [toast, setToast] = useState<{
    msg: string
    ok: boolean
  } | null>(null)

  const [q, setQ] = useState('')

  const [filterHali, setFilterHali] = useState<
    AdjustmentStatus | 'zote'
  >('zote')

  const [filterStore, setFilterStore] = useState<string>('zote')

  // ------------------------------------------------------------------
  // Load data
  // ------------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [adjs, str] = await Promise.all([
        inventoryApi.stockAdjustments(),
        storesApi.list(),
      ])

      setAdjustments(adjs)
      setStores(str)
    } catch (err: unknown) {
      const message =
        (
          err as {
            response?: {
              data?: {
                detail?: string
              }
            }
          }
        )?.response?.data?.detail

      setError(
        message ||
          'Imeshindikana kupata marekebisho. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // ------------------------------------------------------------------
  // Filter + search
  // ------------------------------------------------------------------

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()

    return adjustments.filter((a) => {
      if (filterHali !== 'zote' && a.status !== filterHali) {
        return false
      }

      if (filterStore !== 'zote' && a.store !== filterStore) {
        return false
      }

      if (!query) return true

      return (
        String(a.id).toLowerCase().includes(query) ||
        (a.product_name || '').toLowerCase().includes(query) ||
        (a.reason || '').toLowerCase().includes(query)
      )
    })
  }, [adjustments, filterHali, filterStore, q])

  // ------------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------------

  const stats = useMemo(() => {
    return {
      zote: adjustments.length,

      inasubiri: adjustments.filter(
        (a) => a.status === 'inasubiri'
      ).length,

      imekubaliwa: adjustments.filter(
        (a) => a.status === 'imekubaliwa'
      ).length,

      imekataliwa: adjustments.filter(
        (a) => a.status === 'imekataliwa'
      ).length,
    }
  }, [adjustments])

  // ------------------------------------------------------------------
  // Error helper
  // ------------------------------------------------------------------

  const getErrorMessage = (err: unknown, fallback: string) => {
    const message = (
      err as {
        response?: {
          data?: {
            detail?: string
          }
        }
      }
    )?.response?.data?.detail

    return message || fallback
  }

  // ------------------------------------------------------------------
  // Toast helper
  // ------------------------------------------------------------------

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })

    window.setTimeout(() => {
      setToast(null)
    }, ok ? 3000 : 4000)
  }

  // ------------------------------------------------------------------
  // Thibitisha marekebisho
  // ------------------------------------------------------------------

  const handleThibitisha = async (id: string) => {
    setProcessing(id)

    try {
      await inventoryApi.approveAdjustment(id)

      showToast('Marekebisho yamethibitishwa.', true)

      await load()
    } catch (err: unknown) {
      showToast(
        getErrorMessage(
          err,
          'Imeshindikana kuthibitisha marekebisho.'
        ),
        false
      )
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Kataa marekebisho
  // ------------------------------------------------------------------

  const handleKataa = async (id: string) => {
    if (
      !window.confirm(
        'Una uhakika unataka kukataa marekebisho haya?'
      )
    ) {
      return
    }

    setProcessing(id)

    try {
      await inventoryApi.rejectAdjustment(id)

      showToast('Marekebisho yamekataliwa.', false)

      await load()
    } catch (err: unknown) {
      showToast(
        getErrorMessage(
          err,
          'Imeshindikana kukataa marekebisho.'
        ),
        false
      )
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Pata jina la duka
  // ------------------------------------------------------------------

  const getStoreName = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId)

    return store
      ? store.name.replace('Smart Hardware - ', '')
      : '—'
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
            <Package size={26} className="text-brand-600" />
            Marekebisho ya Stoki
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Thibitisha au kataa marekebisho ya stoki
          </p>
        </div>

        <button
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

      {/* Statistics */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))
        ) : (
          <>
            <Stat
              label="Zote"
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
              value={String(stats.imekubaliwa)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />

            <Stat
              label="Zimekataliwa"
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
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            {error}
          </div>

          <button
            onClick={() => void load()}
            className="text-xs font-semibold underline"
          >
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
            placeholder="Tafuta kwa bidhaa au sababu..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ListFilter
            size={14}
            className="text-slate-400"
          />

          {/* Filter kwa duka */}

          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white"
          >
            <option value="zote">
              Maduka yote
            </option>

            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.replace('Smart Hardware - ', '')}
              </option>
            ))}
          </select>

          {/* Filter kwa hali */}

          {(
            [
              'zote',
              'inasubiri',
              'imekubaliwa',
              'imekataliwa',
            ] as const
          ).map((k) => (
            <button
              key={k}
              onClick={() => setFilterHali(k)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                filterHali === k
                  ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              {k === 'zote'
                ? 'Hali Zote'
                : HALI_META[k].label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <AdjustmentSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}

      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package
            size={40}
            className="mx-auto text-slate-300 mb-3"
          />

          <h3 className="font-semibold">
            {q ||
            filterHali !== 'zote' ||
            filterStore !== 'zote'
              ? 'Hakuna matokeo'
              : 'Hakuna marekebisho bado'}
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            {q ||
            filterHali !== 'zote' ||
            filterStore !== 'zote'
              ? 'Badilisha vichujio au utafutaji.'
              : 'Marekebisho yataonekana hapa mara muuzaji atakapotuma.'}
          </p>
        </div>
      )}

      {/* Adjustments list */}

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

                  {/* Left side */}

                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg ${meta.bg} border border-slate-200 grid place-items-center shrink-0 ${meta.tone}`}
                    >
                      <meta.Icon size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          #{String(m.id).slice(0, 8).toUpperCase()}
                        </span>

                        <span
                          className={`text-[10px] uppercase font-semibold ${meta.tone}`}
                        >
                          {meta.label}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          <Store size={9} />
                          {getStoreName(m.store)}
                        </span>
                      </div>

                      <div className="text-sm truncate mt-0.5">
                        {m.product_name || m.product}
                      </div>

                      <div className="text-xs text-slate-500 truncate">
                        {m.reason}
                      </div>

                      <div className="text-xs text-slate-500">
                        {formatDate(m.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Right side */}

                  <div className="sm:text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">
                      {Number(m.quantity).toLocaleString()} pcs
                    </div>

                    <div className="text-xs text-slate-500">
                      {m.status === 'inasubiri'
                        ? 'Inasubiri'
                        : 'Imeshughulikiwa'}
                    </div>
                  </div>
                </div>

                {/* Actions */}

                {m.status === 'inasubiri' && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => void handleThibitisha(m.id)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2
                          size={12}
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}

                      Thibitisha
                    </button>

                    <button
                      onClick={() => void handleKataa(m.id)}
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
            toast.ok
              ? 'bg-emerald-600'
              : 'bg-red-600'
          }`}
        >
          {toast.ok ? (
            <CheckCircle2
              size={16}
              className="shrink-0"
            />
          ) : (
            <XCircle
              size={16}
              className="shrink-0"
            />
          )}

          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ==================================================================
// Stat component
// ==================================================================

function Stat({
  label,
  value,
  Icon,
  tone,
}: {
  label: string
  value: string
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
    </div>
  )
}

// ==================================================================
// Skeleton components
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

function AdjustmentSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />

          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-48" />
            <SkeletonLine className="h-3 w-32" />
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
