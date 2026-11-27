
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ElementType } from 'react'

import {
  Package,
  Search,
  Store,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  History,
  Boxes,
  X,
  ArrowRight,
} from 'lucide-react'

import {
  storesApi,
  type Store as StoreType,
} from '../../services/stores'

import {
  inventoryApi,
  type StockLevel,
  type StockMovement,
} from '../../services/inventory'

import { formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ============================================================
// TYPES
// ============================================================

type TabType = 'inventory' | 'history'

interface TransferForm {
  productId: string
  fromStoreId: string
  toStoreId: string
  quantity: string
  note: string
}

// ============================================================
// HELPERS
// ============================================================

function getApiError(err: unknown, fallback: string): string {
  const error = err as {
    response?: {
      data?: Record<string, unknown> | string
    }
    message?: string
  }

  const data = error?.response?.data

  if (typeof data === 'string') {
    return data
  }

  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') {
      return data.detail
    }

    const firstValue = Object.values(data)[0]

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0])
    }

    if (typeof firstValue === 'string') {
      return firstValue
    }
  }

  return error?.message || fallback
}

function quantityNumber(value: string | number): number {
  const result = Number(value)

  return Number.isFinite(result) ? result : 0
}

function formatQuantity(value: string | number): string {
  return quantityNumber(value).toLocaleString('en-US', {
    maximumFractionDigits: 3,
  })
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function UingizaVifaa(
  _props: { role: 'mmiliki' | 'admin' }
) {
  // DATA
  const [stores, setStores] = useState<StoreType[]>([])
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])

  // LOADING
  const [loading, setLoading] = useState(true)
  const [transferring, setTransferring] = useState(false)

  // ALERTS
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // FILTERS
  const [tab, setTab] = useState<TabType>('inventory')
  const [selectedStoreId, setSelectedStoreId] = useState('all')
  const [search, setSearch] = useState('')

  // TRANSFER MODAL
  const [selectedStock, setSelectedStock] =
    useState<StockLevel | null>(null)

  const [transferForm, setTransferForm] = useState<TransferForm>({
    productId: '',
    fromStoreId: '',
    toStoreId: '',
    quantity: '',
    note: '',
  })

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [storeData, stockData, movementData] = await Promise.all([
        storesApi.list(),
        inventoryApi.stockLevels(),
        inventoryApi.movements({
          reference_type: 'transfer',
        }),
      ])

      setStores(storeData)
      setStockLevels(stockData)
      setMovements(movementData)

      setSelectedStoreId(current => {
        if (
          current === 'all' ||
          storeData.some(store => store.id === current)
        ) {
          return current
        }

        return 'all'
      })
    } catch (err: unknown) {
      setError(
        getApiError(
          err,
          'Imeshindikana kupata taarifa za inventory.'
        )
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // ==========================================================
  // FILTER INVENTORY
  // ==========================================================

  const filteredStock = useMemo(() => {
    const query = search.trim().toLowerCase()

    return stockLevels.filter(item => {
      const matchesStore =
        selectedStoreId === 'all' ||
        item.store === selectedStoreId

      const matchesSearch =
        !query ||
        item.product_name.toLowerCase().includes(query) ||
        item.store_name.toLowerCase().includes(query) ||
        item.product.toLowerCase().includes(query)

      return matchesStore && matchesSearch
    })
  }, [stockLevels, selectedStoreId, search])

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const totalUnits = useMemo(() => {
    return stockLevels.reduce(
      (total, item) =>
        total + quantityNumber(item.quantity),
      0
    )
  }, [stockLevels])

  const totalProducts = useMemo(() => {
    return new Set(
      stockLevels.map(item => item.product)
    ).size
  }, [stockLevels])

  const activeStores = useMemo(() => {
    return new Set(
      stockLevels.map(item => item.store)
    ).size
  }, [stockLevels])

  // ==========================================================
  // OPEN TRANSFER MODAL
  // ==========================================================

  const openTransfer = (stock: StockLevel) => {
    setSelectedStock(stock)

    setTransferForm({
      productId: stock.product,
      fromStoreId: stock.store,
      toStoreId: '',
      quantity: '',
      note: '',
    })

    setError('')
    setSuccess('')
  }

  // ==========================================================
  // CLOSE TRANSFER MODAL
  // ==========================================================

  const closeTransfer = () => {
    if (transferring) return

    setSelectedStock(null)

    setTransferForm({
      productId: '',
      fromStoreId: '',
      toStoreId: '',
      quantity: '',
      note: '',
    })
  }

  // ==========================================================
  // SUBMIT TRANSFER
  // ==========================================================

  const submitTransfer = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()

    if (!selectedStock) return

    setError('')
    setSuccess('')

    const quantity = Number(transferForm.quantity)

    // Validate destination
    if (!transferForm.toStoreId) {
      setError('Tafadhali chagua duka unalopeleka bidhaa.')
      return
    }

    // Validate stores
    if (
      transferForm.toStoreId === transferForm.fromStoreId
    ) {
      setError(
        'Duka la mwanzo na duka lengwa hayawezi kuwa sawa.'
      )
      return
    }

    // Validate quantity
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Kiasi cha kuhamisha si sahihi.')
      return
    }

    const available = quantityNumber(selectedStock.quantity)

    if (quantity > available) {
      setError(
        `Stock haitoshi. Kiasi kilichopo ni ${formatQuantity(available)}.`
      )
      return
    }

    const fromStore = stores.find(
      store => store.id === transferForm.fromStoreId
    )

    const toStore = stores.find(
      store => store.id === transferForm.toStoreId
    )

    if (!fromStore || !toStore) {
      setError('Taarifa za maduka hazijapatikana.')
      return
    }

    const confirmed = window.confirm(
      `Unataka kuhamisha ${formatQuantity(quantity)} ${selectedStock.product_name} kutoka ${fromStore.name} kwenda ${toStore.name}?`
    )

    if (!confirmed) return

    setTransferring(true)

    try {
      await inventoryApi.transfer({
        product_id: transferForm.productId,
        from_store_id: transferForm.fromStoreId,
        to_store_id: transferForm.toStoreId,
        quantity,
        note: transferForm.note.trim(),
      })

      setSuccess(
        `${formatQuantity(quantity)} ya ${selectedStock.product_name} imehamishwa kutoka ${fromStore.name} kwenda ${toStore.name}.`
      )

      setSelectedStock(null)

      setTransferForm({
        productId: '',
        fromStoreId: '',
        toStoreId: '',
        quantity: '',
        note: '',
      })

      await load()
    } catch (err: unknown) {
      setError(
        getApiError(
          err,
          'Uhamisho umeshindikana. Tafadhali jaribu tena.'
        )
      )
    } finally {
      setTransferring(false)
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-5">

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Boxes size={27} className="text-brand-600" />
            Hamisha Bidhaa Kwenda Duka
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Angalia assets zote na hamisha stock kati ya maduka.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || transferring}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? 'animate-spin' : ''}
          />
          Sasisha
        </button>
      </div>

      {/* ================================================== */}
      {/* ALERTS */}
      {/* ================================================== */}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle
            size={17}
            className="shrink-0 mt-0.5"
          />

          <span className="flex-1">{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2
            size={17}
            className="shrink-0 mt-0.5"
          />

          <span className="flex-1">{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ================================================== */}
      {/* STATISTICS */}
      {/* ================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        <StatCard
          title="Jumla ya Bidhaa"
          value={
            loading
              ? '...'
              : totalProducts.toLocaleString()
          }
          subtitle="Bidhaa tofauti kwenye inventory"
          Icon={Package}
        />

        <StatCard
          title="Jumla ya Stoki"
          value={
            loading
              ? '...'
              : totalUnits.toLocaleString()
          }
          subtitle="Idadi ya units zilizopo"
          Icon={Boxes}
        />

        <StatCard
          title="Maduka Yenye Stoki"
          value={
            loading
              ? '...'
              : activeStores.toLocaleString()
          }
          subtitle="Maduka yenye inventory"
          Icon={Store}
        />

      </div>

      {/* ================================================== */}
      {/* STORE FILTER */}
      {/* ================================================== */}

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
          <Store size={15} />
          Chagua duka la kuangalia
        </label>

        <select
          value={selectedStoreId}
          onChange={e => setSelectedStoreId(e.target.value)}
          disabled={loading}
          className="mt-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm"
        >
          <option value="all">
            Maduka yote
          </option>

          {stores.map(store => (
            <option key={store.id} value={store.id}>
              {store.name} — {store.location}
            </option>
          ))}
        </select>
      </div>

      {/* ================================================== */}
      {/* TABS */}
      {/* ================================================== */}

      <div className="flex gap-2 overflow-x-auto">
        <TabButton
          active={tab === 'inventory'}
          onClick={() => setTab('inventory')}
          Icon={Boxes}
          label="Assets za Inventory"
        />

        <TabButton
          active={tab === 'history'}
          onClick={() => setTab('history')}
          Icon={History}
          label="Historia ya Uhamisho"
        />
      </div>

      {/* ================================================== */}
      {/* INVENTORY TAB */}
      {/* ================================================== */}

      {tab === 'inventory' && (
        <div className="space-y-3">

          {/* SEARCH */}

          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tafuta bidhaa, SKU au duka..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          {/* STOCK LOADING */}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-slate-200 p-4"
                >
                  <SkeletonLine className="h-4 w-40" />
                  <SkeletonLine className="h-3 w-28 mt-3" />
                </div>
              ))}
            </div>

          ) : filteredStock.length === 0 ? (

            /* EMPTY STATE */

            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Package
                size={42}
                className="mx-auto text-slate-300 mb-3"
              />

              <h3 className="font-semibold text-slate-800">
                Hakuna assets zilizopatikana
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Hakuna stock inayolingana na utafutaji wako.
              </p>
            </div>

          ) : (

            /* STOCK LIST */

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-800">
                    Inventory Assets
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    {filteredStock.length} records zimepatikana
                  </p>
                </div>

                <Package
                  size={20}
                  className="text-brand-600"
                />
              </div>

              <div className="divide-y divide-slate-100">

                {filteredStock.map(stock => {
                  const available = quantityNumber(
                    stock.quantity
                  )

                  return (
                    <div
                      key={stock.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >

                      {/* PRODUCT ICON */}

                      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0">
                        <Package size={21} />
                      </div>

                      {/* PRODUCT DETAILS */}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-slate-900">
                          {stock.product_name}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          Product ID: {stock.product}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <Store size={12} />
                          {stock.store_name}
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1">
                          Imesasishwa: {formatDate(stock.updated_at)}
                        </p>
                      </div>

                      {/* QUANTITY AND ACTION */}

                      <div className="flex items-center justify-between sm:justify-end gap-4">

                        <div className="text-right">
                          <p className="text-xs text-slate-500">
                            Kiasi kilichopo
                          </p>

                          <p
                            className={`text-lg font-bold tabular-nums ${
                              available > 0
                                ? 'text-emerald-700'
                                : 'text-red-600'
                            }`}
                          >
                            {formatQuantity(stock.quantity)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openTransfer(stock)}
                          disabled={
                            available <= 0 ||
                            stores.length < 2
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ArrowRightLeft size={14} />
                          Hamisha
                        </button>

                      </div>
                    </div>
                  )
                })}

              </div>
            </div>
          )}

        </div>
      )}

      {/* ================================================== */}
      {/* TRANSFER HISTORY TAB */}
      {/* ================================================== */}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">
              Historia ya Uhamisho
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Rekodi za assets zilizohamishwa kati ya maduka.
            </p>
          </div>

          {loading ? (

            <div className="p-4 space-y-3">
              <SkeletonLine className="h-4 w-40" />
              <SkeletonLine className="h-4 w-56" />
            </div>

          ) : movements.length === 0 ? (

            <div className="p-12 text-center">
              <History
                size={40}
                className="mx-auto text-slate-300 mb-3"
              />

              <h3 className="font-semibold">
                Hakuna historia ya uhamisho
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Uhamisho utakao fanyika utaonekana hapa.
              </p>
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {movements.map(movement => (
                <div
                  key={movement.id}
                  className="p-4 flex items-start gap-3"
                >

                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                    <ArrowRightLeft size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900">
                      {movement.product_name}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Duka: {movement.store_name}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      {movement.note || 'Uhamisho wa bidhaa'}
                    </p>

                    <p className="text-[11px] text-slate-400 mt-1">
                      {formatDate(movement.created_at)}
                      {' · '}
                      {movement.created_by_name}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-sm text-slate-800">
                      {formatQuantity(movement.quantity)}
                    </span>

                    <p className="text-[10px] text-slate-400">
                      Units
                    </p>
                  </div>

                </div>
              ))}

            </div>
          )}

        </div>
      )}

      {/* ================================================== */}
      {/* COMPACT TRANSFER MODAL */}
      {/* ================================================== */}

      {selectedStock && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-3">

          <div className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">

            {/* MODAL HEADER */}

            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Hamisha Bidhaa
                </h2>

                <p className="text-xs text-slate-500">
                  Hamisha stock kwenda duka jingine
                </p>
              </div>

              <button
                type="button"
                onClick={closeTransfer}
                disabled={transferring}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL FORM */}

            <form
              onSubmit={submitTransfer}
              className="p-4 space-y-3 overflow-y-auto"
            >

              {/* PRODUCT SUMMARY */}

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">

                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center shrink-0">
                  <Package size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">
                    {selectedStock.product_name}
                  </p>

                  <p className="text-xs text-slate-500">
                    Stock iliyopo:{' '}
                    <strong className="text-emerald-700">
                      {formatQuantity(selectedStock.quantity)}
                    </strong>
                  </p>
                </div>

              </div>

              {/* SOURCE AND DESTINATION */}

              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">

                {/* SOURCE STORE */}

                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Kutoka
                  </label>

                  <div className="px-2.5 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-medium text-slate-700 truncate">
                    {stores.find(
                      store =>
                        store.id === transferForm.fromStoreId
                    )?.name || 'Duka la mwanzo'}
                  </div>
                </div>

                <div className="pb-2.5 text-brand-600">
                  <ArrowRight size={18} />
                </div>

                {/* DESTINATION STORE */}

                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Kwenda
                  </label>

                  <select
                    required
                    value={transferForm.toStoreId}
                    onChange={e =>
                      setTransferForm(prev => ({
                        ...prev,
                        toStoreId: e.target.value,
                      }))
                    }
                    disabled={transferring}
                    className="w-full px-2 py-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                  >
                    <option value="">
                      Chagua duka
                    </option>

                    {stores
                      .filter(
                        store =>
                          store.id !== transferForm.fromStoreId
                      )
                      .map(store => (
                        <option
                          key={store.id}
                          value={store.id}
                        >
                          {store.name}
                        </option>
                      ))}
                  </select>
                </div>

              </div>

              {/* QUANTITY */}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Kiasi cha kuhamisha
                </label>

                <input
                  type="number"
                  min="0.000001"
                  max={quantityNumber(selectedStock.quantity)}
                  step="any"
                  required
                  value={transferForm.quantity}
                  onChange={e =>
                    setTransferForm(prev => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  disabled={transferring}
                  placeholder="Ingiza kiasi"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-brand-100"
                />

                <p className="text-[11px] text-slate-400 mt-1">
                  Kiasi cha juu: {formatQuantity(selectedStock.quantity)}
                </p>
              </div>

              {/* NOTE */}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Sababu ya uhamisho (hiari)
                </label>

                <textarea
                  rows={2}
                  value={transferForm.note}
                  onChange={e =>
                    setTransferForm(prev => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  disabled={transferring}
                  placeholder="Andika maelezo mafupi..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {/* MODAL BUTTONS */}

              <div className="flex gap-2 pt-1 sticky bottom-0 bg-white">

                <button
                  type="button"
                  onClick={closeTransfer}
                  disabled={transferring}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Ghairi
                </button>

                <button
                  type="submit"
                  disabled={
                    transferring ||
                    !transferForm.toStoreId ||
                    !transferForm.quantity
                  }
                  className="flex-1 px-3 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {transferring ? (
                    <>
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Inahamisha...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft size={15} />
                      Hamisha sasa
                    </>
                  )}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  subtitle,
  Icon,
}: {
  title: string
  value: string
  subtitle: string
  Icon: ElementType
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">
          {title}
        </p>

        <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center">
          <Icon size={18} />
        </div>
      </div>

      <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
        {value}
      </p>

      <p className="text-xs text-slate-400 mt-1">
        {subtitle}
      </p>

    </div>
  )
}

// ============================================================
// TAB BUTTON
// ============================================================

function TabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  Icon: ElementType
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border whitespace-nowrap transition ${
        active
          ? 'bg-brand-600 text-white border-brand-600 font-semibold'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}
