import { useEffect, useMemo, useState } from 'react'
import {
  Users, Phone, MapPin, Search, RefreshCw, AlertTriangle,
  Loader2, Wallet, TrendingUp, User,
} from 'lucide-react'
import { customersApi, type Customer } from '../../services/customers'
import { ordersApi, type Order } from '../../services/orders'
import { formatTsh } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Types
// ==================================================================
interface OrderPayment {
  id: string
  amount: string
  status: 'inasubiri' | 'imethibitishwa' | 'imekataliwa'
}

interface OrderData {
  id: string
  customer: string
  total: string
  payments: OrderPayment[]
}

// ==================================================================
// Page
// ==================================================================
export default function MmilikiWateja() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [custs, ords] = await Promise.all([
        customersApi.list(),
        ordersApi.list(),
      ])
      setCustomers(custs)
      setOrders(ords as OrderData[])
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata wateja. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // ------------------------------------------------------------------
  // Deni kwa mteja (kutoka orders)
  // ------------------------------------------------------------------
  const deniKwaMteja = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    orders.forEach((o) => {
      const confirmed = o.payments
        .filter((p) => p.status === 'imethibitishwa')
        .reduce((s, p) => s + parseFloat(p.amount || '0'), 0)
      const baki = Math.max(parseFloat(o.total || '0') - confirmed, 0)
      map[o.customer] = (map[o.customer] || 0) + baki
    })
    return map
  }, [orders])

  // ------------------------------------------------------------------
  // Manunuzi kwa mteja (jumla ya orders)
  // ------------------------------------------------------------------
  const manunuziKwaMteja = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    orders.forEach((o) => {
      map[o.customer] = (map[o.customer] || 0) + parseFloat(o.total || '0')
    })
    return map
  }, [orders])

  // ------------------------------------------------------------------
  // Filter + search
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return customers
    return customers.filter(
      (m) =>
        m.full_name.toLowerCase().includes(query) ||
        m.phone.includes(query)
    )
  }, [customers, q])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const jumla = customers.length
    const jumlaManunuzi = customers.reduce(
      (s, m) => s + (manunuziKwaMteja[m.id] || 0),
      0
    )
    const jumlaDeni = customers.reduce(
      (s, m) => s + (deniKwaMteja[m.id] || 0),
      0
    )
    return { jumla, jumlaManunuzi, jumlaDeni }
  }, [customers, deniKwaMteja, manunuziKwaMteja])

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users size={26} className="text-brand-600" /> Wateja
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Wateja wote wa maduka yako
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat
              label="Wateja"
              value={String(stats.jumla)}
              Icon={Users}
              tone="text-blue-600"
            />
            <Stat
              label="Manunuzi Yote"
              value={formatTsh(stats.jumlaManunuzi)}
              Icon={TrendingUp}
              tone="text-emerald-600"
            />
            <Stat
              label="Madeni Yote"
              value={formatTsh(stats.jumlaDeni)}
              Icon={Wallet}
              tone={stats.jumlaDeni > 0 ? 'text-red-600' : 'text-emerald-600'}
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

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tafuta kwa jina au simu..."
          className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm bg-white"
        />
      </div>

      {/* Loading — skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <WatejaSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {q ? 'Hakuna matokeo' : 'Hakuna wateja bado'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q
              ? 'Badilisha neno la utafutaji.'
              : 'Wateja wataonekana hapa mara waundwe.'}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((m) => {
            const deni = deniKwaMteja[m.id] || 0
            const manunuzi = manunuziKwaMteja[m.id] || 0
            const initials = m.full_name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200 text-slate-700 grid place-items-center text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {m.full_name}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      {m.customer_type}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} /> {m.phone}
                  </div>
                  {m.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} /> {m.location}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500">Manunuzi</div>
                    <div className="font-bold text-brand-700 truncate">
                      {formatTsh(manunuzi)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Deni</div>
                    <div
                      className={`font-bold truncate ${
                        deni > 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatTsh(deni)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
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
// Skeleton
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

function WatejaSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-slate-200 animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5">
          <SkeletonLine className="h-4 w-3/4" />
          <SkeletonLine className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <SkeletonLine className="h-3 w-1/2" />
        <SkeletonLine className="h-3 w-2/5" />
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <SkeletonLine className="h-3 w-16" />
          <SkeletonLine className="h-4 w-20" />
        </div>
        <div className="space-y-1.5">
          <SkeletonLine className="h-3 w-12" />
          <SkeletonLine className="h-4 w-16" />
        </div>
      </div>
    </div>
  )
}