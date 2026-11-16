import { useEffect, useMemo, useState } from 'react'
import {
  ShoppingBag, Search, Filter, CheckCircle2, Clock, XCircle,
  X, Package, Phone, CreditCard, AlertTriangle, Loader2, Check, Ban,
  RefreshCw,
} from 'lucide-react'
import {
  ordersApi,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from '../../services/orders'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
const HALI_META: Record<
  OrderStatus,
  { label: string; tone: string; Icon: React.ElementType }
> = {
  inasubiri_malipo: {
    label: 'Inasubiri Malipo',
    tone: 'text-amber-700',
    Icon: Clock,
  },
  imekamilika: {
    label: 'Imekamilika',
    tone: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  imekataliwa: {
    label: 'Imekataliwa',
    tone: 'text-red-700',
    Icon: XCircle,
  },
}

const MALIPO_HALI_META: Record<
  PaymentStatus,
  { label: string; tone: string; bg: string; border: string; Icon: React.ElementType }
> = {
  inasubiri: {
    label: 'Inasubiri Uthibitisho',
    tone: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    Icon: Clock,
  },
  imethibitishwa: {
    label: 'Imethibitishwa',
    tone: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    Icon: CheckCircle2,
  },
  imekataliwa: {
    label: 'Imekataliwa',
    tone: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    Icon: XCircle,
  },
}

const METHOD_LABEL: Record<string, string> = {
  mpesa: 'M-Pesa',
  tigopesa: 'Tigo Pesa',
  airtel: 'Airtel Money',
  halopesa: 'Halo Pesa',
  cash: 'Cash',
  bank: 'Benki',
}

// ==================================================================
// Page
// ==================================================================
export default function MmilikiOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<OrderStatus | 'zote'>('zote')
  const [selected, setSelected] = useState<Order | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await ordersApi.list()
      setOrders(data)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata orders. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Auto-refresh kila sekunde 30
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ------------------------------------------------------------------
  // Filter + search
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    return orders.filter((o) => {
      if (filter !== 'zote' && o.status !== filter) return false
      if (!query) return true
      return (
        o.id.toLowerCase().includes(query) ||
        (o.customer_name || '').toLowerCase().includes(query) ||
        o.customer.toLowerCase().includes(query)
      )
    })
  }, [orders, q, filter])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const zote = orders.length
    const zinazosubiri = orders.filter(
      (o) => o.status === 'inasubiri_malipo'
    ).length
    const zilizokamilika = orders.filter(
      (o) => o.status === 'imekamilika'
    ).length
    const jumlaMapato = orders
      .filter((o) => o.status === 'imekamilika')
      .reduce((s, o) => s + parseFloat(o.total || '0'), 0)
    const jumlaInayosubiri = orders
      .filter((o) => o.status === 'inasubiri_malipo')
      .reduce((s, o) => s + parseFloat(o.total || '0'), 0)
    const malipoYanasubiri = orders.reduce(
      (s, o) => s + o.payments.filter((p) => p.status === 'inasubiri').length,
      0
    )
    return {
      zote,
      zinazosubiri,
      zilizokamilika,
      jumlaMapato,
      jumlaInayosubiri,
      malipoYanasubiri,
    }
  }, [orders])

  // ------------------------------------------------------------------
  // Thibitisha malipo
  // ------------------------------------------------------------------
  const handleThibitisha = async (orderId: string, paymentId: string) => {
    setProcessing(paymentId)
    try {
      const updatedOrder = await ordersApi.confirmPayment(orderId, paymentId)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updatedOrder : o))
      )
      setSelected((prev) => (prev && prev.id === orderId ? updatedOrder : prev))
      setToast({
        msg: 'Malipo yamethibitishwa.',
        ok: true,
      })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kuthibitisha.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Kataa malipo
  // ------------------------------------------------------------------
  const handleKataa = async (orderId: string, paymentId: string) => {
    if (!confirm('Una uhakika unataka kukataa malipo haya?')) return
    setProcessing(paymentId)
    try {
      await ordersApi.rejectPayment(orderId, paymentId)
      await load()
      setToast({ msg: 'Malipo yamekataliwa.', ok: false })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kukataa.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setProcessing(null)
    }
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
            <ShoppingBag size={26} className="text-brand-600" />
            Orders Zote
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Simamia orders na uthibitishe malipo ya mobile
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 self-start sm:self-auto"
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
              label="Orders Zote"
              value={String(stats.zote)}
              Icon={ShoppingBag}
              tone="text-blue-600"
            />
            <Stat
              label="Zinasubiri"
              value={String(stats.zinazosubiri)}
              Icon={Clock}
              tone="text-amber-600"
              sub={formatTsh(stats.jumlaInayosubiri)}
            />
            <Stat
              label="Zilizokamilika"
              value={String(stats.zilizokamilika)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />
            <Stat
              label="Malipo Yanasubiri"
              value={String(stats.malipoYanasubiri)}
              Icon={CreditCard}
              tone={stats.malipoYanasubiri > 0 ? 'text-amber-600' : 'text-slate-500'}
            />
          </>
        )}
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

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta kwa order ID, mteja, au simu..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={14} className="text-slate-400" />
          {(['zote', 'inasubiri_malipo', 'imekamilika', 'imekataliwa'] as const).map(
            (k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                  filter === k
                    ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {k === 'zote' ? 'Zote' : HALI_META[k].label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Loading — skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <OrderSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ShoppingBag size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {q || filter !== 'zote' ? 'Hakuna matokeo' : 'Hakuna orders bado'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q || filter !== 'zote'
              ? 'Badilisha kichujio au utafutaji.'
              : 'Orders zitaonekana hapa mara mteja akianzisha.'}
          </p>
        </div>
      )}

      {/* Orders list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((o) => {
            const meta = HALI_META[o.status]
            const jumlaIlipwa = o.payments
              .filter((p) => p.status === 'imethibitishwa')
              .reduce((s, p) => s + parseFloat(p.amount || '0'), 0)
            const baki = parseFloat(o.total || '0') - jumlaIlipwa
            const malipoYanasubiri = o.payments.filter(
              (p) => p.status === 'inasubiri'
            ).length

            return (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-500 transition"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${meta.tone}`}
                    >
                      <meta.Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                        {malipoYanasubiri > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            <AlertTriangle size={10} />
                            {malipoYanasubiri} yanasubiri
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {o.customer_name || 'Mteja'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(o.order_date)} — {o.items.length} bidhaa
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
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onThibitisha={handleThibitisha}
          onKataa={handleKataa}
          processing={processing}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-md ${
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

// ==================================================================
// Stat
// ==================================================================
function Stat({
  label,
  value,
  sub,
  Icon,
  tone,
}: {
  label: string
  value: string
  sub?: string
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
      {sub && <div className="text-xs text-slate-500 mt-0.5 truncate">{sub}</div>}
    </div>
  )
}

// ==================================================================
// Skeleton
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

function OrderSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-48" />
            <SkeletonLine className="h-3 w-24" />
          </div>
        </div>
        <div className="sm:text-right space-y-1.5">
          <SkeletonLine className="h-5 w-24 ml-auto" />
          <SkeletonLine className="h-3 w-20 ml-auto" />
        </div>
      </div>
    </div>
  )
}

// ==================================================================
// OrderDetail
// ==================================================================
function OrderDetail({
  order,
  onClose,
  onThibitisha,
  onKataa,
  processing,
}: {
  order: Order
  onClose: () => void
  onThibitisha: (orderId: string, paymentId: string) => void
  onKataa: (orderId: string, paymentId: string) => void
  processing: string | null
}) {
  const jumlaIlipwa = order.payments
    .filter((p) => p.status === 'imethibitishwa')
    .reduce((s, p) => s + parseFloat(p.amount || '0'), 0)
  const baki = parseFloat(order.total || '0') - jumlaIlipwa
  const meta = HALI_META[order.status]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">
              #{order.id.slice(0, 8).toUpperCase()}
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
          {/* Hali */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${meta.tone} bg-slate-50 border border-slate-200`}
          >
            <meta.Icon size={16} />
            <span className="text-xs font-semibold uppercase">
              {meta.label}
            </span>
          </div>

          {/* Mteja */}
          <div className="p-3 rounded-lg bg-slate-50">
            <div className="text-xs text-slate-500 mb-1">Mteja</div>
            <div className="font-medium">{order.customer_name || '—'}</div>
          </div>

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
                {order.payments.map((p) => {
                  const pMeta = MALIPO_HALI_META[p.status]
                  const isProcessing = processing === p.id
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg text-sm border ${pMeta.bg} ${pMeta.border}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-white ${pMeta.tone}`}
                      >
                        <pMeta.Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium uppercase text-xs">
                          {METHOD_LABEL[p.method] || p.method}
                          {p.phone ? ` — ${p.phone}` : ''}
                        </div>
                        <div className="text-xs text-slate-600 font-mono truncate">
                          {p.reference || '—'}
                        </div>
                        <div
                          className={`text-[10px] uppercase font-semibold ${pMeta.tone}`}
                        >
                          {pMeta.label}
                        </div>
                      </div>
                      <div className="font-semibold whitespace-nowrap">
                        {formatTsh(p.amount)}
                      </div>
                      {p.status === 'inasubiri' && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => onThibitisha(order.id, p.id)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Check size={10} />
                            )}
                            Thibitisha
                          </button>
                          <button
                            onClick={() => onKataa(order.id, p.id)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 text-[10px] font-semibold hover:bg-red-100 disabled:opacity-50"
                          >
                            <Ban size={10} />
                            Kataa
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
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
                  {formatTsh(jumlaIlipwa)}
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