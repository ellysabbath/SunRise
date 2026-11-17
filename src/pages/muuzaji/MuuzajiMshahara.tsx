
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import {
  Wallet,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Store,
  Search,
  ListFilter,
  User,
  Lock,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { staffApi, type Salary } from '../../services/staff'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ======================================================
// CONSTANTS
// ======================================================

const MONTHS_SW = [
  'Januari',
  'Februari',
  'Machi',
  'Aprili',
  'Mei',
  'Juni',
  'Julai',
  'Agosti',
  'Septemba',
  'Oktoba',
  'Novemba',
  'Desemba',
]

type SalaryData = Salary & {
  staff?: string | { id?: string }
  staff_id?: string
  store?: string | { id?: string }
  store_id?: string
  staff_name?: string
  store_name?: string
  status?: string
  total_paid?: string | number
  paid_at?: string | null
  basic_salary?: string | number
  allowances?: string | number
  deductions?: string | number
  month?: string
}

type SalaryResponse =
  | SalaryData[]
  | {
      results?: SalaryData[]
      data?: SalaryData[]
    }

function getRelationId(value: unknown): string {
  if (value === null || value === undefined) return ''

  if (typeof value === 'object') {
    const relation = value as { id?: string }
    return String(relation.id ?? '')
  }

  return String(value)
}

function getSalaryArray(response: SalaryResponse): SalaryData[] {
  if (Array.isArray(response)) return response

  if (Array.isArray(response.results)) return response.results

  if (Array.isArray(response.data)) return response.data

  return []
}

function formatMonth(value: string | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return `${MONTHS_SW[date.getMonth()]} ${date.getFullYear()}`
}

function getAmount(value: unknown): number {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function normalizeStatus(value: unknown): string {
  const status = String(value ?? '').toLowerCase().trim()

  if (['imelipwa', 'paid', 'completed'].includes(status)) {
    return 'imelipwa'
  }

  if (['inasubiri', 'pending', 'unpaid'].includes(status)) {
    return 'inasubiri'
  }

  return status
}

function computeNet(salary: SalaryData): number {
  const basic = getAmount(salary.basic_salary)
  const allowances = getAmount(salary.allowances)
  const deductions = getAmount(salary.deductions)

  return basic + allowances - deductions
}

// ======================================================
// PAGE
// ======================================================

export default function MuuzajiMshahara() {
  const { user } = useAuth()

  const loggedInUserId = String(user?.id ?? '')
  const loggedInStoreId = String(user?.store_id ?? '')

  const [salaries, setSalaries] = useState<SalaryData[]>([])
  const [store, setStore] = useState<StoreType | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<
    'zote' | 'imelipwa' | 'inasubiri'
  >('zote')

  // ====================================================
  // LOAD DATA
  // ====================================================

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    if (!loggedInUserId) {
      setSalaries([])
      setError('Hujatambuliwa. Tafadhali ingia tena.')
      setLoading(false)
      return
    }

    if (user?.role !== 'muuzaji' && user?.role !== 'mmiliki') {
      setSalaries([])
      setError('Huna ruhusa ya kuona taarifa za mishahara.')
      setLoading(false)
      return
    }

    try {
      const salaryPromise = staffApi.salaries()

      const storePromise = loggedInStoreId
        ? storesApi.get(loggedInStoreId)
        : Promise.resolve(null)

      const [salaryResponse, storeData] = await Promise.all([
        salaryPromise,
        storePromise,
      ])

      const salaryData = getSalaryArray(
        salaryResponse as SalaryResponse
      )

      setSalaries(salaryData)
      setStore(storeData)

    } catch (err: unknown) {
      console.error('Salary loading error:', err)

      const apiError = err as {
        response?: {
          data?: {
            detail?: string
          }
        }
      }

      setError(
        apiError?.response?.data?.detail ||
        'Imeshindikana kupata mishahara. Tafadhali jaribu tena.'
      )

      setSalaries([])
    } finally {
      setLoading(false)
    }
  }, [loggedInUserId, loggedInStoreId, user?.role])

  useEffect(() => {
    load()
  }, [load])

  // ====================================================
  // FILTER MY SALARIES
  // ====================================================

  const mySalaries = useMemo(() => {
    if (!loggedInUserId) return []

    return salaries.filter((salary) => {
      const staffId = getRelationId(
        salary.staff_id ?? salary.staff
      )

      const salaryStoreId = getRelationId(
        salary.store_id ?? salary.store
      )

      if (staffId !== loggedInUserId) return false

      if (
        loggedInStoreId &&
        salaryStoreId &&
        salaryStoreId !== loggedInStoreId
      ) {
        return false
      }

      return true
    })
  }, [salaries, loggedInUserId, loggedInStoreId])

  // ====================================================
  // SEARCH AND FILTER
  // ====================================================

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()

    return mySalaries.filter((salary) => {
      const status = normalizeStatus(salary.status)

      if (filter !== 'zote' && status !== filter) {
        return false
      }

      if (!query) return true

      return (
        formatMonth(salary.month).toLowerCase().includes(query) ||
        (salary.store_name || '').toLowerCase().includes(query)
      )
    })
  }, [mySalaries, q, filter])

  // ====================================================
  // STATISTICS
  // ====================================================

  const stats = useMemo(() => {
    const jumla = mySalaries.length

    const imelipwa = mySalaries
      .filter((salary) => normalizeStatus(salary.status) === 'imelipwa')
      .reduce((sum, salary) => sum + computeNet(salary), 0)

    const inasubiri = mySalaries
      .filter((salary) => normalizeStatus(salary.status) === 'inasubiri')
      .reduce((sum, salary) => sum + computeNet(salary), 0)

    return {
      jumla,
      imelipwa,
      inasubiri,
    }
  }, [mySalaries])

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-5">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">

        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet size={26} className="text-brand-600" />
            Mshahara Wangu

            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
              title="Taarifa hii ni ya siri"
            >
              <Lock size={10} />
              Siri
            </span>
          </h1>

          <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">

            <span className="inline-flex items-center gap-1">
              <User size={12} />
              {user?.full_name || 'Muuzaji'}
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
                Duka halijapatikana
              </span>
            )}

          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw
            size={14}
            className={loading ? 'animate-spin' : ''}
          />
          Sasisha
        </button>

      </div>

      {/* STATISTICS */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <StatSkeleton key={index} />
          ))
        ) : (
          <>
            <Stat
              label="Mishahara Yote"
              value={String(stats.jumla)}
              Icon={Calendar}
              tone="text-blue-600"
            />

            <Stat
              label="Iliyolipwa"
              value={formatTsh(stats.imelipwa)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />

            <Stat
              label="Inayosubiri"
              value={formatTsh(stats.inasubiri)}
              Icon={Clock}
              tone="text-amber-600"
            />
          </>
        )}

      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">

          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <div className="flex-1">
            {error}
          </div>

          <button
            onClick={load}
            className="text-xs font-semibold underline"
          >
            Jaribu tena
          </button>

        </div>
      )}

      {/* SEARCH AND FILTER */}

      {!loading && mySalaries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tafuta kwa mwezi..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">

            <ListFilter size={14} className="text-slate-400" />

            {(
              [
                { key: 'zote', label: 'Zote' },
                { key: 'imelipwa', label: 'Imelipwa' },
                { key: 'inasubiri', label: 'Inasubiri' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
                  filter === item.key
                    ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}

          </div>
        </div>
      )}

      {/* LOADING */}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <MshaharaSkeleton key={index} />
          ))}
        </div>
      )}

      {/* EMPTY */}

      {!loading && mySalaries.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">

          <Wallet
            size={40}
            className="mx-auto text-slate-300 mb-3"
          />

          <h3 className="font-semibold">
            Hakuna mishahara bado
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Mshahara wako utaonekana hapa baada ya mmiliki
            kukuandalia rekodi ya mshahara.
          </p>

        </div>
      )}

      {/* NO FILTER RESULTS */}

      {!loading && mySalaries.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">

          <Search
            size={32}
            className="mx-auto text-slate-300 mb-2"
          />

          <div className="text-sm text-slate-500">
            Hakuna mishahara inayolingana na utafutaji wako.
          </div>

        </div>
      )}

      {/* SALARY LIST */}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">

          {filtered.map((salary) => {
            const isPaid = normalizeStatus(salary.status) === 'imelipwa'
            const net = computeNet(salary)

            return (
              <div
                key={salary.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >

                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">

                  <div className="flex items-center gap-3 min-w-0">

                    <div
                      className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${
                        isPaid
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {isPaid ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Clock size={18} />
                      )}
                    </div>

                    <div className="min-w-0">

                      <div className="font-semibold text-sm">
                        {formatMonth(salary.month)}
                      </div>

                      <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Store size={10} />
                        {salary.store_name || store?.name || '—'}
                      </div>

                      {isPaid && salary.paid_at && (
                        <div className="text-xs text-emerald-700">
                          Imelipwa: {formatDate(salary.paid_at)}
                        </div>
                      )}

                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">

                    <div className="text-base font-bold text-slate-900">
                      {formatTsh(net)}
                    </div>

                    <div
                      className={`text-[10px] uppercase font-semibold inline-flex items-center gap-1 mt-0.5 ${
                        isPaid
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {isPaid ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <Clock size={10} />
                      )}

                      {isPaid ? 'Imelipwa' : 'Inasubiri'}
                    </div>

                  </div>

                </div>

                {/* SALARY BREAKDOWN */}

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">

                  <div>
                    <div className="text-slate-500">
                      Msingi
                    </div>

                    <div className="font-semibold text-slate-800">
                      {formatTsh(salary.basic_salary)}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">
                      Posho
                    </div>

                    <div className="font-semibold text-emerald-700">
                      +{formatTsh(salary.allowances)}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">
                      Makato
                    </div>

                    <div className="font-semibold text-red-700">
                      -{formatTsh(salary.deductions)}
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

// ======================================================
// STAT COMPONENT
// ======================================================

function Stat({
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
        className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center ${tone}`}
      >
        <Icon size={18} />
      </div>

      <div className="text-xs text-slate-500 mt-3">
        {label}
      </div>

      <div className="text-base md:text-lg font-bold text-slate-900 mt-0.5 truncate">
        {value}
      </div>

    </div>
  )
}

// ======================================================
// SKELETONS
// ======================================================

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">

      <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />

      <SkeletonLine className="h-3 w-20 mt-3" />

      <SkeletonLine className="h-5 w-24 mt-2" />

    </div>
  )
}

function MshaharaSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">

      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">

        <div className="flex items-center gap-3 min-w-0">

          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />

          <div className="min-w-0 space-y-1.5 flex-1">
            <SkeletonLine className="h-4 w-28" />
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="h-3 w-24" />
          </div>

        </div>

        <div className="sm:text-right space-y-1.5">
          <SkeletonLine className="h-5 w-24 ml-auto" />
          <SkeletonLine className="h-3 w-16 ml-auto" />
        </div>

      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">

        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <SkeletonLine className="h-3 w-12" />
            <SkeletonLine className="h-4 w-20" />
          </div>
        ))}

      </div>

    </div>
  )
}
