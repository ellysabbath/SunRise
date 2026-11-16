import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Truck, CheckCircle2, AlertTriangle, RefreshCw, Package,
  X, Loader2, Store, Eye, User, Lock, ClipboardList,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  inventoryApi,
  type StockMovement,
} from '../../services/inventory'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Types
// ==================================================================
type PokeaStatus = 'inasubiri' | 'imepokelewa'

interface PokeaGroup {
  reference_id: string
  reference_type: string
  items: StockMovement[]
  jumlaThamani: number
  jumlaBidhaa: number
  tarehe: string
  note: string
  status: PokeaStatus
  aliyepokea: string | null
  tareheKupokea: string | null
  // ✅ Assignment ya mmiliki
  assigned_to?: string | null
  assigned_to_name?: string | null
}

// ==================================================================
// Constants
// ==================================================================
const RECEIVED_PREFIX = 'RECEIVED_BY|'
const ASSIGNED_PREFIX = 'ASSIGNED_TO|'

// ==================================================================
// Helpers
// ==================================================================
function isValidUuid(value: string | null | undefined): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

function parseReceivedNote(
  note: string
): { userId: string; userName: string; timestamp: string } | null {
  if (!note || !note.startsWith(RECEIVED_PREFIX)) return null
  const parts = note.split('|')
  if (parts.length < 4) return null
  return {
    userId: parts[1],
    userName: parts[2],
    timestamp: parts[3],
  }
}

// ✅ Parse assignment ya mmiliki
function parseAssignedNote(
  note: string
): { userId: string; userName: string } | null {
  if (!note || !note.startsWith(ASSIGNED_PREFIX)) return null
  const parts = note.split('|')
  if (parts.length < 3) return null
  return {
    userId: parts[1],
    userName: parts[2],
  }
}

// ==================================================================
// Toast
// ==================================================================
function Toast({
  message,
  ok,
  onClose,
}: {
  message: string
  ok: boolean
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-md ${
        ok ? 'bg-emerald-600' : 'bg-red-600'
      }`}
    >
      {ok ? (
        <CheckCircle2 size={16} className="shrink-0" />
      ) : (
        <AlertTriangle size={16} className="shrink-0" />
      )}
      <div className="flex-1">{message}</div>
      <button
        onClick={onClose}
        className="p-0.5 rounded hover:bg-white/20"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ==================================================================
// StatMini
// ==================================================================
function StatMini({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
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
  storeId,
  userId,
  onClose,
  onConfirm,
  processing,
}: {
  group: PokeaGroup
  storeId?: string
  userId?: string
  onClose: () => void
  onConfirm: () => void
  processing: boolean
}) {
  const isReceived = group.status === 'imepokelewa'
  // ✅ Ulinzi: mzigo lazima uwe umepewa mtumiaji huyu
  const isAssignedToMe = !group.assigned_to || group.assigned_to === userId

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">
                Mzigo #{group.reference_id.slice(0, 8).toUpperCase()}
              </span>
              {isReceived ? (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={9} />
                  Imepokelewa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  <Package size={9} />
                  Inasubiri
                </span>
              )}
              {!isAssignedToMe && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle size={9} />
                  Si Yako
                </span>
              )}
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
          {/* Assignment banner */}
          {group.assigned_to_name && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
              <ClipboardList size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">
                  Mmepewa: {group.assigned_to_name}
                </div>
                <div className="text-xs text-blue-600 mt-0.5">
                  Mmiliki amekupa mzigo huu kwa ajili ya kupokea
                </div>
              </div>
            </div>
          )}

          {/* Received banner */}
          {isReceived && group.aliyepokea && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">
                  Imepokelewa na {group.aliyepokea}
                </div>
                {group.tareheKupokea && (
                  <div className="text-xs text-emerald-600 mt-0.5">
                    {formatDate(group.tareheKupokea)}
                  </div>
                )}
              </div>
            </div>
          )}

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
              {isReceived ? 'Funga' : 'Ghairi'}
            </button>
            {isReceived ? (
              <button
                disabled
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200 cursor-not-allowed"
              >
                <CheckCircle2 size={16} />
                Imepokelewa
              </button>
            ) : !isAssignedToMe ? (
              <button
                disabled
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-700 text-sm font-semibold border border-red-200 cursor-not-allowed"
              >
                <AlertTriangle size={16} />
                Si Mzigo Wako
              </button>
            ) : (
              <button
                onClick={onConfirm}
                disabled={processing || !storeId}
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================================================================
// PAGE
// ==================================================================
export default function MuuzajiPokeaBidhaa() {
  const { user } = useAuth()

  // ================================================================
  // ✅ DUKA HUSIKA + MTU HUSIKA
  // ================================================================
  const storeId = user?.store_id || undefined
  const userId = user?.id || undefined

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [store, setStore] = useState<StoreType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<PokeaGroup | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

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
      setError('Huna ruhusa ya kuona mizigo.')
      setLoading(false)
      return
    }

    try {
      const [movsManunuzi, movsMarekebisho, myStore] = await Promise.all([
        inventoryApi.movements({
          movement_type: 'manunuzi',
          store: storeId,                                 // ✅ duka husika
        }),
        inventoryApi.movements({
          movement_type: 'marekebisho',
          store: storeId,                                 // ✅ duka husika
        }),
        storesApi.get(storeId),                           // ✅ duka moja (sio list)
      ])

      setMovements([...movsManunuzi, ...movsMarekebisho])
      setStore(myStore)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata mizigo. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }, [storeId, user?.role])

  useEffect(() => {
    load()
  }, [load])

  // ------------------------------------------------------------------
  // Group — pamoja na "RECEIVED" + "ASSIGNED" detection
  // ------------------------------------------------------------------
  const groups = useMemo<PokeaGroup[]>(() => {
    const map = new Map<string, PokeaGroup>()

    // 1. Manunuzi (source)
    movements
      .filter((m) => m.movement_type === 'manunuzi')
      .forEach((m) => {
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
            status: 'inasubiri',
            aliyepokea: null,
            tareheKupokea: null,
            assigned_to: null,
            assigned_to_name: null,
          })
        }
        const g = map.get(key)!
        g.items.push(m)
        g.jumlaBidhaa += 1
        g.jumlaThamani += parseFloat(m.quantity) * parseFloat(m.unit_cost)
      })

    // 2. Marekebisho yenye RECEIVED_BY — mark received
    movements
      .filter(
        (m) =>
          m.movement_type === 'marekebisho' &&
          m.note?.startsWith(RECEIVED_PREFIX) &&
          m.reference_id
      )
      .forEach((m) => {
        const key = m.reference_id!
        const parsed = parseReceivedNote(m.note)
        if (!parsed) return

        if (map.has(key)) {
          const g = map.get(key)!
          g.status = 'imepokelewa'
          g.aliyepokea = parsed.userName
          g.tareheKupokea = parsed.timestamp
        }
      })

    // 3. ✅ Marekebisho yenye ASSIGNED_TO — mark assigned (mmiliki)
    movements
      .filter(
        (m) =>
          m.movement_type === 'marekebisho' &&
          m.note?.startsWith(ASSIGNED_PREFIX) &&
          m.reference_id
      )
      .forEach((m) => {
        const key = m.reference_id!
        const parsed = parseAssignedNote(m.note)
        if (!parsed) return

        if (map.has(key)) {
          const g = map.get(key)!
          g.assigned_to = parsed.userId
          g.assigned_to_name = parsed.userName
        }
      })

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.tarehe).getTime() - new Date(a.tarehe).getTime()
    )
  }, [movements])

  // ------------------------------------------------------------------
  // ✅ Filter: mizigo ya mtumiaji huyu pekee
  // ------------------------------------------------------------------
  const myGroups = useMemo(() => {
    if (!userId) return []
    return groups.filter((g) => {
      // Kama mzigo umeelekezwa kwa mtu fulani, lazima uwe wa mtumiaji huyu
      if (g.assigned_to && g.assigned_to !== userId) return false
      return true
    })
  }, [groups, userId])

  // ------------------------------------------------------------------
  // Stats — kwa myGroups pekee
  // ------------------------------------------------------------------
  const stats = useMemo(
    () => ({
      zote: myGroups.length,
      inasubiri: myGroups.filter((g) => g.status === 'inasubiri').length,
      imepokelewa: myGroups.filter((g) => g.status === 'imepokelewa').length,
    }),
    [myGroups]
  )

  // ------------------------------------------------------------------
  // Pokea — ✅ inathibitisha assignment + duka
  // ------------------------------------------------------------------
  const pokea = async (g: PokeaGroup) => {
    // ✅ Hakikisha duka + mtumiaji
    if (!storeId || !userId) {
      setToast({ msg: 'Hujapangiwa duka. Wasiliana na mmiliki.', ok: false })
      setTimeout(() => setToast(null), 3000)
      return
    }

    // ✅ Hakikisha mzigo ni wa mtumiaji huyu
    if (g.assigned_to && g.assigned_to !== userId) {
      setToast({ msg: 'Mzigo huu si wako. Mmepewa mtu mwingine.', ok: false })
      setTimeout(() => setToast(null), 4000)
      return
    }

    if (g.status === 'imepokelewa') {
      setToast({ msg: 'Mzigo huu tayari umepokelewa.', ok: false })
      setTimeout(() => setToast(null), 3000)
      return
    }

    if (!isValidUuid(g.reference_id)) {
      setToast({
        msg: `Reference ID si sahihi: ${g.reference_id.slice(0, 8)}`,
        ok: false,
      })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setProcessing(g.reference_id)
    try {
      await inventoryApi.adjust({
        product_id: g.items[0].product,
        store_id: storeId,                               // ✅ duka husika
        quantity: 0,
        movement_type: 'marekebisho',
        note: `${RECEIVED_PREFIX}${userId}|${user.full_name}|${new Date().toISOString()}`,
        reference_id: g.reference_id,
      })

      setToast({
        msg: `Mzigo #${g.reference_id.slice(0, 8)} umepokelewa.`,
        ok: true,
      })
      setSelected(null)
      await load()
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kupokea.',
        ok: false,
      })
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
            <Truck size={26} className="text-brand-600" /> Pokea Bidhaa
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
              title="Mizigo uliyopewa na mmiliki pekee"
            >
              <Lock size={10} /> Yako
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
      {!loading && myGroups.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatMini
            label="Mizigo Yako"
            value={String(stats.zote)}
            tone="text-blue-600"
          />
          <StatMini
            label="Inasubiri"
            value={String(stats.inasubiri)}
            tone="text-amber-600"
          />
          <StatMini
            label="Imepokelewa"
            value={String(stats.imepokelewa)}
            tone="text-emerald-600"
          />
        </div>
      )}

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
          {Array.from({ length: 4 }).map((_, i) => (
            <PokeaSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && myGroups.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Truck size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">Hakuna mizigo ya kupokea</h3>
          <p className="text-sm text-slate-500 mt-1">
            Mizigo itaonekana hapa mara mmiliki atakapokupa mzigo wa kupokea.
          </p>
        </div>
      )}

      {/* Groups list */}
      {!loading && myGroups.length > 0 && (
        <div className="space-y-2">
          {myGroups.map((g) => {
            const isProcessing = processing === g.reference_id
            const isReceived = g.status === 'imepokelewa'

            return (
              <div
                key={g.reference_id}
                className={`bg-white rounded-2xl border p-4 ${
                  isReceived ? 'border-emerald-200' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <button
                    onClick={() => setSelected(g)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 border ${
                        isReceived
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-amber-50 border-amber-200 text-amber-600'
                      }`}
                    >
                      {isReceived ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Package size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          #{g.reference_id.slice(0, 8).toUpperCase()}
                        </span>
                        {isReceived ? (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={9} />
                            Imepokelewa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            <Package size={9} />
                            Inasubiri
                          </span>
                        )}
                        {g.assigned_to_name && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            <ClipboardList size={9} />
                            {g.assigned_to_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(g.tarehe)} — {g.jumlaBidhaa} bidhaa
                      </div>
                      {isReceived && g.aliyepokea && (
                        <div className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 size={10} />
                          Imepokelewa na {g.aliyepokea}
                          {g.tareheKupokea &&
                            ` — ${formatDate(g.tareheKupokea)}`}
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="sm:text-right shrink-0 flex flex-col sm:items-end gap-2">
                    <div>
                      <div className="text-base font-bold text-slate-900">
                        {formatTsh(g.jumlaThamani)}
                      </div>
                      <div className="text-xs text-slate-500">Thamani</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelected(g)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                      >
                        <Eye size={12} />
                        Ona
                      </button>
                      {isReceived ? (
                        <button
                          disabled
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 cursor-not-allowed"
                        >
                          <CheckCircle2 size={12} />
                          Imepokelewa
                        </button>
                      ) : (
                        <button
                          onClick={() => pokea(g)}
                          disabled={isProcessing || !storeId}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          Pokea
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <PokeaModal
          group={selected}
          storeId={storeId}
          userId={userId}
          onClose={() => !processing && setSelected(null)}
          onConfirm={() => pokea(selected)}
          processing={processing === selected.reference_id}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.msg}
          ok={toast.ok}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}