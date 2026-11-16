import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Receipt, Search, CheckCircle2, Clock, RefreshCw,
  AlertTriangle, X, Phone, Package, CreditCard, Loader2,
  Store, User, Lock, MapPin,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ordersApi } from '../../services/orders'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Types
// ==================================================================
interface OrderItem {
  id: string
  order: string
  product: string
  product_name: string
  quantity: string
  unit_price: string
  unit_cost: string
  subtotal: string
}

interface Payment {
  id: string
  order: string
  method: 'mpesa' | 'tigopesa' | 'airtel' | 'halopesa' | 'cash' | 'bank'
  phone: string
  reference: string
  amount: string
  status: 'inasubiri' | 'imethibitishwa' | 'imekataliwa'
  confirmed_by: string | null
  confirmed_at: string | null
}

interface Order {
  id: string
  customer: string
  customer_name: string
  customer_phone?: string
  store: string
  store_name?: string
  order_date: string
  status: 'inasubiri_malipo' | 'imekamilika' | 'imekataliwa'
  subtotal: string
  discount: string
  total: string
  created_by: string
  created_by_name?: string
  items: OrderItem[]
  payments: Payment[]
}

const METHOD_LABEL: Record<string, string> = {
  mpesa: 'M-Pesa',
  tigopesa: 'Tigo Pesa',
  airtel: 'Airtel',
  halopesa: 'Halo',
  cash: 'Cash',
  bank: 'Benki',
}

// ==================================================================
// Page
// ==================================================================
export default function MuuzajiRisiti() {
  const { user } = useAuth()

  // ================================================================
  // ✅ DUKA HUSIKA + MTU HUSIKA
  // ================================================================
  const storeId = user?.store_id || undefined
  const userId = user?.id || undefined

  const [orders, setOrders] = useState<Order[]>([])
  const [store, setStore] = useState<StoreType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)

  // ------------------------------------------------------------------
  // Load — ✅ inachuja kwa duka husika
  // ------------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    // ✅ Hakikisha mtumiaji ana duka
    if (!storeId) {
      setError('Hujapangiwa duka. Wasiliana na mmiliki.')
      setLoading(false)
      return
    }

    // ✅ Role guard
    if (
      user.role !== 'muuzaji' &&
      user.role !== 'mmiliki' &&
      user.role !== 'admin' &&
      user.role !== 'mhazini'
    ) {
      setError('Huna ruhusa ya kuona risiti.')
      setLoading(false)
      return
    }

    try {
      const [ords, myStore] = await Promise.all([
        ordersApi.list({ store: storeId }),          // ✅ RISITI ZA DUKA HUSIKA
        storesApi.get(storeId),                       // ✅ duka moja
      ])
      setOrders(ords as Order[])
      setStore(myStore)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata risiti. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }, [storeId, user?.role])

  useEffect(() => {
    load()
  }, [load])

  // ------------------------------------------------------------------
  // ✅ Defense in depth: chuja tena
  // ------------------------------------------------------------------
  const myOrders = useMemo(() => {
    if (!storeId) return []
    return orders.filter((o) => !o.store || o.store === storeId)
  }, [orders, storeId])

  // ------------------------------------------------------------------
  // Filter
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return myOrders
    return myOrders.filter(
      (o) =>
        o.id.toLowerCase().includes(query) ||
        (o.customer_name || '').toLowerCase().includes(query) ||
        (o.customer_phone || '').includes(query)
    )
  }, [myOrders, q])

  // ------------------------------------------------------------------
  // Stats — kwa myOrders pekee
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const zote = myOrders.length
    const jumla = myOrders.reduce(
      (s, o) => s + parseFloat(o.total || '0'),
      0
    )

    const cash = myOrders
      .filter((o) =>
        o.payments.some(
          (p) => p.method === 'cash' && p.status === 'imethibitishwa'
        )
      )
      .reduce((s, o) => s + parseFloat(o.total || '0'), 0)

    const deni = myOrders.reduce((s, o) => {
      const confirmed = o.payments
        .filter((p) => p.status === 'imethibitishwa')
        .reduce((a, p) => a + parseFloat(p.amount || '0'), 0)
      return s + Math.max(parseFloat(o.total || '0') - confirmed, 0)
    }, 0)

    return { zote, jumla, cash, deni }
  }, [myOrders])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt size={26} className="text-brand-600" /> Risiti
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
              title="Risiti za duka lako pekee"
            >
              <Lock size={10} /> Duka Lako
            </span>
          </h1>
          <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <User size={12} /> {user?.full_name || 'Muuzaji'}
            </span>
            <span className="text-slate-300">|</span>
            {loading ? (
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
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Sasisha
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat
              label="Risiti Zote"
              value={String(stats.zote)}
              Icon={Receipt}
              tone="text-blue-600"
            />
            <Stat
              label="Jumla ya Mauzo"
              value={formatTsh(stats.jumla)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />
            <Stat
              label="Cash"
              value={formatTsh(stats.cash)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />
            <Stat
              label="Deni"
              value={formatTsh(stats.deni)}
              Icon={Clock}
              tone="text-amber-600"
            />
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tafuta risiti kwa order ID, mteja, au simu..."
          className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={load} className="text-xs font-semibold underline">
            Jaribu tena
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <RisitiSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {q
              ? 'Hakuna matokeo ya utafutaji'
              : 'Hakuna risiti bado kwenye duka lako'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q
              ? 'Badilisha neno la utafutaji.'
              : 'Risiti zitaonekana hapa mara muuzaji akikamilisha mauzo.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((o) => {
            const confirmed = o.payments
              .filter((p) => p.status === 'imethibitishwa')
              .reduce((s, p) => s + parseFloat(p.amount || '0'), 0)
            const baki = parseFloat(o.total || '0') - confirmed

            return (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-500 transition"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${
                        baki > 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {baki > 0 ? (
                        <Clock size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {o.customer_name || 'Mteja'}
                        {o.customer_phone && ` — ${o.customer_phone}`}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>{formatDate(o.order_date)}</span>
                        {o.store_name && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span className="inline-flex items-center gap-1">
                              <Store size={10} />
                              {o.store_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">
                      {formatTsh(o.total)}
                    </div>
                    {baki > 0 ? (
                      <div className="text-xs text-amber-700">
                        Baki: {formatTsh(baki)}
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-700 font-semibold">
                        Imelipwa Yote
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <RisitiDetailModal
          order={selected}
          storeId={storeId}
          onClose={() => setSelected(null)}
        />
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
// Skeletons
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

function RisitiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />
          <div className="min-w-0 space-y-1.5">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-3 w-40" />
            <SkeletonLine className="h-3 w-28" />
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
// Modal — Risiti Detail — ✅ inapokea storeId
// ==================================================================
function RisitiDetailModal({
  order,
  storeId,
  onClose,
}: {
  order: Order
  storeId?: string
  onClose: () => void
}) {
  const confirmed = order.payments
    .filter((p) => p.status === 'imethibitishwa')
    .reduce((s, p) => s + parseFloat(p.amount || '0'), 0)
  const baki = parseFloat(order.total || '0') - confirmed

  // ✅ Ulinzi: risiti lazima iwe ya duka hili
  const isOwned = !order.store || order.store === storeId

  if (!isOwned) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl">
          <AlertTriangle size={40} className="mx-auto text-red-500 mb-3" />
          <h3 className="font-semibold">Risiti Si ya Duka Lako</h3>
          <p className="text-sm text-slate-500 mt-1">
            Huna ruhusa ya kuona risiti hii.
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200"
          >
            Funga
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center z-10">
          <div>
            <div className="font-semibold">
              Risiti #{order.id.slice(0, 8).toUpperCase()}
            </div>
            <div className="text-xs text-slate-500">
              {formatDate(order.order_date)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mteja */}
          <div className="p-3 rounded-lg bg-slate-50">
            <div className="text-xs text-slate-500 mb-1">Mteja</div>
            <div className="font-medium">{order.customer_name || '—'}</div>
            {order.customer_phone && (
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {order.customer_phone}
              </div>
            )}
          </div>

          {/* Duka */}
          {order.store_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Store size={12} /> {order.store_name}
            </div>
          )}
          {order.created_by_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <User size={12} /> {order.created_by_name}
            </div>
          )}

          {/* Bidhaa */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Package size={14} className="text-brand-600" /> Bidhaa (
              {order.items.length})
            </h3>
            <div className="space-y-1.5">
              {order.items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {it.product_name || it.product}
                    </div>
                    <div className="text-xs text-slate-500">
                      {it.quantity} × {formatTsh(it.unit_price)}
                    </div>
                  </div>
                  <div className="font-semibold whitespace-nowrap">
                    {formatTsh(it.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Malipo */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <CreditCard size={14} className="text-brand-600" /> Malipo (
              {order.payments.length})
            </h3>

            {order.payments.length === 0 ? (
              <div className="text-sm text-slate-500 p-3 rounded-lg bg-slate-50 text-center">
                Hakuna malipo bado
              </div>
            ) : (
              <div className="space-y-1.5">
                {order.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg text-sm bg-slate-50 border border-slate-200"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-white ${
                        p.status === 'imethibitishwa'
                          ? 'text-emerald-600'
                          : p.status === 'imekataliwa'
                          ? 'text-red-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {p.status === 'imethibitishwa' ? (
                        <CheckCircle2 size={16} />
                      ) : p.status === 'imekataliwa' ? (
                        <X size={16} />
                      ) : (
                        <Clock size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium uppercase text-xs">
                        {METHOD_LABEL[p.method] || p.method}
                      </div>
                      <div className="text-xs text-slate-600 font-mono truncate">
                        {p.reference || '—'}
                      </div>
                    </div>
                    <div className="font-semibold whitespace-nowrap">
                      {formatTsh(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Jumla */}
            <div className="mt-3 p-3 rounded-lg bg-slate-50 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Jumla</span>
                <span className="font-semibold">{formatTsh(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Iliyolipwa</span>
                <span className="font-semibold text-emerald-700">
                  {formatTsh(confirmed)}
                </span>
              </div>
              {baki > 0 && (
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="font-medium">Baki</span>
                  <span className="font-bold text-amber-700">
                    {formatTsh(baki)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}