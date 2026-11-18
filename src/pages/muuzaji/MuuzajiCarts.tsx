import { useEffect, useMemo, useState } from 'react'
import {
  ShoppingCart, Search, Filter, RefreshCw, X,
  Package, CreditCard, CheckCircle2, XCircle,
  Clock, AlertTriangle, Loader2, Check, Ban, Receipt,
} from 'lucide-react'
import { ordersApi } from '../../services/orders'
import { formatTsh, formatDate } from '../../lib/format'

// ==================================================================
// Types (kutoka backend)
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
  store: string
  order_date: string
  status: 'inasubiri_malipo' | 'imekamilika' | 'imekataliwa'
  subtotal: string
  discount: string
  total: string
  created_by: string
  items: OrderItem[]
  payments: Payment[]
}

// ==================================================================
// Metadata
// ==================================================================
const ORDER_STATUS_META: Record<
  Order['status'],
  { label: string; tone: string; bg: string; border: string; Icon: React.ElementType }
> = {
  inasubiri_malipo: {
    label: 'Inasubiri Malipo',
    tone: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    Icon: Clock,
  },
  imekamilika: {
    label: 'Imekamilika',
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

const PAYMENT_STATUS_META: Record<
  Payment['status'],
  { label: string; tone: string; bg: string; Icon: React.ElementType }
> = {
  inasubiri: {
    label: 'Inasubiri Uthibitisho',
    tone: 'text-amber-700',
    bg: 'bg-amber-50',
    Icon: Clock,
  },
  imethibitishwa: {
    label: 'Imethibitishwa',
    tone: 'text-emerald-700',
    bg: 'bg-emerald-50',
    Icon: CheckCircle2,
  },
  imekataliwa: {
    label: 'Imekataliwa',
    tone: 'text-red-700',
    bg: 'bg-red-50',
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
export default function MuuzajiCarts() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'zote' | 'ina_subiri_malipo' | 'ina_subiri_uthibitisho'>(
    'ina_subiri_malipo'
  )
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
      // Filter: onyesha tu zisizokamilika au zenye malipo yanayosubiri
      const relevant = (data as Order[]).filter(
        (o) =>
          o.status === 'inasubiri_malipo' ||
          o.payments.some((p) => p.status === 'inasubiri')
      )
      setOrders(relevant)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata carts. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ------------------------------------------------------------------
  // Filter + search
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return orders.filter((o) => {
      if (filter === 'ina_subiri_uthibitisho') {
        if (!o.payments.some((p) => p.status === 'inasubiri')) return false
      }
      if (!q) return true
      return (
        o.id.toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        o.items.some((it) => (it.product_name || '').toLowerCase().includes(q))
      )
    })
  }, [orders, search, filter])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const jumla = orders.length
    const jumlaTsh = orders.reduce((s, o) => s + parseFloat(o.total || '0'), 0)
    const malipoYanasubiri = orders.reduce(
      (s, o) => s + o.payments.filter((p) => p.status === 'inasubiri').length,
      0
    )
    return { jumla, jumlaTsh, malipoYanasubiri }
  }, [orders])

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  const handleConfirmPayment = async (orderId: string, paymentId: string) => {
    setProcessing(paymentId)
    try {
      await ordersApi.confirmPayment(orderId, paymentId)
      setToast({ msg: 'Malipo yamethibitishwa.', ok: true })
      setTimeout(() => setToast(null), 3000)
      await load()
      setSelected(null)
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

  const handleRejectPayment = async (orderId: string, paymentId: string) => {
    if (!confirm('Una uhakika unataka kukataa malipo haya?')) return
    setProcessing(paymentId)
    try {
      await ordersApi.rejectPayment(orderId, paymentId)
      setToast({ msg: 'Malipo yamekataliwa.', ok: false })
      setTimeout(() => setToast(null), 3000)
      await load()
      setSelected(null)
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

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingCart size={26} className="text-brand-600" />
            Carts Zinazosubiri
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Orders ambazo hazijalipiwa au zina malipo yanayosubiri uthibitisho
          </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          label="Carts Zinazosubiri"
          value={String(stats.jumla)}
          Icon={ShoppingCart}
          tone="text-amber-600"
        />
        <Stat
          label="Jumla ya Thamani"
          value={formatTsh(stats.jumlaTsh)}
          Icon={Receipt}
          tone="text-brand-600"
        />
        <Stat
          label="Malipo Yanayosubiri"
          value={String(stats.malipoYanasubiri)}
          Icon={Clock}
          tone={stats.malipoYanasubiri > 0 ? 'text-red-600' : 'text-slate-500'}
        />
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tafuta kwa order ID, mteja, au bidhaa..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={14} className="text-slate-400" />
          <button
            onClick={() => setFilter('ina_subiri_malipo')}
            className={`px-3 py-1.5 rounded-lg text-xs border transition ${
              filter === 'ina_subiri_malipo'
                ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Clock size={12} className="inline mr-1" />
            Zinasubiri Malipo
          </button>
          <button
            onClick={() => setFilter('ina_subiri_uthibitisho')}
            className={`px-3 py-1.5 rounded-lg text-xs border transition ${
              filter === 'ina_subiri_uthibitisho'
                ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CreditCard size={12} className="inline mr-1" />
            Malipo Yanasubiri
          </button>
          <button
            onClick={() => setFilter('zote')}
            className={`px-3 py-1.5 rounded-lg text-xs border transition ${
              filter === 'zote'
                ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            Zote
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            onClick={load}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && orders.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Loader2 size={32} className="mx-auto text-brand-500 animate-spin mb-3" />
          <h3 className="font-semibold">Inapakia carts...</h3>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ShoppingCart size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {search ? 'Hakuna matokeo ya utafutaji' : 'Hakuna cart inayosubiri'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {search
              ? 'Badilisha neno la utafutaji.'
              : 'Carts zitaonekana hapa mara mteja akiacha order.'}
          </p>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((o) => {
            const meta = ORDER_STATUS_META[o.status]
            const pendingPayments = o.payments.filter((p) => p.status === 'inasubiri')
            const confirmedPayments = o.payments.filter(
              (p) => p.status === 'imethibitishwa'
            )
            const jumlaIlipwa = confirmedPayments.reduce(
              (s, p) => s + parseFloat(p.amount || '0'),
              0
            )
            const baki = parseFloat(o.total || '0') - jumlaIlipwa

            return (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-500 transition"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg ${meta.bg} border ${meta.border} grid place-items-center shrink-0 ${meta.tone}`}
                    >
                      <meta.Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`text-[10px] uppercase font-semibold ${meta.tone}`}>
                          {meta.label}
                        </span>
                        {pendingPayments.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            <AlertTriangle size={10} />
                            {pendingPayments.length} yanasubiri
                          </span>
                        )}
                      </div>
                      <div className="text-sm mt-0.5 truncate">
                        {o.customer_name || 'Mteja'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
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
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onConfirm={handleConfirmPayment}
          onReject={handleRejectPayment}
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
          {toast.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
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
// Order Detail Modal
// ==================================================================
function OrderDetailModal({
  order,
  onClose,
  onConfirm,
  onReject,
  processing,
}: {
  order: Order
  onClose: () => void
  onConfirm: (orderId: string, paymentId: string) => void
  onReject: (orderId: string, paymentId: string) => void
  processing: string | null
}) {
  const meta = ORDER_STATUS_META[order.status]
  const confirmedPayments = order.payments.filter(
    (p) => p.status === 'imethibitishwa'
  )
  const jumlaIlipwa = confirmedPayments.reduce(
    (s, p) => s + parseFloat(p.amount || '0'),
    0
  )
  const baki = parseFloat(order.total || '0') - jumlaIlipwa

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center z-10">
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
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${meta.bg} border ${meta.border}`}
          >
            <meta.Icon size={16} className={meta.tone} />
            <span className={`text-xs font-semibold uppercase ${meta.tone}`}>
              {meta.label}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50">
            <div className="text-xs text-slate-500 mb-1">Mteja</div>
            <div className="font-medium">{order.customer_name || '—'}</div>
          </div>

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

          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <CreditCard size={14} className="text-brand-600" /> Malipo (
              {order.payments.length})
            </h3>

            {order.payments.length === 0 && (
              <div className="text-sm text-slate-500 p-3 rounded-lg bg-slate-50 text-center">
                Hakuna malipo bado
              </div>
            )}

            <div className="space-y-1.5">
              {order.payments.map((p) => {
                const pm = PAYMENT_STATUS_META[p.status]
                const isProcessing = processing === p.id
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg text-sm border ${pm.bg} border-slate-200`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-white ${pm.tone}`}
                    >
                      <pm.Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium uppercase text-xs">
                        {METHOD_LABEL[p.method] || p.method}
                      </div>
                      <div className="text-xs text-slate-600 font-mono truncate">
                        {p.reference || '—'}
                      </div>
                      <div className={`text-[10px] uppercase font-semibold ${pm.tone}`}>
                        {pm.label}
                      </div>
                    </div>
                    <div className="font-semibold whitespace-nowrap">
                      {formatTsh(p.amount)}
                    </div>
                    {p.status === 'inasubiri' && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => onConfirm(order.id, p.id)}
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
                          onClick={() => onReject(order.id, p.id)}
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