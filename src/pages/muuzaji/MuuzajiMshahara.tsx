import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wallet, CheckCircle2, Clock, RefreshCw, AlertTriangle,
  Calendar, Store, Search, ListFilter, User, Lock,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { staffApi, type Salary } from '../../services/staff'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
const MONTHS_SW = [
  'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
  'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba',
]

function formatMonth(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return `${MONTHS_SW[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return iso
  }
}

function computeNet(s: Salary): number {
  const basic = parseFloat(s.basic_salary || '0')
  const allow = parseFloat(s.allowances || '0')
  const deduct = parseFloat(s.deductions || '0')
  return basic + allow - deduct
}

// ==================================================================
// Page
// ==================================================================
export default function MuuzajiMshahara() {
  const { user } = useAuth()

  // ================================================================
  // ✅ SIRI: MTU ALIYEINGIA PEKEE
  // ================================================================
  const loggedInUserId = user?.id || undefined
  const loggedInStoreId = user?.store_id || undefined

  const [salaries, setSalaries] = useState<Salary[]>([])
  const [store, setStore] = useState<StoreType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'zote' | 'imelipwa' | 'inasubiri'>('zote')

  // ------------------------------------------------------------------
  // Load — ✅ SIRI: staff = loggedInUserId PEKEE
  // ------------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    // ✅ LAZIMA uwe umeingia
    if (!loggedInUserId) {
      setError('Hujajisajili. Ingia tena.')
      setLoading(false)
      return
    }

    // ✅ LAZIMA uwe na duka
    if (!loggedInStoreId) {
      setError('Hujapangiwa duka. Wasiliana na mmiliki.')
      setLoading(false)
      return
    }

    // ✅ Role guard — mshahara ni wa muuzaji/mmiliki pekee
    //    (mteja hawezi kuona mshahara kabisa)
    if (user.role !== 'muuzaji' && user.role !== 'mmiliki') {
      setError('Huna ruhusa ya kuona mshahara. Hii ni taarifa ya siri.')
      setLoading(false)
      return
    }

    try {
      // ✅ SIRI KAMILI: staff = loggedInUserId, store = loggedInStoreId
      //    Hakuna mtu mwingine, hakuna duka lingine
      const [data, myStore] = await Promise.all([
        staffApi.salaries({
          staff: loggedInUserId,    // ✅ MTU ALIYEINGIA PEKEE
          store: loggedInStoreId,   // ✅ DUKA LA MTU ALIYEINGIA PEKEE
        }),
        storesApi.get(loggedInStoreId),
      ])

      setSalaries(data)
      setStore(myStore)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata mishahara. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }, [loggedInUserId, loggedInStoreId, user?.role])

  useEffect(() => {
    load()
  }, [load])

  // ------------------------------------------------------------------
  // ✅ ULINZI WA MWISHO: chuja tena — mshahara wa MTU HUYU + DUKA HILI pekee
  // ------------------------------------------------------------------
  const mySalaries = useMemo(() => {
    if (!loggedInUserId || !loggedInStoreId) return []

    return salaries.filter((s) => {
      // ✅ Mshahara LAZIMA uwe wa mtumiaji aliyeingia
      if (s.staff_id !== loggedInUserId) return false

      // ✅ Mshahara LAZIMA uwe wa duka la mtumiaji aliyeingia
      if (s.store_id !== loggedInStoreId) return false

      return true
    })
  }, [salaries, loggedInUserId, loggedInStoreId])

  // ------------------------------------------------------------------
  // Filter — search + status (juu ya mySalaries)
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    return mySalaries.filter((s) => {
      if (filter !== 'zote' && s.status !== filter) return false
      if (!query) return true
      return (
        formatMonth(s.month).toLowerCase().includes(query) ||
        (s.store_name || '').toLowerCase().includes(query)
      )
    })
  }, [mySalaries, q, filter])

  // ------------------------------------------------------------------
  // Stats — kwa mySalaries pekee
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const jumla = mySalaries.length
    const imelipwa = mySalaries
      .filter((s) => s.status === 'imelipwa')
      .reduce((sum, x) => sum + computeNet(x), 0)
    const inasubiri = mySalaries
      .filter((s) => s.status === 'inasubiri')
      .reduce((sum, x) => sum + computeNet(x), 0)
    return { jumla, imelipwa, inasubiri }
  }, [mySalaries])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet size={26} className="text-brand-600" /> Mshahara Wangu
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
              title="Taarifa hii ni ya siri — wewe pekee unaweza kuiona"
            >
              <Lock size={10} /> Siri
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
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

      {/* Filter + Search */}
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
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
                  filter === f.key
                    ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <MshaharaSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && mySalaries.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">Hakuna mishahara bado</h3>
          <p className="text-sm text-slate-500 mt-1">
            Mshahara wako utaonekana hapa mmiliki akikusajili kwenye duka lako.
          </p>
        </div>
      )}

      {/* Hakuna matokeo ya filter */}
      {!loading && mySalaries.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Search size={32} className="mx-auto text-slate-300 mb-2" />
          <div className="text-sm text-slate-500">
            Hakuna mishahara inayolingana na filter.
          </div>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((m) => {
            const isPaid = m.status === 'imelipwa'
            const net = computeNet(m)
            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${
                        isPaid ? 'text-emerald-600' : 'text-amber-600'
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
                        {formatMonth(m.month)}
                      </div>
                      <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Store size={10} />
                        {m.store_name || '—'}
                      </div>
                      {isPaid && m.paid_at && (
                        <div className="text-xs text-emerald-700">
                          Imelipwa: {formatDate(m.paid_at)}
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
                        isPaid ? 'text-emerald-600' : 'text-amber-600'
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

                {/* Breakdown */}
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500">Msingi</div>
                    <div className="font-semibold text-slate-800">
                      {formatTsh(m.basic_salary)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Posho</div>
                    <div className="font-semibold text-emerald-700">
                      +{formatTsh(m.allowances)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Makato</div>
                    <div className="font-semibold text-red-700">
                      -{formatTsh(m.deductions)}
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
// Skeletons
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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonLine className="h-3 w-12" />
            <SkeletonLine className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}