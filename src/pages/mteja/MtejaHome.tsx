import { useState, useEffect, useCallback, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Package, Search,  AlertTriangle, RefreshCw, X,
  ShoppingCart, Plus, Minus, Trash2, ArrowRight,
} from 'lucide-react'
import {
  productsApi,
  type Product,
  type Category,
} from '../../services/products'
import { inventoryApi, type StockLevel } from '../../services/inventory'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

function formatTsh(n: number | string | undefined | null): string {
  if (n == null) return 'TZS 0'
  return `TZS ${Number(n).toLocaleString('en-US')}`
}

export default function MtejaBidhaa() {
  const { user, loading: authLoading } = useAuth()
  const cart = useCart()

  // ✅ Store ya user aliyeingia (kama ipo)
  const storeId = user?.store_id || undefined

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  // ------------------------------------------------------------------
  // ✅ Guard — kama hajaingia, rudisha login
  // ------------------------------------------------------------------
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />
  }

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const loadAll = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError('')
    try {
      const [productsData, categoriesData] = await Promise.all([
        productsApi.list(storeId),
        productsApi.categories().catch(() => []),
      ])
      setProducts(productsData)
      setCategories(categoriesData)

      // ✅ Stock levels — kwa store ya user
      if (storeId) {
        const stockData = await inventoryApi
          .stockLevels({ store: storeId })
          .catch(() => [])
        const map: Record<string, number> = {}
        stockData.forEach((s: StockLevel) => {
          map[s.product] = Number(s.quantity) || 0
        })
        setStockMap(map)
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Imeshindwa kupakua bidhaa')
    } finally {
      setLoading(false)
    }
  }, [user, storeId])

  useEffect(() => {
    if (user) loadAll()
  }, [user, loadAll])

  // ------------------------------------------------------------------
  // Filter
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (!p.is_active) return false
      if (filterCategory && p.category !== filterCategory) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q)
      )
    })
  }, [products, query, filterCategory])

  const getQty = (id: string) =>
    cart.detailed.find((l) => l.id === id)?.wingi || 0

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package size={24} className="text-brand-600" />
            Bidhaa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Angalia bidhaa zote zilizopo na bei
            {user?.full_name && (
              <span className="ml-1 text-slate-400">• {user.full_name}</span>
            )}
          </p>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 self-start"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tafuta bidhaa (jina, SKU)..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
          >
            <option value="">Makundi yote</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
              <div className="w-11 h-11 rounded-xl bg-slate-200" />
              <div className="h-4 w-3/4 mt-3 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 mt-1.5 bg-slate-200 rounded" />
              <div className="h-5 w-1/3 mt-2 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Package size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-900">Hakuna bidhaa</h3>
          <p className="text-sm text-slate-500 mt-1">
            {query ? 'Hakuna matokeo ya utafutaji wako' : 'Bidhaa hazipo bado'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const qty = getQty(p.id)
            const stock = storeId ? stockMap[p.id] ?? 0 : null
            const outOfStock = stock !== null && stock <= 0
            const lowStock =
              stock !== null && stock > 0 && stock <= p.low_stock_alert

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-4 transition ${
                  outOfStock
                    ? 'border-slate-200 opacity-60'
                    : 'border-slate-200 hover:border-brand-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
                    <Package size={20} />
                  </div>
                  {stock !== null && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                        outOfStock
                          ? 'bg-red-50 text-red-700'
                          : lowStock
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {outOfStock
                        ? 'Zimeisha'
                        : lowStock
                        ? `Chini (${stock})`
                        : `${stock} stoki`}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    SKU: {p.sku}
                    {p.category_name && ` • ${p.category_name}`}
                  </div>
                </div>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-brand-700">
                    {formatTsh(p.selling_price)}
                  </span>
                  <span className="text-xs text-slate-500">
                    / {p.unit_name || 'kipimo'}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {qty === 0 ? (
                    <button
                      onClick={() =>
                        cart.add({
                          id: p.id,
                          jina: p.name,
                          bei: Number(p.selling_price),
                          uom: p.unit_name || 'pcs',
                          iconKey: p.category_name || 'default',
                          pichaUrl: undefined,
                        })
                      }
                      disabled={outOfStock}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart size={14} />
                      Ongeza
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-between gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200">
                      <button
                        onClick={() => cart.dec(p.id)}
                        className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 grid place-items-center border border-slate-200"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold">{qty}</span>
                      <button
                        onClick={() => cart.inc(p.id)}
                        className="w-7 h-7 rounded-md bg-brand-600 text-white hover:bg-brand-700 grid place-items-center"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => cart.remove(p.id)}
                        className="w-7 h-7 rounded-md text-red-600 hover:bg-red-50 grid place-items-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating cart */}
      {cart.count > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md">
          <div className="bg-brand-600 text-white rounded-xl shadow-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 grid place-items-center">
              <ShoppingCart size={18} />
            </div>
            <div className="flex-1">
              <div className="text-xs opacity-90">{cart.count} bidhaa</div>
              <div className="font-bold">{formatTsh(cart.total)}</div>
            </div>
            <a
              href="/mteja/quotation"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white text-brand-700 text-xs font-semibold hover:bg-slate-100"
            >
              Quotation <ArrowRight size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}