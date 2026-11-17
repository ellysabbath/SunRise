import { useEffect, useMemo, useState } from 'react'
import {
  Store, Users, Package, Plus, X, Save, MapPin,
  AlertTriangle, CheckCircle2, RefreshCw, Loader2,
  TrendingUp, TrendingDown, Pencil,
} from 'lucide-react'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { ordersApi, type Order } from '../../services/orders'
import { productsApi, type Product } from '../../services/products'
import { staffApi, type Salary } from '../../services/staff'
import { expensesApi, type Expense } from '../../services/expenses'
import { inventoryApi, type StockLevel } from '../../services/inventory'
import { usersApi, type User } from '../../services/users'
import { formatTsh } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Types za ndani
// ==================================================================
interface Faida {
  mauzo: number
  cogs: number
  faidaGhafi: number
  opex: number
  mishahara: number
  jumlaGharama: number
  faidaSafi: number
  hasara: boolean
}

interface DukaStats {
  duka: StoreType
  faida: Faida
  wafanyakazi: number
  stokiJumla: number
  stokiThamani: number
}

// ==================================================================
// Page
// ==================================================================
export default function MmilikiMaduka() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editStore, setEditStore] = useState<StoreType | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ------------------------------------------------------------------
  // Load data
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [str, ords, prods, sals, exps, stocks, usrs] = await Promise.all([
        storesApi.list(),
        ordersApi.list(),
        productsApi.list(),
        staffApi.salaries(),
        expensesApi.list(),
        inventoryApi.stockLevels(),
        usersApi.list().catch(() => [] as User[]), // kama endpoint haipo, rudi tupu
      ])
      setStores(str)
      setOrders(ords)
      setProducts(prods)
      setSalaries(sals)
      setExpenses(exps)
      setStockLevels(stocks)
      setUsers(usrs)
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
  }, [])

  // ------------------------------------------------------------------
  // Faida calculation kwa duka
  // ------------------------------------------------------------------
  const computeFaida = (storeId: string): Faida => {
    const storeOrders = orders.filter(
      (o) => o.store === storeId && o.status === 'imekamilika'
    )
    const storeSalaries = salaries.filter((s) => s.store === storeId)
    const storeExpenses = expenses.filter((e) => e.store === storeId)

    // Mauzo
    const mauzo = storeOrders.reduce(
      (s, o) => s + parseFloat(o.total || '0'),
      0
    )

    // COGS
    const cogs = storeOrders.reduce((s, o) => {
      return (
        s +
        o.items.reduce(
          (a, it) =>
            a +
            parseFloat(it.unit_cost || '0') *
              parseFloat(it.quantity || '0'),
          0
        )
      )
    }, 0)

    // Opex
    const opex = storeExpenses.reduce(
      (s, e) => s + parseFloat(e.amount || '0'),
      0
    )

    // Mishahara (zilizolipwa)
    const mishahara = storeSalaries
      .filter((s) => s.status === 'imelipwa')
      .reduce((s, x) => s + parseFloat(x.total_paid || '0'), 0)

    const faidaGhafi = mauzo - cogs
    const jumlaGharama = opex + mishahara
    const faidaSafi = faidaGhafi - jumlaGharama

    return {
      mauzo,
      cogs,
      faidaGhafi,
      opex,
      mishahara,
      jumlaGharama,
      faidaSafi,
      hasara: faidaSafi < 0,
    }
  }

  // ------------------------------------------------------------------
  // Duka stats
  // ------------------------------------------------------------------
  const dukaStats: DukaStats[] = useMemo(() => {
    return stores.map((d) => {
      const faida = computeFaida(d.id)

      // Wafanyakazi wa duka hili
      const wafanyakazi = users.filter(
        (u) =>
          u.store === d.id &&
          ['muuzaji', 'mhazini', 'admin'].includes(u.role)
      ).length

      // Stoki ya duka hili
      const storeStock = stockLevels.filter((s) => s.store === d.id)
      const stokiJumla = storeStock.reduce(
        (s, x) => s + parseFloat(x.quantity || '0'),
        0
      )

      // Thamani ya stoki = quantity × cost_price ya product
      const stokiThamani = storeStock.reduce((s, x) => {
        const product = products.find((p) => p.id === x.product)
        if (!product) return s
        return (
          s +
          parseFloat(x.quantity || '0') * parseFloat(product.cost_price || '0')
        )
      }, 0)

      return {
        duka: d,
        faida,
        wafanyakazi,
        stokiJumla,
        stokiThamani,
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })
  }, [stores, orders, salaries, expenses, stockLevels, users, products])

  // ------------------------------------------------------------------
  // Jumla ya stats
  // ------------------------------------------------------------------
  const jumla = useMemo(
    () =>
      dukaStats.reduce(
        (a, x) => ({
          maduka: a.maduka + 1,
          wafanyakazi: a.wafanyakazi + x.wafanyakazi,
          stokiJumla: a.stokiJumla + x.stokiJumla,
          mauzo: a.mauzo + x.faida.mauzo,
          faida: a.faida + x.faida.faidaSafi,
        }),
        { maduka: 0, wafanyakazi: 0, stokiJumla: 0, mauzo: 0, faida: 0 }
      ),
    [dukaStats]
  )

  // ------------------------------------------------------------------
  // Ongeza duka
  // ------------------------------------------------------------------
  const ongezaDuka = async (data: { name: string; location: string }) => {
    try {
      const newStore = await storesApi.create(data)
      setStores((prev) => [...prev, newStore])
      setOpen(false)
      setToast({ msg: `Duka "${newStore.name}" limeongezwa.`, ok: true })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kuongeza duka.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
      throw err
    }
  }

  // ------------------------------------------------------------------
  // Hariri duka
  // ------------------------------------------------------------------
  const haririDuka = async (
    id: string,
    data: { name: string; location: string }
  ) => {
    try {
      const updated = await storesApi.update(id, data)
      setStores((prev) => prev.map((s) => (s.id === id ? updated : s)))
      setEditStore(null)
      setToast({ msg: `Duka "${updated.name}" limehaririwa.`, ok: true })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      setToast({
        msg:
          err?.response?.data?.detail || 'Imeshindikana kuhariri duka.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
      throw err
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
            <Store size={26} className="text-brand-600" /> Maduka Yangu
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Simamia maduka yote ya biashara
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Sasisha
          </button>
          <button
            onClick={() => setOpen(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} /> Ongeza Duka
          </button>
        </div>
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

      {/* Stats za jumla */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <MiniStatSkeleton key={i} />)
        ) : (
          <>
            <MiniStat
              label="Maduka"
              value={String(jumla.maduka)}
              Icon={Store}
              tone="text-blue-600"
            />
            <MiniStat
              label="Wafanyakazi"
              value={String(jumla.wafanyakazi)}
              Icon={Users}
              tone="text-purple-600"
            />
            <MiniStat
              label="Stoki"
              value={`${jumla.stokiJumla.toLocaleString()} pcs`}
              Icon={Package}
              tone="text-emerald-600"
            />
            <MiniStat
              label="Mauzo"
              value={formatTsh(jumla.mauzo)}
              Icon={TrendingUp}
              tone="text-blue-600"
            />
            <MiniStat
              label="Faida Safi"
              value={formatTsh(jumla.faida)}
              Icon={TrendingUp}
              tone={jumla.faida < 0 ? 'text-red-600' : 'text-emerald-600'}
            />
          </>
        )}
      </div>

      {/* Loading — skeleton grid */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <DukaSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && stores.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Store size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">Hakuna duka bado</h3>
          <p className="text-sm text-slate-500 mt-1">
            Bofya "Ongeza Duka" kuanza.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700"
          >
            <Plus size={16} /> Ongeza Duka
          </button>
        </div>
      )}

      {/* Grid ya maduka */}
      {!loading && dukaStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {dukaStats.map((stats) => (
            <div
              key={stats.duka.id}
              className="bg-white rounded-2xl border border-slate-200 p-4"
            >
              {/* Header ya duka */}
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 text-brand-600 grid place-items-center">
                  <Store size={20} />
                </div>
                <div className="flex items-center gap-1.5">
                  {stats.duka.is_active ? (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      <CheckCircle2 size={10} /> Hai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      <X size={10} /> Imezimwa
                    </span>
                  )}
                  <button
                    onClick={() => setEditStore(stats.duka)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors"
                    title="Hariri duka"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              {/* Jina + mahali */}
              <div className="mt-3">
                <div className="font-semibold truncate">{stats.duka.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {stats.duka.location}
                </div>
              </div>

              {/* Fedha */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div>
                  <div className="text-slate-500">Mauzo</div>
                  <div className="font-bold text-brand-700 truncate">
                    {formatTsh(stats.faida.mauzo)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Faida Safi</div>
                  <div
                    className={`font-bold truncate ${
                      stats.faida.hasara ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatTsh(stats.faida.faidaSafi)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Mishahara</div>
                  <div className="font-bold text-purple-700 truncate">
                    {formatTsh(stats.faida.mishahara)}
                  </div>
                </div>
              </div>

              {/* Operesheni */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <div className="text-slate-500">Wafanyakazi</div>
                  <div className="font-semibold">{stats.wafanyakazi}</div>
                </div>
                <div>
                  <div className="text-slate-500">Stoki</div>
                  <div className="font-semibold">
                    {stats.stokiJumla.toLocaleString()} pcs
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Thamani</div>
                  <div className="font-semibold text-slate-900 truncate">
                    {formatTsh(stats.stokiThamani)}
                  </div>
                </div>
              </div>

              {/* Hali ya biashara */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500">Hali ya biashara</span>
                {stats.faida.hasara ? (
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                    <TrendingDown size={12} /> Hasara
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <TrendingUp size={12} /> Faida
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Ongeza */}
      {open && (
        <FomuDuka onClose={() => setOpen(false)} onSubmit={ongezaDuka} />
      )}

      {/* Modal - Hariri */}
      {editStore && (
        <FomuDuka
          onClose={() => setEditStore(null)}
          onSubmit={(data) => haririDuka(editStore.id, data)}
          initialData={{
            name: editStore.name,
            location: editStore.location,
          }}
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

// ==================================================================
// Skeletons
// ==================================================================
function MiniStatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="w-9 h-9 rounded-lg bg-slate-200 animate-pulse" />
      <SkeletonLine className="h-3 w-16 mt-2.5" />
      <SkeletonLine className="h-5 w-20 mt-2" />
    </div>
  )
}

function DukaSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-lg bg-slate-200 animate-pulse" />
        <div className="w-12 h-5 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="mt-3 space-y-1.5">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-3 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================================================================
// FomuDuka
// ==================================================================
function FomuDuka({
  onClose,
  onSubmit,
  initialData,
}: {
  onClose: () => void
  onSubmit: (data: { name: string; location: string }) => Promise<void>
  initialData?: { name: string; location: string }
}) {
  const [name, setName] = useState(initialData?.name || '')
  const [location, setLocation] = useState(initialData?.location || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isEdit = !!initialData

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Jina la duka linahitajika')
    if (!location.trim()) return setError('Mahali panahitajika')

    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        location: location.trim(),
      })
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.name?.[0] ||
          'Imeshindikana kuhifadhi duka.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !loading && onClose()}
      />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">
              {isEdit ? 'Hariri Duka' : 'Ongeza Duka Jipya'}
            </div>
            <div className="text-xs text-slate-500">
              {isEdit ? 'Badilisha taarifa za duka' : 'Weka taarifa za duka'}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label className="text-sm font-medium">
              Jina la Duka <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mfano: Smart Hardware - Mbezi"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Mahali <span className="text-red-500">*</span>
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Mfano: Mbezi, Dar"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              Ghairi
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Inahifadhi...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isEdit ? 'Hifadhi Marekebisho' : 'Hifadhi Duka'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}