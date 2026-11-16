import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, Wallet, RefreshCw, AlertTriangle,
  Store, Loader2,
} from 'lucide-react'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { ordersApi, type Order } from '../../services/orders'
import { expensesApi, type Expense } from '../../services/expenses'
import { staffApi, type Salary } from '../../services/staff'
import { formatTsh } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Types
// ==================================================================
interface Faida {
  mauzo: number
  cogs: number
  faidaGhafi: number
  jumlaOpex: number
  jumlaMishahara: number
  jumlaGharama: number
  faidaSafi: number
  zaka: number
  sadaka: number
  jumlaYaMungu: number
  inayobaki: number
  hasara: boolean
}

// ==================================================================
// Page
// ==================================================================
export default function MmilikiFaida() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [salaries, setSalaries] = useState<Salary[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStore, setSelectedStore] = useState<string>('zote')

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const results = await Promise.allSettled([
        storesApi.list(),
        ordersApi.list(),
        expensesApi.list(),
        staffApi.salaries(),
      ])

      setStores(
        results[0].status === 'fulfilled' ? results[0].value : []
      )
      setOrders(
        results[1].status === 'fulfilled' ? results[1].value : []
      )
      setExpenses(
        results[2].status === 'fulfilled' ? results[2].value : []
      )
      setSalaries(
        results[3].status === 'fulfilled' ? results[3].value : []
      )

      if (results[0].status === 'rejected') {
        const reason: any = results[0].reason
        setError(
          reason?.response?.data?.detail ||
            'Imeshindikana kupata data. Angalia muunganisho.'
        )
      }
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
  // Compute faida
  // ------------------------------------------------------------------
  const computeFaida = useMemo(() => {
    const storeId = selectedStore === 'zote' ? undefined : selectedStore

    const filteredOrders = storeId
      ? orders.filter((o) => o.store === storeId)
      : orders
    const filteredExpenses = storeId
      ? expenses.filter((e) => e.store === storeId)
      : expenses
    const filteredSalaries = storeId
      ? salaries.filter((s) => s.store === storeId)
      : salaries

    // Orders zilizokamilika
    const completed = filteredOrders.filter(
      (o) => o.status === 'imekamilika'
    )

    // Mauzo
    const mauzo = completed.reduce(
      (s, o) => s + parseFloat(o.total || '0'),
      0
    )

    // COGS
    const cogs = completed.reduce((s, o) => {
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
    const jumlaOpex = filteredExpenses.reduce(
      (s, e) => s + parseFloat(e.amount || '0'),
      0
    )

    // Mishahara (zilizolipwa)
    const jumlaMishahara = filteredSalaries
      .filter((s) => s.status === 'imelipwa')
      .reduce((s, x) => s + parseFloat(x.total_paid || '0'), 0)

    // Faida
    const faidaGhafi = mauzo - cogs
    const jumlaGharama = jumlaOpex + jumlaMishahara
    const faidaSafi = faidaGhafi - jumlaGharama

    // Zaka 10% + Sadaka 10%
    const zaka = faidaSafi > 0 ? faidaSafi * 0.1 : 0
    const sadaka = faidaSafi > 0 ? faidaSafi * 0.1 : 0
    const jumlaYaMungu = zaka + sadaka
    const inayobaki = faidaSafi - jumlaYaMungu

    return {
      mauzo,
      cogs,
      faidaGhafi,
      jumlaOpex,
      jumlaMishahara,
      jumlaGharama,
      faidaSafi,
      zaka,
      sadaka,
      jumlaYaMungu,
      inayobaki,
      hasara: faidaSafi < 0,
    } as Faida
  }, [orders, expenses, salaries, selectedStore])

  const f = computeFaida

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Faida / Hasara
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Muhtasari wa faida kwa maduka yote
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
        </div>
      </div>

      {/* Filter kwa duka */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4">
        <label className="text-xs font-medium text-slate-700">
          Chuja kwa Duka
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStore('zote')}
            className={`px-3 py-2 rounded-lg text-sm border transition ${
              selectedStore === 'zote'
                ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Store size={14} className="inline mr-1" />
            Maduka Yote
          </button>
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStore(s.id)}
              className={`px-3 py-2 rounded-lg text-sm border transition ${
                selectedStore === s.id
                  ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Store size={14} className="inline mr-1" />
              {s.name.replace('Smart Hardware - ', '')}
            </button>
          ))}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <BoxSkeleton key={i} />)
        ) : (
          <>
            <Box
              label="Mauzo"
              value={formatTsh(f.mauzo)}
              tone="text-blue-600"
              Icon={TrendingUp}
            />
            <Box
              label="Faida Ghafi"
              value={formatTsh(f.faidaGhafi)}
              tone="text-emerald-600"
              Icon={TrendingUp}
            />
            <Box
              label="Gharama Zote"
              value={formatTsh(f.jumlaGharama)}
              tone="text-red-600"
              Icon={Wallet}
            />
            <Box
              label="Faida Safi"
              value={formatTsh(f.faidaSafi)}
              tone={f.hasara ? 'text-red-600' : 'text-emerald-700'}
              Icon={f.hasara ? TrendingDown : TrendingUp}
            />
          </>
        )}
      </div>

      {/* Jedwali */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <SkeletonLine className="h-4 w-32" />
                <SkeletonLine className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <Row label="Mauzo" value={formatTsh(f.mauzo)} />
            <Row label="COGS" value={formatTsh(f.cogs)} tone="text-amber-700" />
            <Row
              label="Faida Ghafi"
              value={formatTsh(f.faidaGhafi)}
              tone="text-brand-700"
              bold
            />
            <Row
              label="Opex (bila mishahara)"
              value={formatTsh(f.jumlaOpex)}
              tone="text-orange-700"
            />
            <Row
              label="Mishahara"
              value={formatTsh(f.jumlaMishahara)}
              tone="text-purple-700"
            />
            <Row
              label="Gharama Zote"
              value={formatTsh(f.jumlaGharama)}
              tone="text-red-600"
              bold
            />
            <div className="pt-2 mt-2 border-t border-slate-200" />
            <Row
              label="Faida Safi"
              value={formatTsh(f.faidaSafi)}
              tone={f.hasara ? 'text-red-700' : 'text-emerald-700'}
              bold
            />
            <Row label="Zaka (10%)" value={formatTsh(f.zaka)} />
            <Row label="Sadaka (10%)" value={formatTsh(f.sadaka)} />
            <Row
              label="Inayobaki"
              value={formatTsh(f.inayobaki)}
              tone="text-emerald-700"
              bold
            />
          </>
        )}
      </div>
    </div>
  )
}

// ==================================================================
// Box
// ==================================================================
function Box({
  label,
  value,
  tone,
  Icon,
}: {
  label: string
  value: string
  tone: string
  Icon: React.ElementType
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
// Row
// ==================================================================
function Row({
  label,
  value,
  tone,
  bold,
}: {
  label: string
  value: string
  tone?: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span
        className={`${bold ? 'font-bold' : 'font-semibold'} ${
          tone ?? 'text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

// ==================================================================
// Skeleton
// ==================================================================
function BoxSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
      <SkeletonLine className="h-3 w-20 mt-3" />
      <SkeletonLine className="h-5 w-24 mt-2" />
    </div>
  )
}