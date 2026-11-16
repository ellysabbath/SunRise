import { useEffect, useMemo, useState } from 'react'
import {
  Package, AlertTriangle, Calendar, RotateCcw, PackageX, RefreshCcw,
  Search, CheckCircle2, Clock, XCircle, Store, User,
  Layers, Truck, Eye, X, ListFilter, RefreshCw, Loader2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { productsApi, type Product } from '../../services/products'
import {
  inventoryApi,
  type StockMovement,
  type StockAdjustment,
} from '../../services/inventory'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
const AINA_ADJ_META: Record<
  StockMovement['movement_type'],
  { label: string; tone: string; Icon: React.ElementType }
> = {
  manunuzi: { label: 'Manunuzi', tone: 'text-blue-700', Icon: Truck },
  mauzo: { label: 'Mauzo', tone: 'text-blue-700', Icon: Package },
  uharibifu: { label: 'Uharibifu', tone: 'text-red-700', Icon: AlertTriangle },
  kurudisha: { label: 'Kurudisha', tone: 'text-purple-700', Icon: RotateCcw },
  marekebisho: { label: 'Marekebisho', tone: 'text-slate-700', Icon: RefreshCcw },
}

const HALI_ADJ_META: Record<
  StockAdjustment['status'],
  { label: string; tone: string; Icon: React.ElementType }
> = {
  inasubiri: { label: 'Inasubiri', tone: 'text-amber-600', Icon: Clock },
  imekubaliwa: { label: 'Imekubaliwa', tone: 'text-emerald-600', Icon: CheckCircle2 },
  imekataliwa: { label: 'Imekataliwa', tone: 'text-red-600', Icon: XCircle },
}

// ==================================================================
// Page
// ==================================================================
export default function MuuzajiStoreManage() {
  const { user } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const storeId = user?.store_id || undefined
      const [prods, movs, adjs] = await Promise.all([
        productsApi.list(storeId),
        inventoryApi.movements({ store: storeId }),
        inventoryApi.stockAdjustments({ store: storeId }),
      ])
      setProducts(prods)
      setMovements(movs)
      setAdjustments(adjs)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata data. Angalia muunganisho.'
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
  // Thibitisha marekebisho
  // ------------------------------------------------------------------
  const thibitishaMarekebisho = async (id: string) => {
    try {
      await inventoryApi.approveAdjustment(id)
      setToast({ msg: 'Marekebisho yamethibitishwa.', ok: true })
      setTimeout(() => setToast(null), 3000)
      await load()
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kuthibitisha.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
    }
  }

  // ------------------------------------------------------------------
  // Uingizaji = movements za manunuzi
  // ------------------------------------------------------------------
  const uingizaji = useMemo(
    () => movements.filter((m) => m.movement_type === 'manunuzi'),
    [movements]
  )

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const jumla = products.length
    // Stoki halisi inakuja kutoka stock_levels, lakini kwa sasa tunatumia products pekee
    // (kama unataka stoki halisi, ongeza inventoryApi.stockLevels())
    const chini = products.filter((p) => p.is_active).length
    const thamani = products.reduce(
      (s, p) => s + parseFloat(p.cost_price || '0'),
      0
    )
    return { jumla, chini, thamani }
  }, [products])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Store size={26} className="text-brand-600" /> Usimamizi wa Stoki
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.full_name || 'Muuzaji'} — bidhaa, marekebisho, na uingizaji
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

      {/* ERROR */}
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

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <MiniStatSkeleton key={i} />)
        ) : (
          <>
            <MiniStat
              label="Bidhaa"
              value={String(stats.jumla)}
              Icon={Package}
              tone="text-blue-600"
            />
            <MiniStat
              label="Zinazopatikana"
              value={String(stats.chini)}
              Icon={Layers}
              tone="text-emerald-600"
            />
            <MiniStat
              label="Thamani ya Ununuzi"
              value={formatTsh(stats.thamani)}
              Icon={PackageX}
              tone="text-purple-600"
            />
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* SEHEMU 1: STOKI */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Layers size={18} className="text-brand-600" />
            Stoki ({products.length})
          </h2>
        </div>
        <StokiTable products={products} loading={loading} />
      </div>

      {/* ============================================================ */}
      {/* SEHEMU 2: MAREKEBISHO */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold flex items-center gap-2">
            <RefreshCcw size={18} className="text-brand-600" />
            Marekebisho ya Stoki ({adjustments.length})
          </h2>
        </div>
        <MarekebishoTable
          adjustments={adjustments}
          loading={loading}
          onThibitisha={thibitishaMarekebisho}
        />
      </div>

      {/* ============================================================ */}
      {/* SEHEMU 3: UINGIZAJI */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold flex items-center gap-2">
            <Truck size={18} className="text-brand-600" />
            Uingizaji wa Vifaa ({uingizaji.length})
          </h2>
        </div>
        <UingizajiTable movements={uingizaji} loading={loading} />
      </div>

      {/* TOAST */}
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

// ==================================================================
// TABLE 1: Stoki
// ==================================================================
function StokiTable({
  products,
  loading,
}: {
  products: Product[]
  loading: boolean
}) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return products
    return products.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.sku.toLowerCase().includes(query) ||
        (b.category_name || '').toLowerCase().includes(query)
    )
  }, [products, q])

  return (
    <div>
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta bidhaa..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={5} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center">
          <Package size={32} className="mx-auto text-slate-300 mb-2" />
          <div className="text-sm text-slate-500">
            {products.length === 0 ? 'Hakuna bidhaa' : 'Hakuna matokeo'}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  Bidhaa
                </th>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  Kundi
                </th>
                <th className="p-3 text-right font-medium text-xs uppercase tracking-wide">
                  Bei Mauzo
                </th>
                <th className="p-3 text-right font-medium text-xs uppercase tracking-wide">
                  Bei Ununuzi
                </th>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  Hali
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center text-slate-600 shrink-0">
                        <Package size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{b.name}</div>
                        <div className="text-xs text-slate-500">{b.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {b.category_name || '—'}
                    </span>
                  </td>
                  <td className="p-3 text-right text-brand-700 font-semibold">
                    {formatTsh(b.selling_price)}
                  </td>
                  <td className="p-3 text-right text-slate-600">
                    {formatTsh(b.cost_price)}
                  </td>
                  <td className="p-3">
                    {b.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50">
                        <CheckCircle2 size={10} /> Hai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded text-red-700 bg-red-50">
                        <XCircle size={10} /> Imezimwa
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ==================================================================
// TABLE 2: Marekebisho
// ==================================================================
function MarekebishoTable({
  adjustments,
  loading,
  onThibitisha,
}: {
  adjustments: StockAdjustment[]
  loading: boolean
  onThibitisha: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<StockAdjustment['status'] | 'zote'>(
    'zote'
  )

  const filtered = useMemo(() => {
    return adjustments.filter((m) => {
      if (filter !== 'zote' && m.status !== filter) return false
      const query = q.toLowerCase().trim()
      if (!query) return true
      return (
        m.id.toLowerCase().includes(query) ||
        (m.product_name || '').toLowerCase().includes(query) ||
        m.reason.toLowerCase().includes(query)
      )
    })
  }, [adjustments, q, filter])

  return (
    <div>
      <div className="p-3 border-b border-slate-100 space-y-2">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta kwa ID, bidhaa, au sababu..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <ListFilter size={14} className="text-slate-400" />
          {(['zote', 'inasubiri', 'imekubaliwa', 'imekataliwa'] as const).map(
            (k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
                  filter === k
                    ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {k === 'zote' ? 'Zote' : HALI_ADJ_META[k].label}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={6} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center">
          <RefreshCcw size={32} className="mx-auto text-slate-300 mb-2" />
          <div className="text-sm text-slate-500">
            {adjustments.length === 0
              ? 'Hakuna marekebisho'
              : 'Hakuna marekebisho yanayolingana'}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  ID
                </th>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  Bidhaa
                </th>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  Sababu
                </th>
                <th className="p-3 text-right font-medium text-xs uppercase tracking-wide">
                  Wingi
                </th>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  Hali
                </th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((m) => {
                const hali = HALI_ADJ_META[m.status]
                return (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-xs">
                      #{m.id.slice(0, 8)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium truncate max-w-[180px]">
                        {m.product_name || m.product}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 text-xs max-w-[200px] truncate">
                      {m.reason}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {m.quantity}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${hali.tone}`}
                      >
                        <hali.Icon size={12} />
                        {hali.label}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {m.status === 'inasubiri' && (
                        <button
                          onClick={() => onThibitisha(m.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={12} />
                          Thibitisha
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ==================================================================
// TABLE 3: Uingizaji
// ==================================================================
function UingizajiTable({
  movements,
  loading,
}: {
  movements: StockMovement[]
  loading: boolean
}) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<StockMovement | null>(null)

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return movements
    return movements.filter(
      (u) =>
        u.id.toLowerCase().includes(query) ||
        (u.product_name || '').toLowerCase().includes(query) ||
        u.note.toLowerCase().includes(query)
    )
  }, [movements, q])

  return (
    <div>
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta kwa ID, bidhaa, au maelezo..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={5} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center">
          <Truck size={32} className="mx-auto text-slate-300 mb-2" />
          <div className="text-sm text-slate-500">
            {movements.length === 0
              ? 'Hakuna uingizaji bado'
              : 'Hakuna uingizaji unaolingana'}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  ID
                </th>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  Bidhaa
                </th>
                <th className="p-3 text-right font-medium text-xs uppercase tracking-wide">
                  Wingi
                </th>
                <th className="p-3 text-right font-medium text-xs uppercase tracking-wide">
                  Bei
                </th>
                <th className="p-3 font-medium text-xs uppercase tracking-wide">
                  Tarehe
                </th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono text-xs">
                    #{u.id.slice(0, 8)}
                  </td>
                  <td className="p-3">
                    <div className="font-medium truncate max-w-[200px]">
                      {u.product_name || u.product}
                    </div>
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {u.quantity}
                  </td>
                  <td className="p-3 text-right text-brand-700 font-semibold">
                    {formatTsh(u.unit_cost)}
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelected(u)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                    >
                      <Eye size={12} />
                      Ona
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <UingizajiDetail
          movement={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ==================================================================
// Uingizaji Detail Modal
// ==================================================================
function UingizajiDetail({
  movement,
  onClose,
}: {
  movement: StockMovement
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">
              #{movement.id.slice(0, 8).toUpperCase()}
            </div>
            <div className="text-xs text-slate-500">
              {formatDate(movement.created_at)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3 text-sm">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-blue-700 bg-slate-50 border border-slate-200">
            <Truck size={12} />
            {AINA_ADJ_META[movement.movement_type]?.label || movement.movement_type}
          </div>

          <div className="p-3 rounded-lg bg-slate-50 space-y-1">
            <div className="text-xs text-slate-500">Bidhaa</div>
            <div className="font-medium">
              {movement.product_name || movement.product}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-500">Wingi</div>
              <div className="font-bold">{movement.quantity}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-500">Bei ya Unit</div>
              <div className="font-bold text-brand-700">
                {formatTsh(movement.unit_cost)}
              </div>
            </div>
          </div>

          {movement.note && (
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-500 mb-1">Maelezo</div>
              <div>{movement.note}</div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 space-y-1">
            <div className="text-xs text-slate-500">Imewekwa na</div>
            <div className="flex items-center gap-1.5">
              <User size={14} /> {movement.created_by}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================================================================
// Skeletons
// ==================================================================
function MiniStatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="w-9 h-9 rounded-lg bg-slate-200 animate-pulse" />
      <SkeletonLine className="h-3 w-20 mt-2.5" />
      <SkeletonLine className="h-5 w-24 mt-2" />
    </div>
  )
}

function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div
      className="grid gap-2 items-center"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}

// ==================================================================
// MiniStat
// ==================================================================
function MiniStat({
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
        className={`w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center ${tone}`}
      >
        <Icon size={16} />
      </div>
      <div className="text-xs text-slate-500 mt-2.5">{label}</div>
      <div className="text-sm md:text-base font-bold text-slate-900 mt-0.5 truncate">
        {value}
      </div>
    </div>
  )
}