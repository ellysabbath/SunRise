import { useState, useEffect, useCallback, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Wallet, AlertTriangle, CheckCircle2, Loader2,
  Banknote, Smartphone, X, Receipt, ChevronRight, RefreshCw,
} from 'lucide-react'
import { ordersApi, type Order, type MalipoNjia } from '../../services/orderss'
import { useAuth } from '../../context/AuthContext'

// ==================================================================
// Format
// ==================================================================
function formatTsh(n: number | string | undefined | null): string {
  if (n == null) return 'TZS 0'
  return `TZS ${Number(n).toLocaleString('en-US')}`
}

// ==================================================================
// Meta
// ==================================================================
type NjiaMalipoDeni = 'mpesa' | 'tigopesa' | 'cash'

const NJIA_META: Record<
  NjiaMalipoDeni,
  { label: string; Icon: React.ElementType; tone: string }
> = {
  cash: { label: 'Cash', Icon: Banknote, tone: 'text-emerald-600' },
  mpesa: { label: 'M-Pesa', Icon: Smartphone, tone: 'text-brand-600' },
  tigopesa: { label: 'Tigo Pesa', Icon: Smartphone, tone: 'text-orange-600' },
}

// ✅ Map NjiaMalipoDeni → MalipoNjia (backend)
const NJIA_BACKEND: Record<NjiaMalipoDeni, MalipoNjia> = {
  cash: 'cash',
  mpesa: 'mpesa',
  tigopesa: 'tigo',
}

// ==================================================================
// Page
// ==================================================================
export default function MtejaDeni() {
  const { user, loading: authLoading } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ------------------------------------------------------------------
  // Guard
  // ------------------------------------------------------------------
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />
  }

  // ------------------------------------------------------------------
  // Load orders
  // ------------------------------------------------------------------
  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const data = await ordersApi.orders({ limit: 100 }).catch(() => [])
      setOrders(data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Imeshindwa kupakua orders')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) loadAll()
  }, [user, loadAll])

  // ------------------------------------------------------------------
  // ✅ Derive deni kutoka orders (upande wa client)
  // ------------------------------------------------------------------
  const deniOrders = useMemo(
    () =>
      orders
        .filter((o) => o.is_deni && !o.deni_imekwisha)
        .map((o) => ({
          ...o,
          baki: Number(o.deni_iliyobaki || 0),
          jumla: Number(o.total || 0),
        })),
    [orders]
  )

  const totalDeni = useMemo(
    () => deniOrders.reduce((s, o) => s + o.baki, 0),
    [deniOrders]
  )

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const funguaMalipo = (orderId?: string) => {
    setSelectedOrder(orderId ?? null)
    setPayOpen(true)
  }

  const handleSuccess = (msg: string, ok: boolean) => {
    setPayOpen(false)
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 5000)
    if (ok) loadAll() // ✅ refresh orders baada ya malipo
  }

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Deni Langu
          </h1>
          {user?.full_name && (
            <p className="text-sm text-slate-500 mt-1">
              {user.full_name}
              {user.phone && (
                <span className="text-slate-400"> • {user.phone}</span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 self-start"
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

      {/* ============ DENI LA SASA ============ */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
          <div className="h-14 w-14 rounded-2xl bg-slate-200" />
          <div className="h-4 w-32 bg-slate-200 rounded mt-3" />
          <div className="h-8 w-48 bg-slate-200 rounded mt-2" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 grid place-items-center ${
                  totalDeni > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                <Wallet size={24} />
              </div>
              <div>
                <div className="text-sm text-slate-500">Deni la Sasa</div>
                <div
                  className={`text-2xl md:text-3xl font-bold ${
                    totalDeni > 0 ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  {formatTsh(totalDeni)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {totalDeni > 0
                    ? 'Tafadhali lipa deni lako'
                    : 'Hauna deni — umelipa yote'}
                </div>
              </div>
            </div>

            {totalDeni > 0 && (
              <button
                onClick={() => funguaMalipo()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition self-start sm:self-auto"
              >
                <Banknote size={16} />
                Lipa Deni
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============ ORDERS ZANGU ============ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            Orders Zangu ({orders.length})
          </h2>
          {deniOrders.length > 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
              {deniOrders.length} zina deni
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-6">
            Hakuna order bado
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((o) => {
              const baki = Number(o.deni_iliyobaki || 0)
              const isDeni = o.is_deni && !o.deni_imekwisha

              return (
                <div key={o.id} className="py-3 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${
                      isDeni ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {isDeni ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate font-mono">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {o.created_at?.slice(0, 10)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatTsh(o.total)}
                    </div>
                    {isDeni ? (
                      <div className="text-xs text-amber-700">
                        Baki: {formatTsh(baki)}
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-700">Imelipwa</div>
                    )}
                  </div>
                  {isDeni && (
                    <button
                      onClick={() => funguaMalipo(o.id)}
                      className="ml-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-brand-50 text-brand-700 text-xs font-semibold hover:bg-brand-100 shrink-0"
                    >
                      <Banknote size={12} />
                      Lipa
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ============ MODAL YA MALIPO ============ */}
      {payOpen && user && (
        <MalipoDeniModal
          selectedOrder={selectedOrder}
          orders={deniOrders}
          userPhone={user.phone}
          onClose={() => setPayOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-md ${
            toast.ok ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Modal ya Malipo ya Deni
// ============================================================
function MalipoDeniModal({
  selectedOrder,
  orders,
  userPhone,
  onClose,
  onSuccess,
}: {
  selectedOrder: string | null
  orders: (Order & { baki: number })[]
  userPhone: string
  onClose: () => void
  onSuccess: (msg: string, ok: boolean) => void
}) {
  const [njia, setNjia] = useState<NjiaMalipoDeni>('mpesa')
  const [kiasi, setKiasi] = useState(0)
  const [kumbukumbu, setKumbukumbu] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [initialized, setInitialized] = useState(false)

  // ✅ Order moja au zote
  const order = selectedOrder ? orders.find((o) => o.id === selectedOrder) : null
  const jumlaBaki = order
    ? order.baki
    : orders.reduce((s, o) => s + o.baki, 0)

  // ✅ Set kiasi cha awali
  if (!initialized && jumlaBaki > 0) {
    setKiasi(jumlaBaki)
    setInitialized(true)
  }

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (kiasi <= 0) return setError('Kiasi lazima kiwe zaidi ya sifuri')
    if (kiasi > jumlaBaki) return setError('Kiasi hakiwezi kuzidi baki')
    if (njia !== 'cash' && !kumbukumbu.trim()) {
      return setError('Weka kumbukumbu ya malipo (reference)')
    }

    setSaving(true)

    try {
      // ✅ 1. Malipo kwa order moja
      if (order) {
        await ordersApi.createMalipo({
          order_id: order.id,
          njia: NJIA_BACKEND[njia],
          simu: userPhone,
          kumbukumbu: njia === 'cash' ? 'CASH' : kumbukumbu.trim().toUpperCase(),
          kiasi,
          hali: njia === 'cash' ? 'imethibitishwa' : 'inasubiri',
        })
      } else {
        // ✅ 2. Malipo kwa orders zote (split)
        let remaining = kiasi
        const sorted = [...orders].sort((a, b) => a.baki - b.baki)

        for (const o of sorted) {
          if (remaining <= 0) break
          if (o.baki <= 0) continue
          const malipoKiasi = Math.min(remaining, o.baki)
          await ordersApi.createMalipo({
            order_id: o.id,
            njia: NJIA_BACKEND[njia],
            simu: userPhone,
            kumbukumbu:
              njia === 'cash' ? 'CASH' : kumbukumbu.trim().toUpperCase(),
            kiasi: malipoKiasi,
            hali: njia === 'cash' ? 'imethibitishwa' : 'inasubiri',
          })
          remaining -= malipoKiasi
        }
      }

      const msg =
        njia === 'cash'
          ? `Malipo ya ${formatTsh(kiasi)} yamekamilika (Cash)`
          : `Malipo ya ${formatTsh(kiasi)} yamewasilishwa. Yanasubiri uthibitisho wa duka.`
      onSuccess(msg, true)
    } catch (e: any) {
      const detail = e?.response?.data
      let msg = 'Imeshindwa kukamilisha malipo'
      if (typeof detail === 'object') {
        msg = String(Object.values(detail)[0])
      } else if (detail) {
        msg = detail
      }
      onSuccess(msg, false)
    } finally {
      setSaving(false)
    }
  }

  const njiaMeta = NJIA_META[njia]

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !saving && onClose()}
      />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold flex items-center gap-2">
              <Banknote size={16} className="text-brand-600" />
              Lipa Deni
            </div>
            <div className="text-xs text-slate-500">
              {order
                ? `Order #${order.id.slice(0, 8).toUpperCase()}`
                : `Orders ${orders.length} zenye deni`}
            </div>
            <div
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md mt-1 bg-slate-50 border border-slate-200 ${njiaMeta.tone}`}
            >
              <njiaMeta.Icon size={10} />
              {njiaMeta.label}
            </div>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            disabled={saving}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Baki */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500">Baki ya Kulipa</div>
            <div className="text-2xl font-bold text-red-700 mt-0.5">
              {formatTsh(jumlaBaki)}
            </div>
          </div>

          {/* Njia */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Njia ya Malipo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(NJIA_META) as NjiaMalipoDeni[]).map((k) => {
                const meta = NJIA_META[k]
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setNjia(k)}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium transition ${
                      njia === k
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <meta.Icon size={16} className={meta.tone} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Kiasi */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Kiasi Unacholipa (Tsh)
            </label>
            <input
              type="number"
              value={kiasi || ''}
              onChange={(e) => setKiasi(Number(e.target.value))}
              max={jumlaBaki}
              min={1}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setKiasi(jumlaBaki)}
                className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 font-medium"
              >
                Lipa Yote
              </button>
              <button
                type="button"
                onClick={() => setKiasi(Math.floor(jumlaBaki / 2))}
                className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 font-medium"
              >
                Nusu
              </button>
            </div>
          </div>

          {/* Kumbukumbu */}
          {njia !== 'cash' && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                Kumbukumbu ya Malipo{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                value={kumbukumbu}
                onChange={(e) => setKumbukumbu(e.target.value.toUpperCase())}
                placeholder="Mfano: QGR7XK2P9L"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm font-mono"
              />
              <div className="flex items-start gap-1.5 text-xs text-amber-700 mt-1">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                Weka kumbukumbu halisi kutoka SMS ya mtandao
              </div>
            </div>
          )}

          {/* Info */}
          {njia === 'cash' ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              Malipo ya cash yanathibitishwa mara moja
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
              <Smartphone size={14} className="mt-0.5 shrink-0" />
              Malipo yatasubiri uthibitisho wa duka. Deni litapungua baada ya
              uthibitisho.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => !saving && onClose()}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              Ghairi
            </button>
            <button
              type="submit"
              disabled={saving || jumlaBaki <= 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Inakamilisha...
                </>
              ) : (
                <>
                  <Receipt size={16} />
                  Thibitisha Malipo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}