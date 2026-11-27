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
  Trash2,
  MinusCircle,
  ShieldAlert,
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

import { productsApi } from '../../services/products'
import { formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ============================================================
// TYPES
// ============================================================

type TabType = 'inventory' | 'history'
type ModalType = 'transfer' | 'reduce' | 'delete' | null

interface TransferForm {
  productId: string
  fromStoreId: string
  toStoreId: string
  quantity: string
  note: string
}

interface ReduceForm {
  quantity: string
  reason: string
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

  if (typeof data === 'string') return data

  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail

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

export default function UingizaVifaa({
  role,
}: {
  role: 'mmiliki' | 'admin'
}) {
  const canManageProducts = role === 'admin' || role === 'mmiliki'

  // DATA
  const [stores, setStores] = useState<StoreType[]>([])
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])

  // LOADING
  const [loading, setLoading] = useState(true)
  const [transferring, setTransferring] = useState(false)
  const [reducing, setReducing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ALERTS
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // FILTERS
  const [tab, setTab] = useState<TabType>('inventory')
  const [selectedStoreId, setSelectedStoreId] = useState('all')
  const [search, setSearch] = useState('')

  // MODALS
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)

  const [selectedStock, setSelectedStock] =
    useState<StockLevel | null>(null)

  const [transferForm, setTransferForm] = useState<TransferForm>({
    productId: '',
    fromStoreId: '',
    toStoreId: '',
    quantity: '',
    note: '',
  })

  const [reduceForm, setReduceForm] = useState<ReduceForm>({
    quantity: '',
    reason: '',
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
        (item.product_name || '').toLowerCase().includes(query) ||
        (item.store_name || '').toLowerCase().includes(query) ||
        (item.product || '').toLowerCase().includes(query)

      return matchesStore && matchesSearch
    })
  }, [stockLevels, selectedStoreId, search])

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const totalUnits = useMemo(
    () =>
      stockLevels.reduce(
        (total, item) => total + quantityNumber(item.quantity),
        0
      ),
    [stockLevels]
  )

  const totalProducts = useMemo(
    () => new Set(stockLevels.map(item => item.product)).size,
    [stockLevels]
  )

  const activeStores = useMemo(
    () => new Set(stockLevels.map(item => item.store)).size,
    [stockLevels]
  )

  // ==========================================================
  // RESET MODALS
  // ==========================================================

  const closeModal = () => {
    if (transferring || reducing || deleting) return

    setActiveModal(null)
    setConfirmationOpen(false)
    setSelectedStock(null)

    setTransferForm({
      productId: '',
      fromStoreId: '',
      toStoreId: '',
      quantity: '',
      note: '',
    })

    setReduceForm({
      quantity: '',
      reason: '',
    })
  }

  // ==========================================================
  // OPEN TRANSFER MODAL
  // ==========================================================

  const openTransfer = (stock: StockLevel) => {
    setSelectedStock(stock)
    setActiveModal('transfer')
    setConfirmationOpen(false)
    setError('')

    setTransferForm({
      productId: stock.product,
      fromStoreId: stock.store,
      toStoreId: '',
      quantity: '',
      note: '',
    })
  }

  // ==========================================================
  // OPEN REDUCE STOCK MODAL
  // ==========================================================

  const openReduce = (stock: StockLevel) => {
    if (!canManageProducts) return

    setSelectedStock(stock)
    setActiveModal('reduce')
    setError('')

    setReduceForm({
      quantity: '',
      reason: '',
    })
  }

  // ==========================================================
  // OPEN DELETE PRODUCT MODAL
  // ==========================================================

  const openDelete = (stock: StockLevel) => {
    if (!canManageProducts) return

    setSelectedStock(stock)
    setActiveModal('delete')
    setConfirmationOpen(false)
    setError('')
  }

  // ==========================================================
  // TRANSFER VALIDATION
  // ==========================================================

  const submitTransfer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!selectedStock) return

    const quantity = Number(transferForm.quantity)
    const available = quantityNumber(selectedStock.quantity)

    if (!transferForm.toStoreId) {
      setError('Tafadhali chagua duka unalopeleka bidhaa.')
      return
    }

    if (transferForm.toStoreId === transferForm.fromStoreId) {
      setError('Duka la mwanzo na duka lengwa hayawezi kuwa sawa.')
      return
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Kiasi cha kuhamisha si sahihi.')
      return
    }

    if (quantity > available) {
      setError(
        `Stock haitoshi. Kiasi kilichopo ni ${formatQuantity(available)}.`
      )
      return
    }

    setConfirmationOpen(true)
  }

  // ==========================================================
  // CONFIRM TRANSFER
  // ==========================================================

  const confirmTransfer = async () => {
    if (!selectedStock) return

    const quantity = Number(transferForm.quantity)

    const fromStore = stores.find(
      store => store.id === transferForm.fromStoreId
    )

    const toStore = stores.find(
      store => store.id === transferForm.toStoreId
    )

    if (!fromStore || !toStore) {
      setError('Taarifa za maduka hazijapatikana.')
      setConfirmationOpen(false)
      return
    }

    setTransferring(true)
    setError('')

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

      setActiveModal(null)
      setConfirmationOpen(false)
      setSelectedStock(null)

      await load()
    } catch (err: unknown) {
      setError(
        getApiError(
          err,
          'Uhamisho umeshindikana. Tafadhali jaribu tena.'
        )
      )
      setConfirmationOpen(false)
    } finally {
      setTransferring(false)
    }
  }

  // ==========================================================
  // REDUCE STOCK
  // ==========================================================

  const submitReduceStock = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()

    if (!selectedStock || !canManageProducts) return

    setError('')
    setSuccess('')

    const quantity = Number(reduceForm.quantity)
    const available = quantityNumber(selectedStock.quantity)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Tafadhali ingiza kiasi sahihi cha kupunguza.')
      return
    }

    if (quantity > available) {
      setError(
        `Huwezi kupunguza zaidi ya stock iliyopo: ${formatQuantity(available)}.`
      )
      return
    }

    if (!reduceForm.reason.trim()) {
      setError('Tafadhali eleza sababu ya kupunguza stock.')
      return
    }

    setReducing(true)

    try {
      await inventoryApi.adjust({
        product_id: selectedStock.product,
        store_id: selectedStock.store,
        quantity: -quantity,
        movement_type: 'marekebisho',
        note: `PUNGUZO LA STOCK: ${reduceForm.reason.trim()}`,
      })

      setSuccess(
        `Stock ya ${selectedStock.product_name} imepunguzwa kwa ${formatQuantity(quantity)}.`
      )

      setActiveModal(null)
      setSelectedStock(null)

      setReduceForm({
        quantity: '',
        reason: '',
      })

      await load()
    } catch (err: unknown) {
      setError(
        getApiError(
          err,
          'Imeshindikana kupunguza stock. Tafadhali jaribu tena.'
        )
      )
    } finally {
      setReducing(false)
    }
  }

  // ==========================================================
  // DELETE PRODUCT
  // ==========================================================

  const confirmDeleteProduct = async () => {
    if (!selectedStock || !canManageProducts) return

    setDeleting(true)
    setError('')
    setSuccess('')

    try {
      // Deletes the product itself, not only its stock record.
      await productsApi.remove(selectedStock.product)

      setSuccess(
        `Bidhaa "${selectedStock.product_name}" imefutwa kabisa.`
      )

      setActiveModal(null)
      setConfirmationOpen(false)
      setSelectedStock(null)

      await load()
    } catch (err: unknown) {
      setError(
        getApiError(
          err,
          'Imeshindikana kufuta bidhaa. Huenda bidhaa ina rekodi zinazohusiana nayo.'
        )
      )
    } finally {
      setDeleting(false)
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-5">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Boxes size={27} className="text-brand-600" />
            Hamisha Bidhaa Kwenda Duka
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Angalia inventory, punguza stock, futa bidhaa na hamisha stock kati ya maduka.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || transferring || reducing || deleting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? 'animate-spin' : ''}
          />
          Sasisha
        </button>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle size={17} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 size={17} className="shrink-0 mt-0.5" />
          <span className="flex-1">{success}</span>
          <button type="button" onClick={() => setSuccess('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Jumla ya Bidhaa"
          value={loading ? '...' : totalProducts.toLocaleString()}
          subtitle="Bidhaa tofauti kwenye inventory"
          Icon={Package}
        />

        <StatCard
          title="Jumla ya Stoki"
          value={loading ? '...' : formatQuantity(totalUnits)}
          subtitle="Idadi ya units zilizopo"
          Icon={Boxes}
        />

        <StatCard
          title="Maduka Yenye Stoki"
          value={loading ? '...' : activeStores.toLocaleString()}
          subtitle="Maduka yenye inventory"
          Icon={Store}
        />
      </div>

      {/* STORE FILTER */}

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
          <option value="all">Maduka yote</option>

          {stores.map(store => (
            <option key={store.id} value={store.id}>
              {store.name} — {store.location || '—'}
            </option>
          ))}
        </select>
      </div>

      {/* TABS */}

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

      {/* INVENTORY TAB */}

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

          {/* LOADING */}

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
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Package size={42} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-800">
                Hakuna bidhaa zilizopatikana
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Hakuna stock inayolingana na utafutaji wako.
              </p>
            </div>
          ) : (
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
                <Package size={20} className="text-brand-600" />
              </div>

              <div className="divide-y divide-slate-100">
                {filteredStock.map(stock => {
                  const available = quantityNumber(stock.quantity)

                  return (
                    <div
                      key={stock.id}
                      className="p-4 flex flex-col xl:flex-row xl:items-center gap-3"
                    >
                      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0">
                        <Package size={21} />
                      </div>

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

                      <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2">
                        <div className="text-right mr-2">
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
                          disabled={available <= 0 || stores.length < 2}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ArrowRightLeft size={14} />
                          Hamisha
                        </button>

                        {canManageProducts && (
                          <>
                            <button
                              type="button"
                              onClick={() => openReduce(stock)}
                              disabled={available <= 0}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 disabled:opacity-40"
                            >
                              <MinusCircle size={14} />
                              Punguza
                            </button>

                            <button
                              type="button"
                              onClick={() => openDelete(stock)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100"
                            >
                              <Trash2 size={14} />
                              Futa
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRANSFER HISTORY TAB */}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">
              Historia ya Uhamisho
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Rekodi za bidhaa zilizohamishwa kati ya maduka.
            </p>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              <SkeletonLine className="h-4 w-40" />
              <SkeletonLine className="h-4 w-56" />
            </div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center">
              <History size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-semibold">
                Hakuna historia ya uhamisho
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Uhamisho utakaofanyika utaonekana hapa.
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
                      {movement.created_by_name || 'Haijulikani'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-sm text-slate-800">
                      {formatQuantity(movement.quantity)}
                    </span>
                    <p className="text-[10px] text-slate-400">Units</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          TRANSFER MODAL
      ====================================================== */}

      {activeModal === 'transfer' && selectedStock && (
        <ModalShell onClose={closeModal}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
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
              onClick={closeModal}
              disabled={transferring}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submitTransfer} className="p-4 space-y-3 overflow-y-auto">
            <ProductSummary stock={selectedStock} />

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Kutoka
                </label>
                <div className="px-2.5 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-medium text-slate-700 truncate">
                  {stores.find(
                    store => store.id === transferForm.fromStoreId
                  )?.name || 'Duka la mwanzo'}
                </div>
              </div>

              <div className="pb-2.5 text-brand-600">
                <ArrowRight size={18} />
              </div>

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
                  <option value="">Chagua duka</option>
                  {stores
                    .filter(store => store.id !== transferForm.fromStoreId)
                    .map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

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

            {error && <InlineError message={error} />}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                disabled={transferring}
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50"
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
                <ArrowRightLeft size={15} />
                Endelea
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ======================================================
          REDUCE STOCK MODAL
      ====================================================== */}

      {activeModal === 'reduce' && selectedStock && (
        <ModalShell onClose={closeModal}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Punguza Stock
              </h2>
              <p className="text-xs text-slate-500">
                Punguza kiasi cha bidhaa kwenye duka hili
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              disabled={reducing}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submitReduceStock} className="p-4 space-y-4">
            <ProductSummary stock={selectedStock} />

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Kiasi cha kupunguza
              </label>
              <input
                type="number"
                min="0.000001"
                max={quantityNumber(selectedStock.quantity)}
                step="any"
                required
                autoFocus
                value={reduceForm.quantity}
                onChange={e =>
                  setReduceForm(prev => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
                disabled={reducing}
                placeholder="Ingiza kiasi"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-amber-100"
              />
              <p className="text-xs text-slate-400 mt-1">
                Kiasi cha juu unachoweza kupunguza ni{' '}
                {formatQuantity(selectedStock.quantity)}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Sababu ya kupunguza
              </label>
              <textarea
                rows={3}
                required
                value={reduceForm.reason}
                onChange={e =>
                  setReduceForm(prev => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                disabled={reducing}
                placeholder="Mfano: Bidhaa imeharibika, imepotea au marekebisho ya stock..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm resize-none outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>

            {error && <InlineError message={error} />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={reducing}
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50"
              >
                Ghairi
              </button>
              <button
                type="submit"
                disabled={reducing || !reduceForm.quantity || !reduceForm.reason.trim()}
                className="flex-1 px-3 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {reducing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Inapunguza...
                  </>
                ) : (
                  <>
                    <MinusCircle size={15} />
                    Punguza Stock
                  </>
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ======================================================
          DELETE PRODUCT CONFIRMATION MODAL
      ====================================================== */}

      {activeModal === 'delete' && selectedStock && (
        <ModalShell onClose={closeModal}>
          <div className="p-5 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 grid place-items-center mx-auto mb-4">
              <Trash2 size={25} />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Futa Bidhaa Kabisa?
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              Unakaribia kufuta bidhaa hii kwenye mfumo:
            </p>

            <div className="mt-4 p-3 rounded-xl border border-red-100 bg-red-50 text-left">
              <p className="font-semibold text-sm text-slate-900">
                {selectedStock.product_name}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Duka: {selectedStock.store_name}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Stock inayoonekana: {formatQuantity(selectedStock.quantity)}
              </p>
              <p className="text-xs text-red-700 mt-2 font-medium">
                Tahadhari: Kufuta bidhaa kunaweza kuathiri rekodi zinazohusiana nayo.
              </p>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Kitendo hiki hakiwezi kurejeshwa kirahisi. Hakikisha umechagua bidhaa sahihi.
            </p>

            {error && <div className="mt-3"><InlineError message={error} /></div>}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={closeModal}
                disabled={deleting}
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={() => setConfirmationOpen(true)}
                disabled={deleting}
                className="flex-1 px-3 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Endelea
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ======================================================
          FINAL CONFIRMATION MODAL
      ====================================================== */}

      {confirmationOpen && selectedStock && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 grid place-items-center mx-auto mb-3">
              <ShieldAlert size={24} />
            </div>

            <h3 className="text-center font-bold text-slate-900">
              Thibitisha Kufuta
            </h3>

            <p className="text-sm text-center text-slate-500 mt-2">
              Una uhakika unataka kufuta kabisa{' '}
              <strong className="text-slate-800">
                {selectedStock.product_name}
              </strong>
              ?
            </p>

            {activeModal === 'transfer' && (
              <p className="text-xs text-center text-slate-500 mt-2">
                Unahamisha {formatQuantity(transferForm.quantity)} kutoka{' '}
                {stores.find(s => s.id === transferForm.fromStoreId)?.name || '—'} kwenda{' '}
                {stores.find(s => s.id === transferForm.toStoreId)?.name || '—'}.
              </p>
            )}

            {activeModal === 'delete' && (
              <p className="text-xs text-center text-red-600 mt-2">
                Bidhaa itafutwa kwenye database.
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setConfirmationOpen(false)}
                disabled={transferring || deleting}
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50"
              >
                Rudi
              </button>

              {activeModal === 'transfer' ? (
                <button
                  type="button"
                  onClick={() => void confirmTransfer()}
                  disabled={transferring}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {transferring ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Inahamisha...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft size={15} />
                      Thibitisha
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void confirmDeleteProduct()}
                  disabled={deleting}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Inafuta...
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      Futa Kabisa
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// MODAL SHELL
// ============================================================

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-3"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  )
}

// ============================================================
// PRODUCT SUMMARY
// ============================================================

function ProductSummary({ stock }: { stock: StockLevel }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
      <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center shrink-0">
        <Package size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900 truncate">
          {stock.product_name}
        </p>
        <p className="text-xs text-slate-500">
          Stock iliyopo:{' '}
          <strong className="text-emerald-700">
            {formatQuantity(stock.quantity)}
          </strong>
        </p>
        <p className="text-xs text-slate-500">
          {stock.store_name}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// INLINE ERROR
// ============================================================

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
      <span>{message}</span>
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