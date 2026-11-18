
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
  X,
  Phone,
  Package,
  CreditCard,
  Store,
  User,
  Lock,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { ordersApi } from '../../services/orders'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ================================================================
// TYPES
// ================================================================

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
  airtel: 'Airtel Money',
  halopesa: 'Halo Pesa',
  cash: 'Cash',
  bank: 'Benki',
}

const ALLOWED_ROLES = ['muuzaji', 'mmiliki', 'admin', 'mhazini']

// ================================================================
// PAGE: MUUZAJI RISITI
// ================================================================

export default function MuuzajiRisiti() {
  const { user } = useAuth()

  const storeId = user?.store_id || undefined
  const userRole = user?.role

  const [orders, setOrders] = useState<Order[]>([])
  const [store, setStore] = useState<StoreType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)

  // ==============================================================
  // LOAD RISITI ZA DUKA HUSIKA
  // ==============================================================

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    // Hakikisha mtumiaji ameingia kwenye mfumo
    if (!user) {
      setError('Tafadhali ingia kwenye mfumo kwanza.')
      setLoading(false)
      return
    }

    // Hakikisha mtumiaji ana duka
    if (!storeId) {
      setError('Hujapangiwa duka. Wasiliana na mmiliki.')
      setLoading(false)
      return
    }

    // Hakikisha mtumiaji ana ruhusa
    if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
      setError('Huna ruhusa ya kuona risiti.')
      setLoading(false)
      return
    }

    try {
      const [ords, myStore] = await Promise.all([
        ordersApi.list({ store: storeId }),
        storesApi.get(storeId),
      ])

      setOrders(ords as Order[])
      setStore(myStore)
    } catch (err: unknown) {
      const errorResponse = err as {
        response?: {
          data?: {
            detail?: string
          }
        }
      }

      setError(
        errorResponse.response?.data?.detail ||
          'Imeshindikana kupata risiti. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }, [user, storeId, userRole])

  useEffect(() => {
    void load()
  }, [load])

  // ==============================================================
  // CHUJA RISITI ZA DUKA HUSIKA
  // ==============================================================

  const myOrders = useMemo(() => {
    if (!storeId) return []

    return orders.filter(
      (order) => !order.store || order.store === storeId
    )
  }, [orders, storeId])

  // ==============================================================
  // SEARCH
  // ==============================================================

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()

    if (!query) return myOrders

    return myOrders.filter(
      (order) =>
        order.id.toLowerCase().includes(query) ||
        (order.customer_name || '').toLowerCase().includes(query) ||
        (order.customer_phone || '').includes(query)
    )
  }, [myOrders, q])

  // ==============================================================
  // STATISTICS
  // ==============================================================

  const stats = useMemo(() => {
    const zote = myOrders.length

    const jumla = myOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    )

    const cash = myOrders.reduce((sum, order) => {
      const cashPaid = order.payments
        .filter(
          (payment) =>
            payment.method === 'cash' &&
            payment.status === 'imethibitishwa'
        )
        .reduce(
          (paymentSum, payment) =>
            paymentSum + Number(payment.amount || 0),
          0
        )

      return sum + cashPaid
    }, 0)

    const deni = myOrders.reduce((sum, order) => {
      const confirmed = order.payments
        .filter(
          (payment) => payment.status === 'imethibitishwa'
        )
        .reduce(
          (paymentSum, payment) =>
            paymentSum + Number(payment.amount || 0),
          0
        )

      const baki = Math.max(
        Number(order.total || 0) - confirmed,
        0
      )

      return sum + baki
    }, 0)

    return {
      zote,
      jumla,
      cash,
      deni,
    }
  }, [myOrders])

  // ==============================================================
  // RENDER
  // ==============================================================

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt size={26} className="text-brand-600" />
            Risiti

            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
              title="Risiti za duka lako pekee"
            >
              <Lock size={10} />
              Duka Lako
            </span>
          </h1>

          <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <User size={12} />
              {user?.full_name || 'Muuzaji'}
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
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw
            size={14}
            className={loading ? 'animate-spin' : ''}
          />
          Sasisha
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <StatSkeleton key={index} />
          ))
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
              label="Cash Iliyolipwa"
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

      {/* SEARCH */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Tafuta risiti kwa order ID, mteja, au simu..."
          className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">{error}</div>

          <button
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
          {Array.from({ length: 5 }).map((_, index) => (
            <RisitiSkeleton key={index} />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Receipt
            size={40}
            className="mx-auto text-slate-300 mb-3"
          />

          <h3 className="font-semibold">
            {q
              ? 'Hakuna matokeo ya utafutaji'
              : 'Hakuna risiti bado kwenye duka lako'}
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            {q
              ? 'Badilisha neno la utafutaji.'
              : 'Risiti zitaonekana hapa mara mauzo yanapowekwa.'}
          </p>
        </div>
      )}

      {/* RECEIPTS LIST */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((order) => {
            const confirmed = order.payments
              .filter(
                (payment) =>
                  payment.status === 'imethibitishwa'
              )
              .reduce(
                (sum, payment) =>
                  sum + Number(payment.amount || 0),
                0
              )

            const baki =
              Number(order.total || 0) - confirmed

            return (
              <button
                key={order.id}
                onClick={() => setSelected(order)}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-500 transition"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">

                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${
                        baki > 0
                          ? 'text-amber-600'
                          : 'text-emerald-600'
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
                        #{order.id.slice(0, 8).toUpperCase()}
                      </div>

                      <div className="text-xs text-slate-500 truncate">
                        {order.customer_name || 'Mteja'}

                        {order.customer_phone &&
                          ` — ${order.customer_phone}`}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>
                          {formatDate(order.order_date)}
                        </span>

                        {order.store_name && (
                          <>
                            <span className="text-slate-300">
                              |
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <Store size={10} />
                              {order.store_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">
                      {formatTsh(order.total)}
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

      {/* RECEIPT DETAILS MODAL */}
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

// ================================================================
// STAT COMPONENT
// ================================================================

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

// ================================================================
// STAT SKELETON
// ================================================================

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />

      <SkeletonLine className="h-3 w-20 mt-3" />
      <SkeletonLine className="h-5 w-24 mt-2" />
    </div>
  )
}

// ================================================================
// RECEIPT SKELETON
// ================================================================

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

// ================================================================
// RECEIPT DETAILS MODAL
// ================================================================

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
    .filter(
      (payment) => payment.status === 'imethibitishwa'
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    )

  const baki = Number(order.total || 0) - confirmed

  // Hakikisha risiti ni ya duka husika
  const isOwned =
    Boolean(storeId) &&
    Boolean(order.store) &&
    order.store === storeId

  if (!isOwned) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />

        <div className="relative bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl">
          <AlertTriangle
            size={40}
            className="mx-auto text-red-500 mb-3"
          />

          <h3 className="font-semibold">
            Risiti Si ya Duka Lako
          </h3>

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
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* MODAL HEADER */}
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
            aria-label="Funga risiti"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">

          {/* CUSTOMER */}
          <div className="p-3 rounded-lg bg-slate-50">
            <div className="text-xs text-slate-500 mb-1">
              Mteja
            </div>

            <div className="font-medium">
              {order.customer_name || '—'}
            </div>

            {order.customer_phone && (
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} />
                {order.customer_phone}
              </div>
            )}
          </div>

          {/* STORE */}
          {order.store_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Store size={12} />
              {order.store_name}
            </div>
          )}

          {/* SELLER */}
          {order.created_by_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <User size={12} />
              {order.created_by_name}
            </div>
          )}

          {/* PRODUCTS */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Package
                size={14}
                className="text-brand-600"
              />
              Bidhaa ({order.items.length})
            </h3>

            {order.items.length === 0 ? (
              <div className="text-sm text-slate-500 p-3 rounded-lg bg-slate-50 text-center">
                Hakuna bidhaa kwenye risiti hii.
              </div>
            ) : (
              <div className="space-y-1.5">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {item.product_name || item.product}
                      </div>

                      <div className="text-xs text-slate-500">
                        {item.quantity} × {formatTsh(item.unit_price)}
                      </div>
                    </div>

                    <div className="font-semibold whitespace-nowrap">
                      {formatTsh(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PAYMENTS */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <CreditCard
                size={14}
                className="text-brand-600"
              />
              Malipo ({order.payments.length})
            </h3>

            {order.payments.length === 0 ? (
              <div className="text-sm text-slate-500 p-3 rounded-lg bg-slate-50 text-center">
                Hakuna malipo bado
              </div>
            ) : (
              <div className="space-y-1.5">
                {order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg text-sm bg-slate-50 border border-slate-200"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-white ${
                        payment.status === 'imethibitishwa'
                          ? 'text-emerald-600'
                          : payment.status === 'imekataliwa'
                            ? 'text-red-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {payment.status === 'imethibitishwa' ? (
                        <CheckCircle2 size={16} />
                      ) : payment.status === 'imekataliwa' ? (
                        <X size={16} />
                      ) : (
                        <Clock size={16} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium uppercase text-xs">
                        {METHOD_LABEL[payment.method] || payment.method}
                      </div>

                      <div className="text-xs text-slate-600 font-mono truncate">
                        {payment.reference || '—'}
                      </div>

                      <div className="text-[10px] text-slate-500">
                        {payment.status === 'imethibitishwa'
                          ? 'Imethibitishwa'
                          : payment.status === 'imekataliwa'
                            ? 'Imekataliwa'
                            : 'Inasubiri'}
                      </div>
                    </div>

                    <div className="font-semibold whitespace-nowrap">
                      {formatTsh(payment.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TOTALS */}
            <div className="mt-3 p-3 rounded-lg bg-slate-50 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Jumla</span>

                <span className="font-semibold">
                  {formatTsh(order.total)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Iliyolipwa</span>

                <span className="font-semibold text-emerald-700">
                  {formatTsh(confirmed)}
                </span>
              </div>

              {baki > 0 && (
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="font-medium">
                    Baki
                  </span>

                  <span className="font-bold text-amber-700">
                    {formatTsh(baki)}
                  </span>
                </div>
              )}

              {baki <= 0 && (
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="font-medium text-emerald-700">
                    Hali ya malipo
                  </span>

                  <span className="font-bold text-emerald-700">
                    Imelipwa yote
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
