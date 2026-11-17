import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Search, Plus, Minus, ShoppingCart, Check, Banknote, Smartphone,
  Wallet, X, Loader2, AlertTriangle, Receipt, RefreshCw,
  CheckCircle2, XCircle, Package, Store,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { productsApi, type Product } from '../../services/products'
import { customersApi, type Customer } from '../../services/customers'
import { ordersApi } from '../../services/orders'
import { storesApi, type Store as StoreType } from '../../services/stores'
import {
  inventoryApi,
  type StockLevel,
} from '../../services/inventory'
import { formatTsh } from '../../lib/format'
import {
  SkeletonProductCard,
  SkeletonSelect,
  SkeletonCartItem,
  SkeletonLine,
} from '../../components/Skeleton'

type NjiaMalipo = 'cash' | 'mpesa' | 'tigopesa' | 'deni'

interface CartLine {
  id: string
  wingi: number
}

// Product pamoja na stoki yake
interface ProductWithStock extends Product {
  stock_quantity: number
  has_stock: boolean
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
  const [payOpen, setPayOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ==================================================================
  // Load products (za duka + stoki) + customers + store
  // ==================================================================
  const loadData = useCallback(
    async (showRefreshToast = false) => {
      setLoadingData(true)
      setErrorData('')
      try {
        const storeId = user?.store_id || undefined

        if (!storeId) {
          setErrorData(
            'Hujapangiwa duka. Wasiliana na mmiliki ili akupange kwenye duka.'
          )
          setLoadingData(false)
          return
        }

        const [prods, custs, stores, stocks] = await Promise.all([
          productsApi.list(storeId),
          customersApi.list(),
          storesApi.list(),
          inventoryApi.stockLevels({ store: storeId }),
        ])

        // ✅ Unganisha bidhaa na stoki yake kwenye duka
        const stockMap = new Map<string, number>()
        stocks.forEach((s: StockLevel) => {
          stockMap.set(s.product, parseFloat(s.quantity))
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

        // Pata duka la muuzaji — tumia storeId (si user.store_id)
        const myStore = stores.find((s) => s.id === storeId) || null
        setStore(myStore)

        // ✅ Functional update — hakikisha mteja aliyechaguliwa bado yupo
        setMtejaId((prev) => {
          if (prev && custs.some((c) => c.id === prev)) return prev
          return custs.length > 0 ? custs[0].id : ''
        })

        if (showRefreshToast) {
          setToast({ msg: 'Data imesasishwa.', ok: true })
          setTimeout(() => setToast(null), 2500)
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          'Imeshindikana kupakia bidhaa na wateja.'
        setErrorData(msg)
        if (showRefreshToast) {
          setToast({ msg, ok: false })
          setTimeout(() => setToast(null), 4000)
        }
      } finally {
        setLoadingData(false)
      }
    },
    [user?.store_id]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // ==================================================================
  // Filter — onyesha tu bidhaa zenye stoki
  // ==================================================================
  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    return products.filter((b) => {
      if (!b.has_stock) return false
      if (!query) return true
      return (
        b.name.toLowerCase().includes(query) ||
        b.sku.toLowerCase().includes(query)
      )
    })
  }, [products, q])

  // Bidhaa zote (kwa stats)
  const stockStats = useMemo(() => {
    const total = products.length
    const zenye = products.filter((p) => p.has_stock).length
    const zisizo = total - zenye
    return { total, zenye, zisizo }
  }, [products])

  // ==================================================================
  // Cart helpers
  // ==================================================================
  const add = (id: string) => {
    const p = products.find((x) => x.id === id)
    if (!p) return
    if (!p.has_stock) {
      setToast({ msg: 'Bidhaa hii haina stoki.', ok: false })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setCart((c) => {
      const ex = c.find((x) => x.id === id)
      if (ex) {
        // ✅ Angalia kama unaongeza zaidi ya stoki
        if (ex.wingi + 1 > p.stock_quantity) {
          setToast({
            msg: `Stoki iliyobaki ni ${p.stock_quantity} tu.`,
            ok: false,
          })
          setTimeout(() => setToast(null), 3000)
          return c
        }
        return c.map((x) =>
          x.id === id ? { ...x, wingi: x.wingi + 1 } : x
        )
      }
      return [...c, { id, wingi: 1 }]
    })
  }

  const inc = (id: string) => {
    const p = products.find((x) => x.id === id)
    if (!p) return
    setCart((c) =>
      c.map((x) => {
        if (x.id !== id) return x
        if (x.wingi + 1 > p.stock_quantity) {
          setToast({
            msg: `Stoki iliyobaki ni ${p.stock_quantity} tu.`,
            ok: false,
          })
          setTimeout(() => setToast(null), 3000)
          return x
        }
        return { ...x, wingi: x.wingi + 1 }
      })
    )
  }

  const dec = (id: string) =>
    setCart((c) =>
      c
        .map((x) => (x.id === id ? { ...x, wingi: x.wingi - 1 } : x))
        .filter((x) => x.wingi > 0)
    )

  const remove = (id: string) => setCart((c) => c.filter((x) => x.id !== id))
  const clear = () => setCart([])

  // ==================================================================
  // Lines
  // ==================================================================
  const lines = useMemo(() => {
    return cart
      .map((c) => {
        const b = products.find((x) => x.id === c.id)
        if (!b) return null
        const price = parseFloat(b.selling_price)
        return {
          id: b.id,
          jina: b.name,
          sku: b.sku,
          uom: b.unit_name || '',
          bei: price,
          wingi: c.wingi,
          jumla: price * c.wingi,
          stoki: b.stock_quantity,
          product: b,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [cart, products])

  const total = useMemo(() => lines.reduce((s, l) => s + l.jumla, 0), [lines])

  // ==================================================================
  // Fungua modal
  // ==================================================================
  const funguaMalipo = () => {
    if (cart.length === 0) return
    if (!mtejaId) {
      setToast({ msg: 'Chagua mteja kwanza.', ok: false })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setKumbukumbu('')
    setNjiaMalipo('cash')
    setPayOpen(true)
  }

  // ==================================================================
  // Kamilisha order
  // ==================================================================
  const kamilisha = async () => {
    if (cart.length === 0 || !mtejaId) return
    if (
      (njiaMalipo === 'mpesa' || njiaMalipo === 'tigopesa') &&
      !kumbukumbu.trim()
    ) {
      setToast({ msg: 'Weka kumbukumbu ya malipo.', ok: false })
      setTimeout(() => setToast(null), 3000)
      return
    }

    // ✅ Extract storeId ili TypeScript itambue
    const storeId = user?.store_id
    if (!storeId) {
      setToast({ msg: 'Hujapangiwa duka. Wasiliana na mmiliki.', ok: false })
      setTimeout(() => setToast(null), 4000)
      return
    }

    setSaving(true)

    try {
      const order = await ordersApi.create({
        customer_id: mtejaId,
        store_id: storeId,
        items: lines.map((l) => ({
          product_id: l.id,
          quantity: l.wingi,
          unit_price: l.product.selling_price
            ? parseFloat(l.product.selling_price)
            : l.bei,
          unit_cost: l.product.cost_price
            ? parseFloat(l.product.cost_price)
            : 0,
        })),
      })

      if (njiaMalipo === 'cash') {
        const payment = await ordersApi.addPayment(order.id, {
          method: 'cash',
          amount: total,
          reference: 'CASH',
        })
        await ordersApi.confirmPayment(order.id, payment.id)
        setToast({
          msg: `Order #${order.id.slice(0, 8)} imekamilika (Cash).`,
          ok: true,
        })
      } else if (njiaMalipo === 'deni') {
        setToast({
          msg: `Order #${order.id.slice(0, 8)} imeandikwa kama DENI.`,
          ok: true,
        })
      } else {
        await ordersApi.addPayment(order.id, {
          method: njiaMalipo === 'mpesa' ? 'mpesa' : 'tigopesa',
          amount: total,
          reference: kumbukumbu.trim().toUpperCase(),
        })
        setToast({
          msg: `Order #${order.id.slice(0, 8)} inasubiri uthibitisho wa malipo.`,
          ok: true,
        })
      }

      setCart([])
      setKumbukumbu('')
      setPayOpen(false)
      await loadData(false) // ✅ Pata stoki mpya bila toast ya "imesasishwa"
      setTimeout(() => setToast(null), 5000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kukamilisha order.',
        ok: false,
      })
      setTimeout(() => setToast(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      {/* ================= BIDHAA ================= */}
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
            onClick={() => loadData(true)}
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
              className="text-xs font-semibold underline disabled:opacity-50"
            >
              {loadingData ? 'Inajaribu...' : 'Jaribu tena'}
            </button>
          </div>
        )}

        {/* Products grid */}
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
                  : stockStats.total === 0
                  ? 'Mmiliki anahitaji kuongeza bidhaa kwenye duka lako.'
                  : 'Bidhaa zote zimeisha stoki. Wasiliana na mmiliki.'}
              </p>
            </div>
          ) : (
            filtered.map((b) => {
              const c = cart.find((x) => x.id === b.id)?.wingi ?? 0
              return (
                <button
                  key={b.id}
                  onClick={() => add(b.id)}
                  className={`bg-white rounded-2xl border p-4 text-left transition ${
                    c > 0
                      ? 'border-brand-500 ring-2 ring-brand-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center text-slate-600 shrink-0">
                      <Package size={20} />
                    </div>
                    {c > 0 && (
                      <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-brand-600 text-white text-xs font-bold">
                        ×{c}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-sm mt-3 truncate">
                    {b.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{b.sku}</div>
                  <div className="text-brand-700 font-bold mt-2 text-lg">
                    {formatTsh(b.selling_price)}
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-slate-500">
                      {b.unit_name || 'pcs'}
                    </span>
                    <span
                      className={`font-semibold ${
                        b.stock_quantity <= (b.low_stock_alert || 5)
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      Stoki: {b.stock_quantity}
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

        {/* Mteja select */}
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
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm bg-white"
            >
              {customers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name} — {w.phone}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Cart lines */}
        <div className="flex-1 overflow-auto divide-y divide-slate-100 min-h-[120px]">
          {loadingData ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCartItem key={i} />)
          ) : lines.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingCart size={40} className="mx-auto text-slate-300 mb-2" />
              <div className="text-sm text-slate-500">Cart ni tupu</div>
              <div className="text-xs text-slate-400 mt-1">
                Ongeza bidhaa kuanza
              </div>
            </div>
          ) : (
            lines.map((l) => (
              <div key={l.id} className="py-3">
                <div className="flex justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {l.jina}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatTsh(l.bei)} / {l.uom || 'pcs'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Stoki: {l.stoki}
                    </div>
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {formatTsh(l.jumla)}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => dec(l.id)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 grid place-items-center"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-bold w-8 text-center">
                    {l.wingi}
                  </span>
                  <button
                    onClick={() => inc(l.id)}
                    className="w-7 h-7 rounded-lg bg-brand-600 text-white hover:bg-brand-700 grid place-items-center"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => remove(l.id)}
                    className="ml-auto p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
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

      {/* ================= MODAL ================= */}
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
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Njia ya Malipo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'cash', label: 'Cash', Icon: Banknote },
                      { key: 'mpesa', label: 'M-Pesa', Icon: Smartphone },
                      { key: 'tigopesa', label: 'Tigo Pesa', Icon: Smartphone },
                    ] as const
                  ).map((n) => (
                    <button
                      key={n.key}
                      onClick={() => setNjiaMalipo(n.key)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium transition ${
                        njiaMalipo === n.key
                          ? 'bg-brand-50 border-brand-500 text-brand-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <n.Icon size={16} />
                      {n.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setNjiaMalipo('deni')}
                  className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition ${
                    njiaMalipo === 'deni'
                      ? 'bg-amber-50 border-amber-500 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Wallet size={16} />
                  Deni (Malipo baadaye)
                </button>
              </div>

              {(njiaMalipo === 'mpesa' || njiaMalipo === 'tigopesa') && (
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Kumbukumbu ya Malipo{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={kumbukumbu}
                    onChange={(e) =>
                      setKumbukumbu(e.target.value.toUpperCase())
                    }
                    placeholder="Mfano: QGR7XK2P9L"
                    disabled={saving}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm font-mono disabled:bg-slate-50"
                  />
                  <div className="flex items-start gap-1.5 text-xs text-amber-700 mt-1">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    Weka kumbukumbu halisi kutoka SMS ya mtandao.
                  </div>
                </div>
              )}

              {njiaMalipo === 'deni' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  Order itaandikwa kama DENI. Mteja atalipa baadaye.
                </div>
              )}

              {njiaMalipo === 'cash' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <Check size={14} className="mt-0.5 shrink-0" />
                  Malipo ya cash yanathibitishwa mara moja.
                </div>
              )}

              {(njiaMalipo === 'mpesa' || njiaMalipo === 'tigopesa') && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                  <Smartphone size={14} className="mt-0.5 shrink-0" />
                  Malipo yatasubiri uthibitisho wa mmiliki.
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={() => setPayOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200 disabled:opacity-50"
                >
                  Ghairi
                </button>
                <button
                  onClick={kamilisha}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
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

      {/* ================= TOAST ================= */}
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