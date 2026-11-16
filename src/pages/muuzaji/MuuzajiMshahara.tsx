import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, CheckCircle2, Clock, RefreshCw, AlertTriangle,
  Calendar, TrendingUp, Banknote, Loader2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { staffApi, type Salary } from '../../services/staff'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
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

function formatMonth(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return `${MONTHS_SW[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return iso
  }
}

// ==================================================================
// Page
// ==================================================================
export default function MuuzajiMshahara() {
  const { user } = useAuth()

  const [salaries, setSalaries] = useState<Salary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await staffApi.salaries({ staff: user?.id })
      setSalaries(data)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata mishahara. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const jumla = salaries.length
    const imelipwa = salaries
      .filter((s) => s.status === 'imelipwa')
      .reduce((s, x) => s + parseFloat(x.total_paid || '0'), 0)
    const inasubiri = salaries
      .filter((s) => s.status === 'inasubiri')
      .reduce((s, x) => s + parseFloat(x.total_paid || '0'), 0)
    return { jumla, imelipwa, inasubiri }
  }, [salaries])

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
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historia ya mishahara yako — {user?.full_name || 'Muuzaji'}
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
          <button
            onClick={load}
            className="text-xs font-semibold underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* Loading — skeleton list */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <MshaharaSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && salaries.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">Hakuna mishahara bado</h3>
          <p className="text-sm text-slate-500 mt-1">
            Mshahara wako utaonekana hapa mmiliki akikusajili.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && salaries.length > 0 && (
        <div className="space-y-2">
          {salaries.map((m) => {
            const isPaid = m.status === 'imelipwa'
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
                      <div className="text-xs text-slate-500">
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
                      {formatTsh(m.total_paid)}
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