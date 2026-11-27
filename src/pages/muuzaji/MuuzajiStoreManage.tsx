import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'

import {
  Package,
  AlertTriangle,
  RotateCcw,
  PackageX,
  RefreshCcw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Store,
  User,
  Layers,
  Truck,
  Eye,
  X,
  ListFilter,
  RefreshCw,
  Lock,
  ArrowLeftRight,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { productsApi, type Product } from '../../services/products'

import {
  inventoryApi,
  type MovementType,
  type StockMovement,
  type StockAdjustment,
  type StockLevel,
} from '../../services/inventory'

import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ================================================================
// TYPES
// ================================================================

interface ProductWithStock extends Product {
  stock_quantity: number
}

interface ToastMessage {
  msg: string
  ok: boolean
}

type AdjustmentFilter = StockAdjustment['status'] | 'zote'

// ================================================================
// MOVEMENT METADATA
// ================================================================

const AINA_ADJ_META: Record<
  MovementType,
  {
    label: string
    tone: string
    Icon: ElementType
  }
> = {
  manunuzi: {
    label: 'Manunuzi',
    tone: 'text-blue-700 bg-blue-50',
    Icon: Truck,
  },

  mauzo: {
    label: 'Mauzo',
    tone: 'text-indigo-700 bg-indigo-50',
    Icon: Package,
  },

  uharibifu: {
    label: 'Uharibifu',
    tone: 'text-red-700 bg-red-50',
    Icon: AlertTriangle,
  },

  kurudisha: {
    label: 'Kurudisha',
    tone: 'text-purple-700 bg-purple-50',
    Icon: RotateCcw,
  },

  marekebisho: {
    label: 'Marekebisho',
    tone: 'text-slate-700 bg-slate-100',
    Icon: RefreshCcw,
  },

  uhamisho: {
    label: 'Uhamisho',
    tone: 'text-amber-700 bg-amber-50',
    Icon: ArrowLeftRight,
  },
}

// ================================================================
// ADJUSTMENT STATUS METADATA
// ================================================================

const HALI_ADJ_META: Record<
  StockAdjustment['status'],
  {
    label: string
    tone: string
    Icon: ElementType
  }
> = {
  inasubiri: {
    label: 'Inasubiri',
    tone: 'text-amber-600',
    Icon: Clock,
  },

  imekubaliwa: {
    label: 'Imekubaliwa',
    tone: 'text-emerald-600',
    Icon: CheckCircle2,
  },

  imekataliwa: {
    label: 'Imekataliwa',
    tone: 'text-red-600',
    Icon: XCircle,
  },
}

// ================================================================
// HELPERS
// ================================================================

function getErrorMessage(error: any, fallback: string): string {
  const data = error?.response?.data

  if (typeof data?.detail === 'string') {
    return data.detail
  }

  if (typeof data?.message === 'string') {
    return data.message
  }

  if (typeof data === 'string') {
    return data
  }

  if (data && typeof data === 'object') {
    const firstValue = Object.values(data)[0]

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0])
    }

    if (typeof firstValue === 'string') {
      return firstValue
    }
  }

  return fallback
}

function formatQuantity(value: string | number | null | undefined): string {
  const quantity = Number(value ?? 0)

  if (!Number.isFinite(quantity)) {
    return '0'
  }

  return quantity.toLocaleString('en-US', {
    maximumFractionDigits: 3,
  })
}

// ================================================================
// MAIN PAGE
// ================================================================

export default function MuuzajiStoreManage() {
  const { user } = useAuth()

  // --------------------------------------------------------------
  // USER AND STORE
  // --------------------------------------------------------------

  const storeId = user?.store_id || undefined
  const userId = user?.id || undefined
  const userRole = user?.role

  const allowedRoles = [
    'muuzaji',
    'mmiliki',
    'admin',
    'mhazini',
  ]

  // --------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------

  const [store, setStore] = useState<StoreType | null>(null)

  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const [approvingId, setApprovingId] = useState<string | null>(null)

  // --------------------------------------------------------------
  // TOAST
  // --------------------------------------------------------------

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok })

    window.setTimeout(() => {
      setToast(null)
    }, 3500)
  }, [])

  // --------------------------------------------------------------
  // LOAD STORE DATA
  // --------------------------------------------------------------

  const load = useCallback(async () => {
    setError('')

    if (!storeId) {
      setStore(null)
      setProducts([])
      setMovements([])
      setAdjustments([])
      setError('Hujapangiwa duka. Wasiliana na mmiliki ili akupangie duka.')
      setLoading(false)
      return
    }

    if (!userId) {
      setError('Taarifa za mtumiaji hazijapatikana. Tafadhali ingia tena.')
      setLoading(false)
      return
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
      setError('Huna ruhusa ya kuona usimamizi wa stoki.')
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const [
        productData,
        movementData,
        adjustmentData,
        stockData,
        storeData,
      ] = await Promise.all([
        productsApi.list(storeId),

        inventoryApi.movements({
          store: storeId,
        }),

        inventoryApi.stockAdjustments({
          store: storeId,
        }),

        inventoryApi.stockLevels({
          store: storeId,
        }),

        storesApi.get(storeId),
      ])

      // ----------------------------------------------------------
      // MAP PRODUCT STOCK
      // ----------------------------------------------------------

      const stockMap = new Map<string, number>()

      stockData.forEach((stock: StockLevel) => {
        stockMap.set(
          stock.product,
          Number(stock.quantity) || 0
        )
      })

      const productsWithStock: ProductWithStock[] = productData.map(
        (product: Product) => ({
          ...product,
          stock_quantity: stockMap.get(product.id) ?? 0,
        })
      )

      setProducts(productsWithStock)
      setMovements(movementData)
      setAdjustments(adjustmentData)
      setStore(storeData)
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          'Imeshindikana kupata taarifa za duka. Angalia muunganisho kisha ujaribu tena.'
        )
      )
    } finally {
      setLoading(false)
    }
  }, [storeId, userId, userRole])

  useEffect(() => {
    load()
  }, [load])

  // --------------------------------------------------------------
  // FILTER MOVEMENTS FOR THIS STORE
  // --------------------------------------------------------------

  const myMovements = useMemo(() => {
    if (!storeId) return []

    return movements.filter(
      (movement) => movement.store === storeId
    )
  }, [movements, storeId])

  // --------------------------------------------------------------
  // FILTER ADJUSTMENTS FOR THIS STORE
  // --------------------------------------------------------------

  const myAdjustments = useMemo(() => {
    if (!storeId) return []

    return adjustments.filter(
      (adjustment) => adjustment.store === storeId
    )
  }, [adjustments, storeId])

  // --------------------------------------------------------------
  // APPROVE STOCK ADJUSTMENT
  // --------------------------------------------------------------

  const thibitishaMarekebisho = async (id: string) => {
    if (!storeId) {
      showToast('Hujapangiwa duka.', false)
      return
    }

    const adjustment = myAdjustments.find(
      (item) => item.id === id
    )

    if (!adjustment) {
      showToast(
        'Marekebisho haya hayapatikani kwenye duka lako.',
        false
      )
      return
    }

    if (adjustment.store !== storeId) {
      showToast('Marekebisho haya si ya duka lako.', false)
      return
    }

    if (adjustment.status !== 'inasubiri') {
      showToast('Marekebisho haya tayari yameshughulikiwa.', false)
      return
    }

    try {
      setApprovingId(id)

      await inventoryApi.approveAdjustment(id)

      showToast('Marekebisho yamethibitishwa kikamilifu.', true)

      await load()
    } catch (err: any) {
      showToast(
        getErrorMessage(
          err,
          'Imeshindikana kuthibitisha marekebisho.'
        ),
        false
      )
    } finally {
      setApprovingId(null)
    }
  }

  // --------------------------------------------------------------
  // PURCHASE MOVEMENTS
  // --------------------------------------------------------------

  const uingizaji = useMemo(() => {
    return myMovements.filter(
      (movement) => movement.movement_type === 'manunuzi'
    )
  }, [myMovements])

  // --------------------------------------------------------------
  // STATISTICS
  // --------------------------------------------------------------

  const stats = useMemo(() => {
    const jumla = products.length

    const zinazopatikana = products.filter(
      (product) => product.stock_quantity > 0
    ).length

    const thamani = products.reduce((total, product) => {
      const costPrice = Number(product.cost_price) || 0

      return total + costPrice * product.stock_quantity
    }, 0)

    const chiniYaKiwango = products.filter((product) => {
      const kiwango = Number(product.low_stock_alert) || 5

      return product.stock_quantity <= kiwango
    }).length

    return {
      jumla,
      zinazopatikana,
      thamani,
      chiniYaKiwango,
    }
  }, [products])

  // --------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            <Store size={26} className="text-brand-600" />
            Usimamizi wa Stoki

            <span
              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500"
              title="Taarifa za duka lako"
            >
              <Lock size={10} />
              Duka Lako
            </span>
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <User size={12} />
              {user?.full_name || 'Mtumiaji'}
            </span>

            <span className="text-slate-300">|</span>

            {loading ? (
              <SkeletonLine className="h-4 w-32" />
            ) : store ? (
              <span className="inline-flex items-center gap-1 font-medium text-brand-700">
                <Store size={14} />
                {store.name}

                {store.location && (
                  <span className="font-normal text-slate-400">
                    ({store.location})
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <AlertTriangle size={14} />
                Hujapangiwa duka
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            size={14}
            className={loading ? 'animate-spin' : ''}
          />
          Sasisha
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <div className="flex-1">
            {error}
          </div>

          <button
            type="button"
            onClick={load}
            className="text-xs font-semibold underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <MiniStatSkeleton key={index} />
          ))
        ) : (
          <>
            <MiniStat
              label="Bidhaa"
              value={String(stats.jumla)}
              Icon={Package}
              tone="text-blue-600"
            />

            <MiniStat
              label="Zenye Stoki"
              value={String(stats.zinazopatikana)}
              Icon={Layers}
              tone="text-emerald-600"
            />

            <MiniStat
              label="Chini ya Kiwango"
              value={String(stats.chiniYaKiwango)}
              Icon={AlertTriangle}
              tone="text-amber-600"
            />

            <MiniStat
              label="Thamani ya Stoki"
              value={formatTsh(stats.thamani)}
              Icon={PackageX}
              tone="text-purple-600"
            />
          </>
        )}
      </div>

      {/* ==========================================================
          SECTION 1: STOCK
      ========================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Layers size={18} className="text-brand-600" />
            Stoki ({products.length})
          </h2>

          {store && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Store size={12} />
              {store.name}
            </span>
          )}
        </div>

        <StokiTable
          products={products}
          loading={loading}
        />
      </section>

      {/* ==========================================================
          SECTION 2: STOCK ADJUSTMENTS
      ========================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <RefreshCcw size={18} className="text-brand-600" />
            Marekebisho ya Stoki ({myAdjustments.length})
          </h2>
        </div>

        <MarekebishoTable
          adjustments={myAdjustments}
          loading={loading}
          approvingId={approvingId}
          onThibitisha={thibitishaMarekebisho}
        />
      </section>

      {/* ==========================================================
          SECTION 3: PURCHASES
      ========================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Truck size={18} className="text-brand-600" />
            Uingizaji wa Vifaa ({uingizaji.length})
          </h2>
        </div>

        <UingizajiTable
          movements={uingizaji}
          loading={loading}
        />
      </section>

      {/* TOAST */}

      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 z-[60] flex max-w-md -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm text-white shadow-2xl ${
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
// TABLE 1: STOCK
// ================================================================

function StokiTable({
  products,
  loading,
}: {
  products: ProductWithStock[]
  loading: boolean
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const search = query.toLowerCase().trim()

    if (!search) return products

    return products.filter((product) => {
      return (
        (product.name || '').toLowerCase().includes(search) ||
        String(product.sku || '').toLowerCase().includes(search) ||
        (product.category_name || '').toLowerCase().includes(search)
      )
    })
  }, [products, query])

  return (
    <div>
      {/* SEARCH */}

      <div className="border-b border-slate-100 p-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tafuta bidhaa kwa jina, SKU au kundi..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* LOADING */}

      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <TableRowSkeleton key={index} cols={6} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center">
          <Package size={32} className="mx-auto mb-2 text-slate-300" />

          <p className="text-sm text-slate-500">
            {products.length === 0
              ? 'Hakuna bidhaa kwenye duka lako.'
              : 'Hakuna bidhaa zinazolingana na utafutaji wako.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3 text-xs font-medium uppercase">
                  Bidhaa
                </th>

                <th className="p-3 text-xs font-medium uppercase">
                  Kundi
                </th>

                <th className="p-3 text-right text-xs font-medium uppercase">
                  Stoki
                </th>

                <th className="p-3 text-right text-xs font-medium uppercase">
                  Bei Mauzo
                </th>

                <th className="p-3 text-right text-xs font-medium uppercase">
                  Bei Ununuzi
                </th>

                <th className="p-3 text-xs font-medium uppercase">
                  Hali
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => {
                const threshold =
                  Number(product.low_stock_alert) || 5

                const low =
                  product.stock_quantity <= threshold

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/50"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                          <Package size={16} />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {product.name}
                          </div>

                          <div className="text-xs text-slate-500">
                            {product.sku || 'Hakuna SKU'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {product.category_name || '—'}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <span
                        className={`font-bold ${
                          product.stock_quantity === 0
                            ? 'text-red-600'
                            : low
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                        }`}
                      >
                        {formatQuantity(product.stock_quantity)}
                      </span>
                    </td>

                    <td className="p-3 text-right font-semibold text-brand-700">
                      {formatTsh(Number(product.selling_price) || 0)}
                    </td>

                    <td className="p-3 text-right text-slate-600">
                      {formatTsh(Number(product.cost_price) || 0)}
                    </td>

                    <td className="p-3">
                      {product.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                          <CheckCircle2 size={10} />
                          Hai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                          <XCircle size={10} />
                          Imezimwa
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ================================================================
// TABLE 2: STOCK ADJUSTMENTS
// ================================================================

function MarekebishoTable({
  adjustments,
  loading,
  approvingId,
  onThibitisha,
}: {
  adjustments: StockAdjustment[]
  loading: boolean
  approvingId: string | null
  onThibitisha: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<AdjustmentFilter>('zote')

  const filtered = useMemo(() => {
    const search = query.toLowerCase().trim()

    return adjustments.filter((adjustment) => {
      if (
        filter !== 'zote' &&
        adjustment.status !== filter
      ) {
        return false
      }

      if (!search) return true

      return (
        adjustment.id.toLowerCase().includes(search) ||
        (adjustment.product_name || '').toLowerCase().includes(search) ||
        (adjustment.reason || '').toLowerCase().includes(search)
      )
    })
  }, [adjustments, query, filter])

  const filters: AdjustmentFilter[] = [
    'zote',
    'inasubiri',
    'imekubaliwa',
    'imekataliwa',
  ]

  return (
    <div>
      {/* SEARCH AND FILTER */}

      <div className="space-y-2 border-b border-slate-100 p-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tafuta kwa ID, bidhaa au sababu..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ListFilter size={14} className="text-slate-400" />

          {filters.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                filter === item
                  ? 'border-brand-600 bg-brand-600 font-semibold text-white'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              {item === 'zote'
                ? 'Zote'
                : HALI_ADJ_META[item].label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}

      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <TableRowSkeleton key={index} cols={6} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center">
          <RefreshCcw size={32} className="mx-auto mb-2 text-slate-300" />

          <p className="text-sm text-slate-500">
            {adjustments.length === 0
              ? 'Hakuna marekebisho kwenye duka lako.'
              : 'Hakuna marekebisho yanayolingana na utafutaji wako.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3 text-xs font-medium uppercase">
                  ID
                </th>

                <th className="p-3 text-xs font-medium uppercase">
                  Bidhaa
                </th>

                <th className="p-3 text-xs font-medium uppercase">
                  Sababu
                </th>

                <th className="p-3 text-right text-xs font-medium uppercase">
                  Wingi
                </th>

                <th className="p-3 text-xs font-medium uppercase">
                  Hali
                </th>

                <th className="p-3 text-right text-xs font-medium uppercase">
                  Kitendo
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((adjustment) => {
                const meta = HALI_ADJ_META[adjustment.status]
                const StatusIcon = meta.Icon

                return (
                  <tr
                    key={adjustment.id}
                    className="hover:bg-slate-50/50"
                  >
                    <td className="p-3 font-mono text-xs">
                      #{adjustment.id.slice(0, 8)}
                    </td>

                    <td className="p-3">
                      <div className="max-w-[180px] truncate font-medium">
                        {adjustment.product_name || adjustment.product}
                      </div>
                    </td>

                    <td className="max-w-[200px] truncate p-3 text-xs text-slate-600">
                      {adjustment.reason}
                    </td>

                    <td className="p-3 text-right font-semibold">
                      {formatQuantity(adjustment.quantity)}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${meta.tone}`}
                      >
                        <StatusIcon size={12} />
                        {meta.label}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      {adjustment.status === 'inasubiri' && (
                        <button
                          type="button"
                          disabled={approvingId === adjustment.id}
                          onClick={() => onThibitisha(adjustment.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {approvingId === adjustment.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}

                          {approvingId === adjustment.id
                            ? 'Inathibitisha...'
                            : 'Thibitisha'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ================================================================
// TABLE 3: PURCHASE MOVEMENTS
// ================================================================

function UingizajiTable({
  movements,
  loading,
}: {
  movements: StockMovement[]
  loading: boolean
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<StockMovement | null>(null)

  const filtered = useMemo(() => {
    const search = query.toLowerCase().trim()

    if (!search) return movements

    return movements.filter((movement) => {
      return (
        movement.id.toLowerCase().includes(search) ||
        (movement.product_name || '').toLowerCase().includes(search) ||
        (movement.note || '').toLowerCase().includes(search)
      )
    })
  }, [movements, query])

  return (
    <div>
      {/* SEARCH */}

      <div className="border-b border-slate-100 p-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tafuta kwa ID, bidhaa au maelezo..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* CONTENT */}

      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <TableRowSkeleton key={index} cols={6} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center">
          <Truck size={32} className="mx-auto mb-2 text-slate-300" />

          <p className="text-sm text-slate-500">
            {movements.length === 0
              ? 'Hakuna uingizaji kwenye duka lako.'
              : 'Hakuna uingizaji unaolingana na utafutaji wako.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3 text-xs font-medium uppercase">
                  ID
                </th>

                <th className="p-3 text-xs font-medium uppercase">
                  Bidhaa
                </th>

                <th className="p-3 text-right text-xs font-medium uppercase">
                  Wingi
                </th>

                <th className="p-3 text-right text-xs font-medium uppercase">
                  Bei
                </th>

                <th className="p-3 text-xs font-medium uppercase">
                  Tarehe
                </th>

                <th className="p-3 text-right text-xs font-medium uppercase">
                  Maelezo
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((movement) => (
                <tr
                  key={movement.id}
                  className="hover:bg-slate-50/50"
                >
                  <td className="p-3 font-mono text-xs">
                    #{movement.id.slice(0, 8)}
                  </td>

                  <td className="p-3">
                    <div className="max-w-[200px] truncate font-medium">
                      {movement.product_name || movement.product}
                    </div>
                  </td>

                  <td className="p-3 text-right font-semibold">
                    {formatQuantity(movement.quantity)}
                  </td>

                  <td className="p-3 text-right font-semibold text-brand-700">
                    {formatTsh(Number(movement.unit_cost) || 0)}
                  </td>

                  <td className="p-3 text-xs text-slate-500">
                    {formatDate(movement.created_at)}
                  </td>

                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(movement)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <Eye size={12} />
                      Ona
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL */}

      {selected && (
        <UingizajiDetail
          movement={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ================================================================
// PURCHASE MOVEMENT DETAIL MODAL
// ================================================================

function UingizajiDetail({
  movement,
  onClose,
}: {
  movement: StockMovement
  onClose: () => void
}) {
  const meta = AINA_ADJ_META[movement.movement_type]
  const MovementIcon = meta?.Icon || Package

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* BACKDROP */}

      <button
        type="button"
        aria-label="Funga dirisha"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* MODAL */}

      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <div className="font-semibold">
              #{movement.id.slice(0, 8).toUpperCase()}
            </div>

            <div className="text-xs text-slate-500">
              {formatDate(movement.created_at)}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-4 text-sm">
          {/* MOVEMENT TYPE */}

          <div
            className={`inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold ${
              meta?.tone || 'bg-slate-50 text-slate-700'
            }`}
          >
            <MovementIcon size={12} />
            {meta?.label || movement.movement_type}
          </div>

          {/* PRODUCT */}

          <div className="space-y-1 rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">
              Bidhaa
            </div>

            <div className="font-medium">
              {movement.product_name || movement.product}
            </div>
          </div>

          {/* STORE */}

          <div className="space-y-1 rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">
              Duka
            </div>

            <div className="flex items-center gap-1.5 font-medium">
              <Store size={14} />
              {movement.store_name || movement.store}
            </div>
          </div>

          {/* QUANTITY AND COST */}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">
                Wingi
              </div>

              <div className="font-bold">
                {formatQuantity(movement.quantity)}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">
                Bei ya Unit
              </div>

              <div className="font-bold text-brand-700">
                {formatTsh(Number(movement.unit_cost) || 0)}
              </div>
            </div>
          </div>

          {/* NOTE */}

          {movement.note && (
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="mb-1 text-xs text-slate-500">
                Maelezo
              </div>

              <div>{movement.note}</div>
            </div>
          )}

          {/* CREATED BY */}

          <div className="space-y-1 rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">
              Imewekwa na
            </div>

            <div className="flex items-center gap-1.5">
              <User size={14} />

              {movement.created_by_name ||
                movement.created_by ||
                'Haijulikani'}
            </div>
          </div>

          {/* REFERENCE */}

          {movement.reference_id && (
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="mb-1 text-xs text-slate-500">
                Reference ID
              </div>

              <div className="break-all font-mono text-xs">
                {movement.reference_id}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ================================================================
// SKELETONS
// ================================================================

function MiniStatSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />

      <SkeletonLine className="mt-2.5 h-3 w-20" />

      <SkeletonLine className="mt-2 h-5 w-24" />
    </div>
  )
}

function TableRowSkeleton({
  cols = 5,
}: {
  cols?: number
}) {
  return (
    <div
      className="grid items-center gap-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: cols }).map((_, index) => (
        <SkeletonLine
          key={index}
          className="h-4 w-full"
        />
      ))}
    </div>
  )
}

// ================================================================
// MINI STAT
// ================================================================

function MiniStat({
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div
        className={`grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-slate-50 ${tone}`}
      >
        <Icon size={16} />
      </div>

      <div className="mt-2.5 text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-0.5 truncate text-sm font-bold text-slate-900 md:text-base">
        {value}
      </div>
    </div>
  )
}