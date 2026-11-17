import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  Search, Plus, Minus, ShoppingCart, Check, Package, Store,
  Loader2, AlertTriangle, RefreshCw, X,
} from 'lucide-react'
import {
  productsApi,
  type Product,
  type Category,
} from '../../services/products'
import { inventoryApi, type StockLevel } from '../../services/inventory'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

// ==================================================================
// Format
// ==================================================================
function formatTsh(n: number | string | undefined | null): string {
  if (n == null) return 'TZS 0'
  return `TZS ${Number(n).toLocaleString('en-US')}`
}

// ==================================================================
// Page
// ==================================================================
export default function MtejaBidhaa() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { add, inc, dec, detailed, count, total } = useCart()

  const storeId = user?.store_id || undefined

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  // ------------------------------------------------------------------
  // Guard — kama hajaingia
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

      // ✅ Stock levels kwa store ya user
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
    const query = q.toLowerCase().trim()
    return products.filter((p) => {
      if (!p.is_active) return false
      if (filterCategory && p.category !== filterCategory) return false
      if (!query) return true
      return (
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category_name?.toLowerCase().includes(query)
      )
    })
  }, [products, q, filterCategory])

  const wingi = (id: string) =>
    detailed.find((l) => l.id === id)?.wingi ?? 0

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Bidhaa Zetu
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {products.length} bidhaa zipo sokoni
            {user?.full_name && (
              <span className="ml-1 text-slate-400">• {user.full_name}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {count > 0 && (
            <button
              onClick={() => navigate('/mteja/quotation')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition"
            >
              <ShoppingCart size={16} />
              Cart ({count}) — {formatTsh(total)}
            </button>
          )}
        </div>
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

      {/* Search + Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta bidhaa... (mfano: D12, saruji)"
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm"
          />
        </div>

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterCategory('')}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
                !filterCategory
                  ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              Zote
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterCategory(c.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
                  filterCategory === c.id
                    ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="w-14 h-14 rounded-xl bg-slate-200" />
              <div className="h-4 w-3/4 mt-3 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 mt-1.5 bg-slate-200 rounded" />
              <div className="h-5 w-1/3 mt-2 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {products.length === 0
              ? 'Hakuna bidhaa bado'
              : 'Hakuna bidhaa iliyopatikana'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {products.length === 0
              ? 'Mmiliki bado hajaingiza bidhaa kwenye duka.'
              : `Jaribu "${q}" au badilisha kichujio.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const c = wingi(b.id)
            const inCart = c > 0
            const stock = storeId ? stockMap[b.id] ?? 0 : null
            const outOfStock = stock !== null && stock <= 0
            const lowStock =
              stock !== null && stock > 0 && stock <= b.low_stock_alert

            return (
              <div
                key={b.id}
                className={`bg-white rounded-2xl border p-5 transition ${
                  inCart
                    ? 'border-brand-500 ring-2 ring-brand-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden grid place-items-center text-slate-600 shrink-0">
                    <Package size={22} />
                  </div>
                  {inCart ? (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      <Check size={10} />
                      Cart
                    </span>
                  ) : outOfStock ? (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                      Imeisha
                    </span>
                  ) : lowStock ? (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                      {stock} {b.unit_name || 'pcs'}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3">
                  <div className="font-semibold text-sm">{b.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {b.sku}
                  </div>
                  {b.category_name && (
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Store size={10} /> {b.category_name}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end mt-4">
                  <div>
                    <div className="text-lg font-bold text-brand-700">
                      {formatTsh(b.selling_price)}
                    </div>
                    <div className="text-xs text-slate-500">
                      kwa {b.unit_name || 'kipimo'}
                    </div>
                  </div>

                  {inCart ? (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                      <button
                        onClick={() => dec(b.id)}
                        className="w-7 h-7 rounded-md bg-white border border-slate-200 hover:bg-slate-100 grid place-items-center text-slate-700"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold text-slate-900">
                        {c}
                      </span>
                      <button
                        onClick={() => inc(b.id)}
                        className="w-7 h-7 rounded-md bg-brand-600 hover:bg-brand-700 grid place-items-center text-white"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        add({
                          id: b.id,
                          jina: b.name,
                          bei: Number(b.selling_price),
                          uom: b.unit_name || 'pcs',
                          iconKey: b.category_name || 'default',
                          pichaUrl: undefined,
                          wingi: 1,
                        })
                      }
                      disabled={outOfStock}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                      Ongeza
                    </button>
                  )}
                </div>

                {inCart && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm">
                    <span className="text-slate-500">Jumla ndogo</span>
                    <span className="font-semibold">
                      {formatTsh(Number(b.selling_price) * c)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}