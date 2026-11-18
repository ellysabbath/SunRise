
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  HandCoins,
  ChevronRight,
  ShoppingBag,
  Receipt,
  Building2,
  Activity,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'

import { storesApi, type Store } from '../../services/stores'
import { ordersApi, type Order } from '../../services/orders'
import {
  expensesApi,
  type ExpenseRequest,
} from '../../services/expenses'
import { staffApi, type Salary } from '../../services/staff'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ================================================================
// TYPES
// ================================================================

interface Faida {
  mauzo: number
  cogs: number
  faidaGhafi: number
  opex: number
  mishahara: number
  jumlaGharama: number
  faidaSafi: number
  zaka: number
  sadaka: number
  jumlaYaMungu: number
  hasara: boolean
}

interface ExpenseRow {
  store?: string | null
  amount?: string | number | null
}

// ================================================================
// HELPERS
// ================================================================

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function getErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string
        message?: string
      }
    }
    message?: string
  }

  return (
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    'Imeshindikana kupata data. Angalia muunganisho.'
  )
}

function isPendingRequest(request: ExpenseRequest): boolean {
  const status = String(request.status ?? '')
    .trim()
    .toLowerCase()

  return status === 'pending' || status === 'inasubiri'
}

// ================================================================
// PAGE
// ================================================================

export default function MmilikiDashboard() {
  const navigate = useNavigate()

  const [stores, setStores] = useState<Store[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [requests, setRequests] = useState<ExpenseRequest[]>([])
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ==============================================================
  // LOAD DATA
  // ==============================================================

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [str, ords, reqs, sals, exps] = await Promise.all([
        storesApi.list(),
        ordersApi.list(),
        expensesApi.requests(),
        staffApi.salaries(),
        expensesApi.list(),
      ])

      setStores(Array.isArray(str) ? str : [])
      setOrders(Array.isArray(ords) ? ords : [])

      // API requests() haitumii argument.
      // Tunachuja maombi yanayosubiri hapa hapa.
      setRequests(
        Array.isArray(reqs)
          ? reqs.filter(isPendingRequest)
          : []
      )

      setSalaries(Array.isArray(sals) ? sals : [])

      setExpenses(
        Array.isArray(exps)
          ? (exps as ExpenseRow[])
          : []
      )
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // ==============================================================
  // INITIAL LOAD AND AUTO REFRESH
  // ==============================================================

  useEffect(() => {
    void load()

    const timer = window.setInterval(() => {
      void load()
    }, 60000)

    return () => {
      window.clearInterval(timer)
    }
  }, [load])

  // ==============================================================
  // PROFIT CALCULATION
  // ==============================================================

  const computeFaida = useMemo(() => {
    return (storeId?: string): Faida => {
      const ordersFiltered = storeId
        ? orders.filter((o) => o.store === storeId)
        : orders

      const salariesFiltered = storeId
        ? salaries.filter((s) => s.store === storeId)
        : salaries

      const expensesFiltered = storeId
        ? expenses.filter((e) => e.store === storeId)
        : expenses

      // Mauzo kutoka orders zilizokamilika
      const completed = ordersFiltered.filter(
        (o) => o.status === 'imekamilika'
      )

      const mauzo = completed.reduce(
        (sum, order) => sum + toNumber(order.total),
        0
      )

      // COGS kutoka bidhaa zilizouzwa
      const cogs = completed.reduce((sum, order) => {
        const items = Array.isArray(order.items)
          ? order.items
          : []

        const orderCost = items.reduce((itemSum, item) => {
          const unitCost = toNumber(item.unit_cost)
          const quantity = toNumber(item.quantity)

          return itemSum + unitCost * quantity
        }, 0)

        return sum + orderCost
      }, 0)

      // Gharama za uendeshaji
      const opex = expensesFiltered.reduce(
        (sum, expense) => sum + toNumber(expense.amount),
        0
      )

      // Mishahara iliyolipwa
      const mishahara = salariesFiltered
        .filter((salary) => salary.status === 'imelipwa')
        .reduce(
          (sum, salary) => sum + toNumber(salary.total_paid),
          0
        )

      const faidaGhafi = mauzo - cogs
      const jumlaGharama = opex + mishahara
      const faidaSafi = faidaGhafi - jumlaGharama

      const zaka = faidaSafi > 0 ? faidaSafi * 0.1 : 0
      const sadaka = faidaSafi > 0 ? faidaSafi * 0.1 : 0
      const jumlaYaMungu = zaka + sadaka

      return {
        mauzo,
        cogs,
        faidaGhafi,
        opex,
        mishahara,
        jumlaGharama,
        faidaSafi,
        zaka,
        sadaka,
        jumlaYaMungu,
        hasara: faidaSafi < 0,
      }
    }
  }, [orders, salaries, expenses])

  const f = useMemo(
    () => computeFaida(),
    [computeFaida]
  )

  // ==============================================================
  // GENERAL STATISTICS
  // ==============================================================

  const stats = useMemo(() => {
    const ordersZinazosubiri = orders.filter(
      (order) => order.status === 'inasubiri_malipo'
    ).length

    const maombiYanasubiri = requests.length

    const jumlaDeni = orders
      .filter((order) => order.status === 'inasubiri_malipo')
      .reduce(
        (sum, order) => sum + toNumber(order.total),
        0
      )

    return {
      ordersZinazosubiri,
      maombiYanasubiri,
      jumlaDeni,
    }
  }, [orders, requests])

  // ==============================================================
  // PROFIT PER STORE
  // ==============================================================

  const faidaKwaDuka = useMemo(
    () =>
      stores.map((store) => ({
        duka: store,
        ...computeFaida(store.id),
      })),
    [stores, computeFaida]
  )

  // ==============================================================
  // RECENT RECORDS
  // ==============================================================

  const ordersZaKaribuni = useMemo(
    () => orders.slice(0, 5),
    [orders]
  )

  const maombiYaKaribuni = useMemo(
    () => requests.slice(0, 3),
    [requests]
  )

  const maxMauzo = Math.max(
    ...faidaKwaDuka.map((item) => item.mauzo),
    1
  )

  // ==============================================================
  // RENDER
  // ==============================================================

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Dashboard ya Mmiliki
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Muhtasari wa maduka yote — mauzo, faida, zaka na orders
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
            {new Date().toLocaleDateString('sw-TZ', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={loading ? 'animate-spin' : ''}
            />
            Sasisha
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <div className="flex-1">
            {error}
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-semibold underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))
        ) : (
          <>
            <Stat
              label="Mauzo Yote"
              value={formatTsh(f.mauzo)}
              sub={`Maduka ${stores.length}`}
              Icon={ShoppingBag}
              tone="text-blue-600"
            />

            <Stat
              label="Faida Safi"
              value={formatTsh(f.faidaSafi)}
              sub={
                f.hasara
                  ? 'Biashara ina hasara'
                  : 'Baada ya gharama zote'
              }
              Icon={f.hasara ? TrendingDown : TrendingUp}
              tone={f.hasara ? 'text-red-600' : 'text-emerald-600'}
            />

            <Stat
              label="Deni la Kukusanya"
              value={formatTsh(stats.jumlaDeni)}
              sub={`Orders ${stats.ordersZinazosubiri}`}
              Icon={Wallet}
              tone="text-amber-600"
            />

            <Stat
              label="Maombi Yanayosubiri"
              value={String(stats.maombiYanasubiri)}
              sub="Yanasubiri idhini"
              Icon={Activity}
              tone="text-purple-600"
            />
          </>
        )}
      </div>

      {/* ZAKA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 grid place-items-center shrink-0">
              <HandCoins size={24} />
            </div>

            <div>
              <div className="text-sm text-slate-500">
                Kwa Bwana Wiki Hii
              </div>

              {loading ? (
                <>
                  <SkeletonLine className="h-8 w-32 mt-1" />
                  <SkeletonLine className="h-3 w-48 mt-1" />
                </>
              ) : (
                <>
                  <div className="text-2xl md:text-3xl font-bold text-slate-900 mt-0.5">
                    {formatTsh(f.jumlaYaMungu)}
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Zaka {formatTsh(f.zaka)} + Sadaka {formatTsh(f.sadaka)}
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/mmiliki/zaka')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition self-start sm:self-auto"
          >
            <HandCoins size={16} />
            Nenda Zaka
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* STORE PROFIT AND EXPENSE REQUESTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* PROFIT PER STORE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold flex items-center gap-2">
              <Building2 size={18} className="text-brand-600" />
              Faida kwa Duka
            </h2>

            <button
              type="button"
              onClick={() => navigate('/mmiliki/mauzo')}
              className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 font-medium"
            >
              Ona Zote
              <ChevronRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <SkeletonLine className="h-4 w-32" />
                    <SkeletonLine className="h-4 w-20" />
                  </div>

                  <SkeletonLine className="h-2 w-full" />
                  <SkeletonLine className="h-3 w-24" />
                </div>
              ))}
            </div>
          ) : faidaKwaDuka.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">
              Hakuna maduka bado
            </div>
          ) : (
            <div className="space-y-4">
              {faidaKwaDuka.map((fd) => {
                const percentage = Math.min(
                  100,
                  Math.max(0, (fd.mauzo / maxMauzo) * 100)
                )

                return (
                  <div key={fd.duka.id}>
                    <div className="flex justify-between items-center text-sm mb-1.5">
                      <span className="font-medium text-slate-700 truncate">
                        {fd.duka.name.replace('Smart Hardware - ', '')}
                      </span>

                      <span className="font-semibold text-slate-900 whitespace-nowrap ml-2">
                        {formatTsh(fd.mauzo)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                      <span>
                        Faida: {formatTsh(fd.faidaSafi)}
                      </span>

                      {fd.hasara ? (
                        <span className="text-red-600 font-semibold">
                          Hasara
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">
                          Faida
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PENDING EXPENSE REQUESTS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold flex items-center gap-2">
              <Receipt size={18} className="text-brand-600" />
              Maombi Yanayosubiri
            </h2>

            <button
              type="button"
              onClick={() => navigate('/mmiliki/matumizi')}
              className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 font-medium"
            >
              Ona Zote
              <ChevronRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-100"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-200 animate-pulse shrink-0" />

                  <div className="flex-1 space-y-1.5">
                    <SkeletonLine className="h-4 w-3/4" />
                    <SkeletonLine className="h-3 w-1/2" />
                  </div>

                  <SkeletonLine className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : maombiYaKaribuni.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">
              Hakuna maombi yanayosubiri
            </div>
          ) : (
            <div className="space-y-2">
              {maombiYaKaribuni.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => navigate('/mmiliki/matumizi')}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition border border-slate-100"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 grid place-items-center shrink-0">
                    <Receipt size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {m.description || 'Ombi la matumizi'}
                    </div>

                    <div className="text-xs text-slate-500 truncate">
                      {m.requested_by_name || '—'}
                      {' — '}
                      {m.store_name || '—'}
                    </div>
                  </div>

                  <div className="text-sm font-bold text-slate-900 whitespace-nowrap">
                    {formatTsh(m.amount)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT ORDERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-600" />
            Orders za Karibuni
          </h2>

          <button
            type="button"
            onClick={() => navigate('/mmiliki/orders')}
            className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 font-medium"
          >
            Ona Zote
            <ChevronRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3.5 border-b border-slate-100 last:border-0"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-200 animate-pulse shrink-0" />

                <div className="flex-1 space-y-1.5">
                  <SkeletonLine className="h-4 w-2/3" />
                  <SkeletonLine className="h-3 w-1/2" />
                </div>

                <SkeletonLine className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : ordersZaKaribuni.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">
            Hakuna orders bado
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ordersZaKaribuni.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => navigate('/mmiliki/orders')}
                className="w-full text-left py-3.5 flex items-center gap-3 hover:bg-slate-50 -mx-3 px-3 rounded-lg transition first:pt-0 last:pb-0"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 grid place-items-center shrink-0">
                  <ShoppingBag size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    #{String(o.id).slice(0, 8).toUpperCase()}
                    {' — '}
                    {o.customer_name || 'Mteja'}
                  </div>

                  <div className="text-xs text-slate-500 truncate">
                    {formatDate(o.order_date)}
                    {' — '}
                    {Array.isArray(o.items) ? o.items.length : 0} bidhaa
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-slate-900">
                    {formatTsh(o.total)}
                  </div>

                  <div
                    className={`text-[10px] uppercase font-semibold ${
                      o.status === 'imekamilika'
                        ? 'text-emerald-600'
                        : o.status === 'inasubiri_malipo'
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }`}
                  >
                    {String(o.status ?? '').replace(/_/g, ' ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================================
// STAT COMPONENT
// ================================================================

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
  Icon: ElementType
  tone: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
      <div
        className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center ${tone}`}
      >
        <Icon size={18} />
      </div>

      <div className="text-xs font-medium text-slate-500 mt-3 uppercase tracking-wide">
        {label}
      </div>

      <div className="text-lg md:text-xl font-bold text-slate-900 mt-1 truncate">
        {value}
      </div>

      {sub && (
        <div className="text-xs text-slate-500 mt-0.5 truncate">
          {sub}
        </div>
      )}
    </div>
  )
}

// ================================================================
// STAT SKELETON
// ================================================================

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
      <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />

      <SkeletonLine className="h-3 w-20 mt-3" />

      <SkeletonLine className="h-6 w-24 mt-2" />

      <SkeletonLine className="h-3 w-16 mt-1" />
    </div>
  )
}
