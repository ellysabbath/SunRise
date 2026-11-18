
import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Search, Plus, Minus, ShoppingCart, Check, Banknote, Smartphone,
  Wallet, X, Loader2, AlertTriangle, RefreshCw,
  CheckCircle2, XCircle, Package, Store, CreditCard,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { productsApi, type Product } from '../../services/products'
import { customersApi, type Customer } from '../../services/customers'
import { ordersApi } from '../../services/orders'
import type { Order, PaymentMethod } from '../../services/orders'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { inventoryApi, type StockLevel } from '../../services/inventory'
import { formatTsh } from '../../lib/format'
import {
  SkeletonProductCard,
  SkeletonSelect,
  SkeletonCartItem,
  SkeletonLine,
} from '../../components/Skeleton'

type NjiaMalipo = PaymentMethod | 'deni'

interface CartLine {
  id: string
  wingi: number
}

interface ProductWithStock extends Product {
  stock_quantity: number
  has_stock: boolean
}

interface DeniOrder {
  order: Order
  paid: number
  balance: number
}

export default function MuuzajiPOS() {
  const { user } = useAuth()

  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [store, setStore] = useState<StoreType | null>(null)

  const [loadingData, setLoadingData] = useState(true)
  const [errorData, setErrorData] = useState('')

  const [q, setQ] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [mtejaId, setMtejaId] = useState('')

  const [njiaMalipo, setNjiaMalipo] = useState<NjiaMalipo>('cash')
  const [kumbukumbu, setKumbukumbu] = useState('')
  const [kiasiKilicholipwa, setKiasiKilicholipwa] = useState('')

  const [payOpen, setPayOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Madeni ya wateja
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingDebts, setLoadingDebts] = useState(false)
  const [debtError, setDebtError] = useState('')
  const [showDebts, setShowDebts] = useState(true)

  // Kulipa deni la zamani
  const [debtOrder, setDebtOrder] = useState<Order | null>(null)
  const [debtPayOpen, setDebtPayOpen] = useState(false)
  const [debtAmount, setDebtAmount] = useState('')
  const [debtMethod, setDebtMethod] = useState<PaymentMethod>('cash')
  const [debtReference, setDebtReference] = useState('')
  const [savingDebt, setSavingDebt] = useState(false)

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4500)
  }

  // ================================================================
  // Load data
  // ================================================================
  const loadData = useCallback(async (showRefreshToast = false) => {
    setLoadingData(true)
    setErrorData('')

    try {
      const storeId = user?.store_id

      if (!storeId) {
        setErrorData('Hujapangiwa duka. Wasiliana na mmiliki.')
        return
      }

      const [prods, custs, stores, stocks] = await Promise.all([
        productsApi.list(storeId),
        customersApi.list(),
        storesApi.list(),
        inventoryApi.stockLevels({ store: storeId }),
      ])

      const stockMap = new Map<string, number>()

      stocks.forEach((s: StockLevel) => {
        stockMap.set(s.product, Number(s.quantity) || 0)
      })

      const productsWithStock: ProductWithStock[] = prods
        .filter((p) => p.is_active)
        .map((p) => {
          const stock = stockMap.get(p.id) || 0
          return {
            ...p,
            stock_quantity: stock,
            has_stock: stock > 0,
          }
        })

      setProducts(productsWithStock)
      setCustomers(custs)
      setStore(stores.find((s) => s.id === storeId) || null)

      setMtejaId((previous) => {
        if (previous && custs.some((c) => c.id === previous)) return previous
        return custs[0]?.id || ''
      })

      if (showRefreshToast) notify('Data imesasishwa.')
    } catch (err: any) {
      const msg = err?.response?.data?.detail ||
        'Imeshindikana kupakia bidhaa na wateja.'
      setErrorData(msg)
      if (showRefreshToast) notify(msg, false)
    } finally {
      setLoadingData(false)
    }
  }, [user?.store_id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ================================================================
  // Load orders za mteja aliyechaguliwa
  // ================================================================
  const loadCustomerOrders = useCallback(async () => {
    if (!mtejaId) {
      setOrders([])
      return
    }

    setLoadingDebts(true)
    setDebtError('')

    try {
      const result = await ordersApi.list({
        customer: mtejaId,
        limit: 200,
      })

      setOrders(result)
    } catch (err: any) {
      setDebtError(
        err?.response?.data?.detail ||
        'Imeshindikana kupata madeni ya mteja.'
      )
      setOrders([])
    } finally {
      setLoadingDebts(false)
    }
  }, [mtejaId])

  useEffect(() => {
    loadCustomerOrders()
  }, [loadCustomerOrders])

  // ================================================================
  // Hesabu madeni kwa kutumia malipo yaliyothibitishwa
  // ================================================================
  const debtOrders = useMemo<DeniOrder[]>(() => {
    return orders
      .map((order) => {
        const paid = (order.payments || [])
          .filter((p) => p.status === 'imethibitishwa')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)

        const balance = Math.max(0, Number(order.total) - paid)

        return { order, paid, balance }
      })
      .filter((item) => item.balance > 0.001)
      .sort(
        (a, b) =>
          new Date(a.order.order_date).getTime() -
          new Date(b.order.order_date).getTime()
      )
  }, [orders])

  const jumlaDeni = useMemo(
    () => debtOrders.reduce((sum, item) => sum + item.balance, 0),
    [debtOrders]
  )

  const selectedCustomer = customers.find((c) => c.id === mtejaId)

  // ================================================================
  // Filter products
  // ================================================================
  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()

    return products.filter((product) => {
      if (!product.has_stock) return false
      if (!query) return true

      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)
      )
    })
  }, [products, q])

  const stockStats = useMemo(() => {
    const total = products.length
    const zenye = products.filter((p) => p.has_stock).length
    return { total, zenye, zisizo: total - zenye }
  }, [products])

  // ================================================================
  // Cart helpers
  // ================================================================
  const add = (id: string) => {
    const product = products.find((p) => p.id === id)
    if (!product) return

    setCart((current) => {
      const existing = current.find((item) => item.id === id)

      if (existing) {
        if (existing.wingi + 1 > product.stock_quantity) {
          notify(`Stoki iliyobaki ni ${product.stock_quantity} tu.`, false)
          return current
        }

        return current.map((item) =>
          item.id === id ? { ...item, wingi: item.wingi + 1 } : item
        )
      }

      return [...current, { id, wingi: 1 }]
    })
  }

  const inc = (id: string) => {
    const product = products.find((p) => p.id === id)
    if (!product) return

    setCart((current) =>
      current.map((item) => {
        if (item.id !== id) return item

        if (item.wingi + 1 > product.stock_quantity) {
          notify(`Stoki iliyobaki ni ${product.stock_quantity} tu.`, false)
          return item
        }

        return { ...item, wingi: item.wingi + 1 }
      })
    )
  }

  const dec = (id: string) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, wingi: item.wingi - 1 } : item
        )
        .filter((item) => item.wingi > 0)
    )
  }

  const remove = (id: string) =>
    setCart((current) => current.filter((item) => item.id !== id))

  const clear = () => setCart([])

  // ================================================================
  // Cart lines
  // ================================================================
  const lines = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.id)
        if (!product) return null

        const price = Number(product.selling_price) || 0

        return {
          id: product.id,
          jina: product.name,
          sku: product.sku,
          uom: product.unit_name || '',
          bei: price,
          wingi: item.wingi,
          jumla: price * item.wingi,
          stoki: product.stock_quantity,
          product,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [cart, products])

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.jumla, 0),
    [lines]
  )

  // ================================================================
  // New order payment calculations
  // ================================================================
  const kiasiNum = useMemo(() => {
    const value = Number(kiasiKilicholipwa)
    return Number.isFinite(value) && value >= 0 ? value : 0
  }, [kiasiKilicholipwa])

  const salio = Math.max(0, total - kiasiNum)
  const niMalipoKamilifu = salio <= 0.001

  const funguaMalipo = () => {
    if (cart.length === 0) return

    if (!mtejaId) {
      notify('Chagua mteja kwanza.', false)
      return
    }

    setKumbukumbu('')
    setNjiaMalipo('cash')
    setKiasiKilicholipwa(total.toString())
    setPayOpen(true)
  }

  // ================================================================
  // Complete new order
  // ================================================================
  const kamilisha = async () => {
    if (cart.length === 0 || !mtejaId) return

    if (kiasiNum <= 0 && njiaMalipo !== 'deni') {
      notify('Weka kiasi kilicholipwa au chagua deni lote.', false)
      return
    }

    if (kiasiNum > total) {
      notify(`Kiasi hakiwezi kuzidi ${formatTsh(total)}.`, false)
      return
    }

    if (
      kiasiNum > 0 &&
      ['mpesa', 'tigopesa'].includes(njiaMalipo) &&
      !kumbukumbu.trim()
    ) {
      notify('Weka kumbukumbu ya malipo.', false)
      return
    }

    const storeId = user?.store_id
    if (!storeId) {
      notify('Hujapangiwa duka.', false)
      return
    }

    setSaving(true)

    try {
      const order = await ordersApi.create({
        customer_id: mtejaId,
        store_id: storeId,
        items: lines.map((line) => ({
          product_id: line.id,
          quantity: line.wingi,
          unit_price: Number(line.product.selling_price) || line.bei,
          unit_cost: Number(line.product.cost_price) || 0,
        })),
      })

      if (kiasiNum > 0) {
        if (njiaMalipo === 'cash') {
          const payment = await ordersApi.addPayment(order.id, {
            method: 'cash',
            amount: kiasiNum,
            reference: 'CASH',
          })

          await ordersApi.confirmPayment(order.id, payment.id)
        } else if (
          njiaMalipo === 'mpesa' ||
          njiaMalipo === 'tigopesa'
        ) {
          await ordersApi.addPayment(order.id, {
            method: njiaMalipo,
            amount: kiasiNum,
            reference: kumbukumbu.trim().toUpperCase(),
          })
        }
      }

      const shortId = order.id.slice(0, 8)

      if (niMalipoKamilifu) {
        notify(`Order #${shortId} imelipwa kikamilifu.`)
      } else {
        notify(
          `Order #${shortId} imerekodiwa. Salio la deni: ${formatTsh(salio)}.`
        )
      }

      setCart([])
      setKumbukumbu('')
      setKiasiKilicholipwa('')
      setPayOpen(false)

      await Promise.all([loadData(false), loadCustomerOrders()])
    } catch (err: any) {
      notify(
        err?.response?.data?.detail ||
        'Imeshindikana kukamilisha order.',
        false
      )
    } finally {
      setSaving(false)
    }
  }

  // ================================================================
  // Open old debt payment modal
  // ================================================================
  const funguaMalipoDeni = (item: DeniOrder) => {
    setDebtOrder(item.order)
    setDebtAmount(item.balance.toString())
    setDebtMethod('cash')
    setDebtReference('')
    setDebtPayOpen(true)
  }

  // ================================================================
  // Pay existing debt
  // ================================================================
  const lipaDeni = async () => {
    if (!debtOrder) return

    const amount = Number(debtAmount)
    const item = debtOrders.find((x) => x.order.id === debtOrder.id)

    if (!item) {
      notify('Deni hili halipo tena. Sasisha taarifa.', false)
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      notify('Weka kiasi sahihi cha malipo.', false)
      return
    }

    if (amount > item.balance + 0.001) {
      notify(
        `Kiasi hakiwezi kuzidi deni la ${formatTsh(item.balance)}.`,
        false
      )
      return
    }

    if (
      ['mpesa', 'tigopesa', 'airtel', 'halopesa'].includes(debtMethod) &&
      !debtReference.trim()
    ) {
      notify('Weka kumbukumbu ya malipo.', false)
      return
    }

    setSavingDebt(true)

    try {
      const payment = await ordersApi.addPayment(debtOrder.id, {
        method: debtMethod,
        amount,
        reference:
          debtMethod === 'cash'
            ? 'CASH'
            : debtReference.trim().toUpperCase(),
      })

      if (debtMethod === 'cash') {
        await ordersApi.confirmPayment(debtOrder.id, payment.id)
        notify(`Malipo ya ${formatTsh(amount)} yamethibitishwa.`)
      } else {
        notify(
          `Malipo ya ${formatTsh(amount)} yamepokelewa, yanasubiri uthibitisho.`
        )
      }

      setDebtPayOpen(false)
      setDebtOrder(null)
      setDebtAmount('')
      setDebtReference('')

      await loadCustomerOrders()
    } catch (err: any) {
      notify(
        err?.response?.data?.detail ||
        'Imeshindikana kurekodi malipo ya deni.',
        false
      )
    } finally {
      setSavingDebt(false)
    }
  }

  // ================================================================
  // Render
  // ================================================================
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      {/* ================= PRODUCTS ================= */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              POS
            </h1>

            <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>{user?.full_name || 'Muuzaji'}</span>
              <span className="text-slate-300">|</span>

              {loadingData ? (
                <SkeletonLine className="h-4 w-32" />
              ) : store ? (
                <span className="inline-flex items-center gap-1 text-brand-700 font-medium">
                  <Store size={14} />
                  {store.name}
                  <span className="text-slate-400 font-normal">
                    ({store.location})
                  </span>
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
            onClick={() => {
              loadData(true)
              loadCustomerOrders()
            }}
            disabled={loadingData}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
            {loadingData ? 'Inasasisha...' : 'Sasisha'}
          </button>
        </div>

        {/* Stats */}
        {!loadingData && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Bidhaa Zote</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {stockStats.total}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Zenye Stoki</div>
              <div className="text-lg font-bold text-emerald-700 mt-0.5">
                {stockStats.zenye}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Hazina Stoki</div>
              <div className="text-lg font-bold text-red-600 mt-0.5">
                {stockStats.zisizo}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Scan barcode au tafuta bidhaa..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        {/* Error */}
        {errorData && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1">{errorData}</div>
            <button
              onClick={() => loadData(true)}
              disabled={loadingData}
              className="text-xs font-semibold underline"
            >
              Jaribu tena
            </button>
          </div>
        )}

        {/* Products */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {loadingData ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonProductCard key={i} />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Package size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-semibold">
                {q
                  ? 'Hakuna bidhaa inayolingana'
                  : stockStats.total === 0
                    ? 'Hakuna bidhaa kwenye duka lako'
                    : 'Hakuna bidhaa zenye stoki'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {q
                  ? 'Badilisha neno la utafutaji.'
                  : 'Bidhaa hazipo kwenye stoki. Wasiliana na mmiliki.'}
              </p>
            </div>
          ) : (
            filtered.map((product) => {
              const count = cart.find((x) => x.id === product.id)?.wingi ?? 0

              return (
                <button
                  key={product.id}
                  onClick={() => add(product.id)}
                  className={`bg-white rounded-2xl border p-4 text-left transition ${
                    count > 0
                      ? 'border-brand-500 ring-2 ring-brand-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center text-slate-600">
                      <Package size={20} />
                    </div>

                    {count > 0 && (
                      <span className="min-w-6 h-6 px-1.5 rounded-full bg-brand-600 text-white text-xs font-bold grid place-items-center">
                        ×{count}
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-sm mt-3 truncate">
                    {product.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {product.sku}
                  </div>
                  <div className="text-brand-700 font-bold mt-2 text-lg">
                    {formatTsh(product.selling_price)}
                  </div>

                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-slate-500">
                      {product.unit_name || 'pcs'}
                    </span>
                    <span className="font-semibold text-emerald-600">
                      Stoki: {product.stock_quantity}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ================= CART ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingCart size={18} className="text-brand-600" />
            Cart
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {cart.length}
            </span>
          </h2>

          {cart.length > 0 && (
            <button
              onClick={clear}
              className="text-xs text-red-600 hover:underline"
            >
              Futa Zote
            </button>
          )}
        </div>

        {/* Customer */}
        <div className="mb-3">
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Mteja
          </label>

          {loadingData ? (
            <SkeletonSelect />
          ) : customers.length === 0 ? (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
              Hakuna wateja. Ongeza mteja kwanza.
            </div>
          ) : (
            <select
              value={mtejaId}
              onChange={(e) => setMtejaId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name} — {customer.phone}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ================= CUSTOMER DEBT SUMMARY ================= */}
        {mtejaId && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-900">
                <Wallet size={17} />
                <span className="text-sm font-semibold">Deni la mteja</span>
              </div>

              <button
                onClick={() => setShowDebts((value) => !value)}
                className="text-xs font-semibold text-amber-800 underline"
              >
                {showDebts ? 'Ficha' : 'Onyesha'}
              </button>
            </div>

            <div className="text-2xl font-bold text-amber-900 mt-2">
              {loadingDebts ? 'Inapakia...' : formatTsh(jumlaDeni)}
            </div>

            <div className="text-xs text-amber-800 mt-1">
              {selectedCustomer?.full_name || 'Mteja'} · Oda zenye deni: {debtOrders.length}
            </div>

            {debtError && (
              <div className="text-xs text-red-700 mt-2">{debtError}</div>
            )}

            {showDebts && (
              <div className="mt-3 space-y-2">
                {loadingDebts ? (
                  <div className="text-xs text-amber-800">Inatafuta madeni...</div>
                ) : debtOrders.length === 0 ? (
                  <div className="text-xs text-emerald-700 bg-white rounded-lg p-2">
                    <CheckCircle2 size={14} className="inline mr-1" />
                    Mteja hana deni la zamani.
                  </div>
                ) : (
                  debtOrders.map((item) => (
                    <div
                      key={item.order.id}
                      className="bg-white rounded-lg border border-amber-100 p-2.5"
                    >
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800">
                            Order #{item.order.id.slice(0, 8)}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(item.order.order_date).toLocaleDateString('sw-TZ')}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-red-600">
                            {formatTsh(item.balance)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Salio
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 mt-2">
                        <span>Jumla: {formatTsh(Number(item.order.total))}</span>
                        <span>Imelipwa: {formatTsh(item.paid)}</span>
                      </div>

                      <button
                        onClick={() => funguaMalipoDeni(item)}
                        className="w-full mt-2 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <CreditCard size={14} />
                        Lipa deni hili
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Cart lines */}
        <div className="flex-1 overflow-auto divide-y divide-slate-100 min-h-[120px]">
          {loadingData ? (
            Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCartItem key={i} />
            ))
          ) : lines.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingCart size={40} className="mx-auto text-slate-300 mb-2" />
              <div className="text-sm text-slate-500">Cart ni tupu</div>
              <div className="text-xs text-slate-400 mt-1">
                Ongeza bidhaa kuanza
              </div>
            </div>
          ) : (
            lines.map((line) => (
              <div key={line.id} className="py-3">
                <div className="flex justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {line.jina}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatTsh(line.bei)} / {line.uom || 'pcs'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Stoki: {line.stoki}
                    </div>
                  </div>

                  <div className="text-sm font-semibold whitespace-nowrap">
                    {formatTsh(line.jumla)}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => dec(line.id)}
                    className="w-7 h-7 rounded-lg bg-slate-100 grid place-items-center"
                  >
                    <Minus size={12} />
                  </button>

                  <span className="text-sm font-bold w-8 text-center">
                    {line.wingi}
                  </span>

                  <button
                    onClick={() => inc(line.id)}
                    className="w-7 h-7 rounded-lg bg-brand-600 text-white grid place-items-center"
                  >
                    <Plus size={12} />
                  </button>

                  <button
                    onClick={() => remove(line.id)}
                    className="ml-auto p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart footer */}
        {lines.length > 0 && (
          <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-600">Jumla</span>
              <span className="text-2xl font-bold text-slate-900">
                {formatTsh(total)}
              </span>
            </div>

            <button
              onClick={funguaMalipo}
              disabled={cart.length === 0 || loadingData}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Kamilisha Malipo
            </button>
          </div>
        )}
      </div>

      {/* ================= NEW ORDER PAYMENT MODAL ================= */}
      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setPayOpen(false)}
          />

          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-semibold">Kamilisha Malipo</div>
                <div className="text-xs text-slate-500">
                  Jumla: {formatTsh(total)}
                </div>
              </div>

              <button
                onClick={() => !saving && setPayOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>Jumla ya Order</span>
                  <span className="font-bold">{formatTsh(total)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Kiasi Kilicholipwa</span>
                  <span className="font-bold text-emerald-700">
                    {formatTsh(kiasiNum)}
                  </span>
                </div>

                <div className="flex justify-between text-sm border-t pt-1.5">
                  <span>Salio (Deni)</span>
                  <span className="font-bold text-red-600">
                    {formatTsh(salio)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Kiasi Kilicholipwa
                </label>

                <input
                  type="number"
                  min="0"
                  max={total}
                  value={kiasiKilicholipwa}
                  onChange={(e) => setKiasiKilicholipwa(e.target.value)}
                  disabled={saving || njiaMalipo === 'deni'}
                  placeholder="Weka kiasi"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                />

                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setKiasiKilicholipwa(total.toString())}
                    disabled={saving || njiaMalipo === 'deni'}
                    className="text-[11px] px-2 py-1 rounded bg-slate-100"
                  >
                    Lipa Yote
                  </button>

                  <button
                    type="button"
                    onClick={() => setKiasiKilicholipwa((total / 2).toString())}
                    disabled={saving || njiaMalipo === 'deni'}
                    className="text-[11px] px-2 py-1 rounded bg-slate-100"
                  >
                    Nusu
                  </button>

                  <button
                    type="button"
                    onClick={() => setKiasiKilicholipwa('0')}
                    disabled={saving || njiaMalipo === 'deni'}
                    className="text-[11px] px-2 py-1 rounded bg-slate-100"
                  >
                    Sifuri
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Njia ya Malipo
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'cash', label: 'Cash', Icon: Banknote },
                    { key: 'mpesa', label: 'M-Pesa', Icon: Smartphone },
                    { key: 'tigopesa', label: 'Tigo Pesa', Icon: Smartphone },
                  ] as const).map((method) => (
                    <button
                      key={method.key}
                      onClick={() => setNjiaMalipo(method.key)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs ${
                        njiaMalipo === method.key
                          ? 'bg-brand-50 border-brand-500 text-brand-700'
                          : 'border-slate-200'
                      }`}
                    >
                      <method.Icon size={16} />
                      {method.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setNjiaMalipo('deni')
                    setKiasiKilicholipwa('0')
                  }}
                  className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs ${
                    njiaMalipo === 'deni'
                      ? 'bg-amber-50 border-amber-500 text-amber-700'
                      : 'border-slate-200'
                  }`}
                >
                  <Wallet size={16} />
                  Deni Lote (Hakuna Malipo)
                </button>
              </div>

              {kiasiNum > 0 &&
                (njiaMalipo === 'mpesa' || njiaMalipo === 'tigopesa') && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Kumbukumbu ya Malipo
                    </label>
                    <input
                      value={kumbukumbu}
                      onChange={(e) => setKumbukumbu(e.target.value.toUpperCase())}
                      placeholder="Mfano: QGR7XK2P9L"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                )}

              {salio > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  Salio la {formatTsh(salio)} litabaki kuwa deni la mteja.
                </div>
              )}

              {kiasiNum > 0 &&
                (njiaMalipo === 'mpesa' || njiaMalipo === 'tigopesa') && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                    Malipo yatasubiri uthibitisho.
                  </div>
                )}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => setPayOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 text-sm"
                >
                  Ghairi
                </button>

                <button
                  onClick={kamilisha}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Inakamilisha...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Thibitisha
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= OLD DEBT PAYMENT MODAL ================= */}
      {debtPayOpen && debtOrder && (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !savingDebt && setDebtPayOpen(false)}
          />

          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Lipa Deni la Zamani</h3>
                <p className="text-xs text-slate-500">
                  Order #{debtOrder.id.slice(0, 8)}
                </p>
              </div>

              <button
                onClick={() => !savingDebt && setDebtPayOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="text-xs text-amber-800">Salio la deni</div>
                <div className="text-2xl font-bold text-amber-900">
                  {formatTsh(
                    debtOrders.find((x) => x.order.id === debtOrder.id)?.balance || 0
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Kiasi cha kulipa
                </label>

                <input
                  type="number"
                  min="1"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  disabled={savingDebt}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                />

                <button
                  onClick={() => {
                    const current = debtOrders.find((x) => x.order.id === debtOrder.id)
                    if (current) setDebtAmount(current.balance.toString())
                  }}
                  disabled={savingDebt}
                  className="mt-1 text-xs text-brand-700 font-semibold underline"
                >
                  Lipa deni lote
                </button>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Njia ya Malipo
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { key: 'cash', label: 'Cash', Icon: Banknote },
                    { key: 'mpesa', label: 'M-Pesa', Icon: Smartphone },
                    { key: 'tigopesa', label: 'Tigo Pesa', Icon: Smartphone },
                    { key: 'airtel', label: 'Airtel Money', Icon: Smartphone },
                    { key: 'halopesa', label: 'HaloPesa', Icon: Smartphone },
                    { key: 'bank', label: 'Bank', Icon: Wallet },
                  ] as const).map((method) => (
                    <button
                      key={method.key}
                      onClick={() => setDebtMethod(method.key)}
                      disabled={savingDebt}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs ${
                        debtMethod === method.key
                          ? 'bg-brand-50 border-brand-500 text-brand-700'
                          : 'border-slate-200'
                      }`}
                    >
                      <method.Icon size={16} />
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {debtMethod !== 'cash' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Kumbukumbu / Reference
                  </label>
                  <input
                    value={debtReference}
                    onChange={(e) => setDebtReference(e.target.value.toUpperCase())}
                    placeholder="Weka reference ya malipo"
                    disabled={savingDebt}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Malipo haya yatasubiri uthibitisho.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => setDebtPayOpen(false)}
                  disabled={savingDebt}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 text-sm"
                >
                  Ghairi
                </button>

                <button
                  onClick={lipaDeni}
                  disabled={savingDebt}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {savingDebt ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Inarekodi...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Rekodi Malipo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOAST ================= */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] text-white text-sm px-4 py-3 rounded-xl shadow-2xl max-w-md flex items-center gap-2 ${
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
