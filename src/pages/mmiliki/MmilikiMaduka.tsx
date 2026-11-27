
import { useEffect, useMemo, useState } from 'react'
import type { ElementType, FormEvent } from 'react'
import {
  Store,
  Users,
  
  Plus,
  X,
  Save,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Pencil,
  Phone,
  UserRound,
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

// ================================================================
// TYPES
// ================================================================

/**
 * Muundo wa assignment unaotarajiwa kutoka backend.
 *
 * store inaweza kuwa UUID string au object yenye id.
 */
interface WorkerStoreAssignment {
  id?: string
  store: string | { id: string }
  is_active: boolean
}

/**
 * Tunapanua User bila kuharibu type iliyopo kwenye services/users.ts.
 *
 * Backend ikirudisha store_assignments, ukurasa utaweza kuonyesha
 * mfanyakazi kwenye maduka yote aliyopangiwa.
 *
 * Kama backend bado inatumia user.store, bado itafanya kazi.
 */
type UserWithAssignments = User & {
  store_assignments?: WorkerStoreAssignment[]
}

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

interface StaffDisplay {
  user: UserWithAssignments
  role: string
}

interface DukaStats {
  duka: StoreType
  faida: Faida
  wafanyakazi: StaffDisplay[]
  stokiJumla: number
  stokiThamani: number
}

// ================================================================
// CONSTANTS
// ================================================================

const STAFF_ROLES = ['muuzaji', 'mhazini', 'admin']

const ROLE_LABEL: Record<string, string> = {
  muuzaji: 'Muuzaji',
  mhazini: 'Mhazini',
  admin: 'Admin',
  mmiliki: 'Mmiliki',
  mteja: 'Mteja',
}

const ROLE_COLOR: Record<string, string> = {
  muuzaji: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mhazini: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-slate-100 text-slate-700 border-slate-200',
}

// ================================================================
// HELPERS
// ================================================================

/**
 * Pata ID ya duka kutoka assignment.
 */
function getAssignmentStoreId(
  assignment: WorkerStoreAssignment
): string {
  return typeof assignment.store === 'string'
    ? assignment.store
    : assignment.store?.id || ''
}

/**
 * Pata maduka yote ambayo mfanyakazi amepangiwa.
 *
 * Kipaumbele:
 * 1. store_assignments (mfumo mpya wa maduka mengi)
 * 2. store (mfumo wa zamani wa duka moja)
 */
function getWorkerStoreIds(user: UserWithAssignments): string[] {
  if (Array.isArray(user.store_assignments)) {
    return user.store_assignments
      .filter((assignment) => assignment.is_active)
      .map(getAssignmentStoreId)
      .filter(Boolean)
  }

  const oldStore = user.store

  if (typeof oldStore === 'string' && oldStore) {
    return [oldStore]
  }

  return []
}

/**
 * Hakikisha ni mfanyakazi anayehusika na duka.
 */
function isStaff(user: UserWithAssignments): boolean {
  return STAFF_ROLES.includes(user.role)
}

/**
 * Pata initials za jina.
 */
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ================================================================
// PAGE
// ================================================================

export default function MmilikiMaduka() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [users, setUsers] = useState<UserWithAssignments[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [open, setOpen] = useState(false)
  const [editStore, setEditStore] = useState<StoreType | null>(null)

  const [toast, setToast] = useState<{
    msg: string
    ok: boolean
  } | null>(null)

  // --------------------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------------------

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [
        str,
        ords,
        prods,
        sals,
        exps,
        stocks,
        usrs,
      ] = await Promise.all([
        storesApi.list(),
        ordersApi.list(),
        productsApi.list(),
        staffApi.salaries(),
        expensesApi.list(),
        inventoryApi.stockLevels(),
        usersApi.list().catch(() => [] as User[]),
      ])

      setStores(str)
      setOrders(ords)
      setProducts(prods)
      setSalaries(sals)
      setExpenses(exps)
      setStockLevels(stocks)

      setUsers(usrs as UserWithAssignments[])
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata taarifa za maduka. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // --------------------------------------------------------------
  // TOAST
  // --------------------------------------------------------------

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })

    window.setTimeout(() => {
      setToast(null)
    }, ok ? 3000 : 4000)
  }

  // --------------------------------------------------------------
  // FAIDA CALCULATION
  // --------------------------------------------------------------

  const computeFaida = (storeId: string): Faida => {
    const storeOrders = orders.filter(
      (order) =>
        order.store === storeId &&
        order.status === 'imekamilika'
    )

    const storeSalaries = salaries.filter(
      (salary) => salary.store === storeId
    )

    const storeExpenses = expenses.filter(
      (expense) => expense.store === storeId
    )

    const mauzo = storeOrders.reduce(
      (sum, order) =>
        sum + parseFloat(order.total || '0'),
      0
    )

    const cogs = storeOrders.reduce((sum, order) => {
      const orderCost = order.items.reduce(
        (itemSum, item) =>
          itemSum +
          parseFloat(item.unit_cost || '0') *
            parseFloat(item.quantity || '0'),
        0
      )

      return sum + orderCost
    }, 0)

    const opex = storeExpenses.reduce(
      (sum, expense) =>
        sum + parseFloat(expense.amount || '0'),
      0
    )

    const mishahara = storeSalaries
      .filter((salary) => salary.status === 'imelipwa')
      .reduce(
        (sum, salary) =>
          sum + parseFloat(salary.total_paid || '0'),
        0
      )

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

  // --------------------------------------------------------------
  // STORE STATISTICS + STAFF PER STORE
  // --------------------------------------------------------------

  const dukaStats: DukaStats[] = useMemo(() => {
    return stores.map((duka) => {
      const faida = computeFaida(duka.id)

      /**
       * Muhimu:
       * Mfanyakazi anaweza kuonekana katika maduka mengi
       * ikiwa ana active assignments kwenye maduka hayo.
       */
      const wafanyakazi = users
        .filter(isStaff)
        .filter((user) =>
          getWorkerStoreIds(user).includes(duka.id)
        )
        .map((user) => ({
          user,
          role: ROLE_LABEL[user.role] || user.role,
        }))

      const storeStock = stockLevels.filter(
        (stock) => stock.store === duka.id
      )

      const stokiJumla = storeStock.reduce(
        (sum, stock) =>
          sum + parseFloat(stock.quantity || '0'),
        0
      )

      const stokiThamani = storeStock.reduce(
        (sum, stock) => {
          const product = products.find(
            (item) => item.id === stock.product
          )

          if (!product) return sum

          return (
            sum +
            parseFloat(stock.quantity || '0') *
              parseFloat(product.cost_price || '0')
          )
        },
        0
      )

      return {
        duka,
        faida,
        wafanyakazi,
        stokiJumla,
        stokiThamani,
      }
    })
  }, [
    stores,
    orders,
    salaries,
    expenses,
    stockLevels,
    users,
    products,
  ])

  // --------------------------------------------------------------
  // TOTAL STATISTICS
  // --------------------------------------------------------------

  const jumla = useMemo(() => {
    return dukaStats.reduce(
      (acc, item) => ({
        maduka: acc.maduka + 1,

        /**
         * Hii ni jumla ya assignments kwa maduka.
         * Mfanyakazi mmoja aliyepangiwa maduka mawili
         * atahesabiwa mara mbili hapa.
         */
        wafanyakazi:
          acc.wafanyakazi + item.wafanyakazi.length,

        stokiJumla:
          acc.stokiJumla + item.stokiJumla,

        mauzo:
          acc.mauzo + item.faida.mauzo,

        faida:
          acc.faida + item.faida.faidaSafi,
      }),
      {
        maduka: 0,
        wafanyakazi: 0,
        stokiJumla: 0,
        mauzo: 0,
        faida: 0,
      }
    )
  }, [dukaStats])

  // Idadi ya wafanyakazi wa kipekee, bila kurudia mtu
  const uniqueWorkers = useMemo(() => {
    return users.filter(isStaff).length
  }, [users])

  // --------------------------------------------------------------
  // ADD STORE
  // --------------------------------------------------------------

  const ongezaDuka = async (data: {
    name: string
    location: string
  }) => {
    try {
      const newStore = await storesApi.create(data)

      setStores((previous) => [...previous, newStore])
      setOpen(false)

      showToast(`Duka "${newStore.name}" limeongezwa.`, true)
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail ||
          'Imeshindikana kuongeza duka.',
        false
      )

      throw err
    }
  }

  // --------------------------------------------------------------
  // EDIT STORE
  // --------------------------------------------------------------

  const haririDuka = async (
    id: string,
    data: {
      name: string
      location: string
    }
  ) => {
    try {
      const updated = await storesApi.update(id, data)

      setStores((previous) =>
        previous.map((store) =>
          store.id === id ? updated : store
        )
      )

      setEditStore(null)

      showToast(
        `Duka "${updated.name}" limehaririwa.`,
        true
      )
    } catch (err: any) {
      showToast(
        err?.response?.data?.detail ||
          'Imeshindikana kuhariri duka.',
        false
      )

      throw err
    }
  }

  // ==============================================================
  // RENDER
  // ==============================================================

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Store size={26} className="text-brand-600" />
            Maduka Yangu
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Simamia maduka, wafanyakazi na taarifa za biashara
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={loading ? 'animate-spin' : ''}
            />
            Sasisha
          </button>

          <button
            onClick={() => setOpen(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} />
            Ongeza Duka
          </button>
        </div>
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

      {/* GENERAL STATISTICS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <MiniStatSkeleton key={index} />
          ))
        ) : (
          <>
            <MiniStat
              label="Maduka"
              value={String(jumla.maduka)}
              Icon={Store}
              tone="text-blue-600"
            />

            <MiniStat
              label="Wafanyakazi wa kipekee"
              value={String(uniqueWorkers)}
              Icon={Users}
              tone="text-purple-600"
            />

            <MiniStat
              label="Assignments za wafanyakazi"
              value={String(jumla.wafanyakazi)}
              Icon={UserRound}
              tone="text-indigo-600"
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
              tone={
                jumla.faida < 0
                  ? 'text-red-600'
                  : 'text-emerald-600'
              }
            />
          </>
        )}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <DukaSkeleton key={index} />
          ))}
        </div>
      )}

      {/* EMPTY */}
      {!loading && stores.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Store
            size={40}
            className="mx-auto text-slate-300 mb-3"
          />

          <h3 className="font-semibold">
            Hakuna duka bado
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Bofya "Ongeza Duka" kuanza.
          </p>

          <button
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700"
          >
            <Plus size={16} />
            Ongeza Duka
          </button>
        </div>
      )}

      {/* STORE CARDS */}
      {!loading && dukaStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dukaStats.map((stats) => (
            <div
              key={stats.duka.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 min-w-0"
            >

              {/* STORE HEADER */}
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 text-brand-600 grid place-items-center">
                  <Store size={20} />
                </div>

                <div className="flex items-center gap-1.5">
                  {stats.duka.is_active ? (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      <CheckCircle2 size={10} />
                      Hai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      <X size={10} />
                      Imezimwa
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

              {/* STORE NAME */}
              <div className="mt-3">
                <div className="font-semibold truncate">
                  {stats.duka.name}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} />
                  {stats.duka.location}
                </div>
              </div>

              {/* FINANCIAL INFORMATION */}
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                <div className="min-w-0">
                  <div className="text-slate-500">
                    Mauzo
                  </div>

                  <div className="font-bold text-brand-700 truncate">
                    {formatTsh(stats.faida.mauzo)}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-slate-500">
                    Faida Safi
                  </div>

                  <div
                    className={`font-bold truncate ${
                      stats.faida.hasara
                        ? 'text-red-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatTsh(stats.faida.faidaSafi)}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-slate-500">
                    Mishahara
                  </div>

                  <div className="font-bold text-purple-700 truncate">
                    {formatTsh(stats.faida.mishahara)}
                  </div>
                </div>
              </div>

              {/* STOCK INFORMATION */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <div className="text-slate-500">
                    Stoki
                  </div>

                  <div className="font-semibold">
                    {stats.stokiJumla.toLocaleString()} pcs
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">
                    Thamani ya Stoki
                  </div>

                  <div className="font-semibold text-slate-900 truncate">
                    {formatTsh(stats.stokiThamani)}
                  </div>
                </div>
              </div>

              {/* STAFF SECTION */}
              <div className="mt-4 pt-3 border-t border-slate-200">

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users
                      size={15}
                      className="text-brand-600"
                    />

                    <h3 className="text-sm font-bold text-slate-800">
                      Wafanyakazi
                    </h3>
                  </div>

                  <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-1 rounded-full">
                    {stats.wafanyakazi.length}
                  </span>
                </div>

                {stats.wafanyakazi.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-4 text-center">
                    <UserRound
                      size={24}
                      className="mx-auto text-slate-300 mb-1"
                    />

                    <p className="text-xs font-medium text-slate-500">
                      Hakuna mfanyakazi aliyepangiwa duka hili.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stats.wafanyakazi.map(({ user, role }) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        {/* AVATAR */}
                        <div className="w-9 h-9 rounded-full bg-white border border-slate-200 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(user.full_name || 'W')}
                        </div>

                        {/* NAME AND PHONE */}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {user.full_name}
                          </div>

                          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                            <Phone size={10} />
                            <a
                              href={`tel:${user.phone}`}
                              className="truncate hover:text-brand-700"
                            >
                              {user.phone || 'Hakuna namba ya simu'}
                            </a>
                          </div>
                        </div>

                        {/* ROLE */}
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-1 rounded border shrink-0 ${
                            ROLE_COLOR[user.role] ||
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BUSINESS STATUS */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500">
                  Hali ya biashara
                </span>

                {stats.faida.hasara ? (
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                    <TrendingDown size={12} />
                    Hasara
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <TrendingUp size={12} />
                    Faida
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD STORE MODAL */}
      {open && (
        <FomuDuka
          onClose={() => setOpen(false)}
          onSubmit={ongezaDuka}
        />
      )}

      {/* EDIT STORE MODAL */}
      {editStore && (
        <FomuDuka
          onClose={() => setEditStore(null)}
          onSubmit={(data) =>
            haririDuka(editStore.id, data)
          }
          initialData={{
            name: editStore.name,
            location: editStore.location,
          }}
        />
      )}

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
            <X size={16} className="shrink-0" />
          )}

          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ================================================================
// MINI STAT
// ================================================================

function MiniStat({
  label,
  value,
  Icon,
  tone,
}: {
  label: string
  value: string
  Icon: ElementType
  tone: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div
        className={`w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center ${tone}`}
      >
        <Icon size={16} />
      </div>

      <div className="text-xs text-slate-500 mt-2.5">
        {label}
      </div>

      <div className="text-sm md:text-base font-bold text-slate-900 mt-0.5 truncate">
        {value}
      </div>
    </div>
  )
}

// ================================================================
// SKELETONS
// ================================================================

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
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-1">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <SkeletonLine className="h-4 w-28" />
        <SkeletonLine className="h-10 w-full" />
        <SkeletonLine className="h-10 w-full" />
      </div>
    </div>
  )
}

// ================================================================
// STORE FORM
// ================================================================

function FomuDuka({
  onClose,
  onSubmit,
  initialData,
}: {
  onClose: () => void
  onSubmit: (data: {
    name: string
    location: string
  }) => Promise<void>
  initialData?: {
    name: string
    location: string
  }
}) {
  const [name, setName] = useState(initialData?.name || '')
  const [location, setLocation] = useState(
    initialData?.location || ''
  )

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isEdit = !!initialData

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Jina la duka linahitajika.')
      return
    }

    if (!location.trim()) {
      setError('Mahali pa duka panahitajika.')
      return
    }

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
          err?.response?.data?.location?.[0] ||
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

        {/* MODAL HEADER */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">
              {isEdit ? 'Hariri Duka' : 'Ongeza Duka Jipya'}
            </div>

            <div className="text-xs text-slate-500">
              {isEdit
                ? 'Badilisha taarifa za duka'
                : 'Weka taarifa za duka jipya'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={submit} className="p-4 space-y-3">

          <div>
            <label className="text-sm font-medium">
              Jina la Duka <span className="text-red-500">*</span>
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
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
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Mfano: Mbezi, Dar es Salaam"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
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
                  {isEdit
                    ? 'Hifadhi Marekebisho'
                    : 'Hifadhi Duka'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
