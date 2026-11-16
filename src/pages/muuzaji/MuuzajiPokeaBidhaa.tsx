import { useEffect, useMemo, useState } from 'react'
import {
  Truck, CheckCircle2, AlertTriangle, RefreshCw, Package,
  X, Phone, Loader2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  inventoryApi,
  type StockMovement,
} from '../../services/inventory'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Types
// ==================================================================
interface PokeaGroup {
  reference_id: string
  reference_type: string
  items: StockMovement[]
  jumlaThamani: number
  jumlaBidhaa: number
  tarehe: string
  note: string
}

// ==================================================================
// Page
// ==================================================================
export default function MuuzajiPokeaBidhaa() {
  const { user } = useAuth()

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<PokeaGroup | null>(null)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ------------------------------------------------------------------
  // Load — stock movements za manunuzi
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await inventoryApi.movements({
        movement_type: 'manunuzi',
        store: user?.store_id || undefined,
      })
      setMovements(data)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata mizigo. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.store_id])

  // ------------------------------------------------------------------
  // Group movements kwa reference_id (mfano: purchase ID)
  // ------------------------------------------------------------------
  const groups = useMemo<PokeaGroup[]>(() => {
    const map = new Map<string, PokeaGroup>()
    movements.forEach((m) => {
      const key = m.reference_id || m.id
      if (!map.has(key)) {
        map.set(key, {
          reference_id: key,
          reference_type: m.reference_type,
          items: [],
          jumlaThamani: 0,
          jumlaBidhaa: 0,
          tarehe: m.created_at,
          note: m.note || '',
        })
      }
      const g = map.get(key)!
      g.items.push(m)
      g.jumlaBidhaa += 1
      g.jumlaThamani += parseFloat(m.quantity) * parseFloat(m.unit_cost)
    })
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.tarehe).getTime() - new Date(a.tarehe).getTime()
    )
  }, [movements])

  // ------------------------------------------------------------------
  // Pokea — thibitisha kupokea
  // ------------------------------------------------------------------
  const pokea = async (g: PokeaGroup) => {
    if (!user?.store_id) {
      setToast({ msg: 'Hujapangiwa duka.', ok: false })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setProcessing(true)
    try {
      // Kwa kila item, ongeza movement ya "marekebisho" (au "kurudisha")
      // Lakini kwa mtiririko huu, tunaunda movement mpya ya aina "adjustment"
      // ili kuashiria kuwa bidhaa imepokelewa.
      // Inategemea backend yako — hapa tunatumia adjust.
      for (const it of g.items) {
        await inventoryApi.adjust({
          product_id: it.product,
          store_id: user.store_id,
          quantity: 0, // hakuna mabadiliko ya stoki — thibitisha tu
          movement_type: 'marekebisho',
          note: `Imepokelewa na ${user.full_name} — ref ${g.reference_id.slice(0, 8)}`,
        })
      }

      setToast({
        msg: `Bidhaa ${g.jumlaBidhaa} zimepokelewa.`,
        ok: true,
      })
      setTimeout(() => setToast(null), 4000)
      setSelected(null)
      await load()
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kupokea.',
        ok: false,
      })
      setTimeout(() => setToast(null), 5000)
    } finally {
      setProcessing(false)
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
            <Truck size={26} className="text-brand-600" /> Pokea Bidhaa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Thibitisha kupokea bidhaa zilizotumwa kutoka kwa msambazaji
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

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            onClick={load}
            className="text-xs font-semibold underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* Loading — skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <PokeaSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && groups.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Truck size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">Hakuna mizigo ya kupokea</h3>
          <p className="text-sm text-slate-500 mt-1">
            Mizigo itaonekana hapa mara mmiliki atakapotuma bidhaa.
          </p>
        </div>
      )}

      {/* Groups list */}
      {!loading && groups.length > 0 && (
        <div className="space-y-2">
          {groups.map((g) => (
            <button
              key={g.reference_id}
              onClick={() => setSelected(g)}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-500 transition"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 grid place-items-center shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">
                      #{g.reference_id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(g.tarehe)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {g.jumlaBidhaa} bidhaa
                    </div>
                  </div>
                </div>
                <div className="sm:text-right shrink-0">
                  <div className="text-base font-bold text-slate-900">
                    {formatTsh(g.jumlaThamani)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Thamani ya bidhaa
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <PokeaModal
          group={selected}
          onClose={() => !processing && setSelected(null)}
          onConfirm={() => pokea(selected)}
          processing={processing}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] text-white text-sm px-4 py-3 rounded-xl shadow-2xl max-w-md flex items-center gap-2 ${
            toast.ok ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.ok ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <X size={16} className="shrink-0" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ==================================================================
// Skeleton
// ==================================================================
function PokeaSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />
          <div className="min-w-0 space-y-1.5">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="h-3 w-20" />
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
// Modal
// ==================================================================
function PokeaModal({
  group,
  onClose,
  onConfirm,
  processing,
}: {
  group: PokeaGroup
  onClose: () => void
  onConfirm: () => void
  processing: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center z-10">
          <div>
            <div className="font-semibold">
              Mzigo #{group.reference_id.slice(0, 8).toUpperCase()}
            </div>
            <div className="text-xs text-slate-500">
              {formatDate(group.tarehe)}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Bidhaa */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Package size={14} className="text-brand-600" /> Bidhaa (
              {group.items.length})
            </h3>
            <div className="space-y-1.5">
              {group.items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {it.product_name || it.product}
                    </div>
                    <div className="text-xs text-slate-500">
                      {it.quantity} × {formatTsh(it.unit_cost)}
                    </div>
                  </div>
                  <div className="font-semibold whitespace-nowrap">
                    {formatTsh(
                      parseFloat(it.quantity) * parseFloat(it.unit_cost)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maelezo */}
          {group.note && (
            <div className="p-3 rounded-lg bg-slate-50 text-sm">
              <div className="text-xs text-slate-500 mb-1">Maelezo</div>
              <div>{group.note}</div>
            </div>
          )}

          {/* Jumla */}
          <div className="p-3 rounded-lg bg-slate-50 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Jumla ya Bidhaa</span>
              <span className="font-semibold">{group.jumlaBidhaa}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span className="font-medium">Thamani</span>
              <span className="font-bold text-brand-700">
                {formatTsh(group.jumlaThamani)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              Ghairi
            </button>
            <button
              onClick={onConfirm}
              disabled={processing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Inapokea...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Nimepokea
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}