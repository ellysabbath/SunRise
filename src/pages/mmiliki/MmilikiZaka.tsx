import { useEffect, useMemo, useState } from 'react'
import {
  HandCoins, CheckCircle2, Clock, AlertTriangle, Plus, X, Save,
  Wallet, RefreshCw, Loader2, Search, ListFilter, XCircle,
  Receipt,
} from 'lucide-react'
import {
  financeApi,
  type TitheOffering,
  type TitheType,
} from '../../services/finance'
import { ordersApi, type Order } from '../../services/orders'
import { expensesApi, type Expense } from '../../services/expenses'
import { staffApi, type Salary } from '../../services/staff'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Types
// ==================================================================
interface Faida {
  faidaSafi: number
  zaka: number
  sadaka: number
  jumlaYaMungu: number
  inayobaki: number
}

// ==================================================================
// Page
// ==================================================================
export default function MmilikiZaka() {
  const [offerings, setOfferings] = useState<TitheOffering[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [salaries, setSalaries] = useState<Salary[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rekodiOpen, setRekodiOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [q, setQ] = useState('')
  const [filterAina, setFilterAina] = useState<TitheType | 'zote'>('zote')

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const results = await Promise.allSettled([
        financeApi.titheOfferings(),
        ordersApi.list(),
        expensesApi.list(),
        staffApi.salaries(),
      ])

      setOfferings(
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
            'Imeshindikana kupata malipo. Angalia muunganisho.'
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
  // Faida (kutoka backend data)
  // ------------------------------------------------------------------
  const f = useMemo<Faida>(() => {
    const completed = orders.filter((o) => o.status === 'imekamilika')

    const mauzo = completed.reduce(
      (s, o) => s + parseFloat(o.total || '0'),
      0
    )

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

    const jumlaOpex = expenses.reduce(
      (s, e) => s + parseFloat(e.amount || '0'),
      0
    )

    const jumlaMishahara = salaries
      .filter((s) => s.status === 'imelipwa')
      .reduce((s, x) => s + parseFloat(x.total_paid || '0'), 0)

    const faidaGhafi = mauzo - cogs
    const jumlaGharama = jumlaOpex + jumlaMishahara
    const faidaSafi = faidaGhafi - jumlaGharama
    const zaka = faidaSafi > 0 ? faidaSafi * 0.1 : 0
    const sadaka = faidaSafi > 0 ? faidaSafi * 0.1 : 0
    const jumlaYaMungu = zaka + sadaka
    const inayobaki = faidaSafi - jumlaYaMungu

    return { faidaSafi, zaka, sadaka, jumlaYaMungu, inayobaki }
  }, [orders, expenses, salaries])

  // ------------------------------------------------------------------
  // Malipo yaliyofanyika (kutoka backend)
  // ------------------------------------------------------------------
  const malipoYote = useMemo(
    () =>
      offerings.reduce(
        (a, m) => ({
          zaka:
            a.zaka +
            (m.payment_type === 'zaka' ? parseFloat(m.amount || '0') : 0),
          sadaka:
            a.sadaka +
            (m.payment_type === 'sadaka' ? parseFloat(m.amount || '0') : 0),
          jumla: a.jumla + parseFloat(m.amount || '0'),
        }),
        { zaka: 0, sadaka: 0, jumla: 0 }
      ),
    [offerings]
  )

  const zakaIliyodaiwa = Math.max(f.zaka - malipoYote.zaka, 0)
  const sadakaIliyodaiwa = Math.max(f.sadaka - malipoYote.sadaka, 0)
  const jumlaIliyodaiwa = zakaIliyodaiwa + sadakaIliyodaiwa

  // ------------------------------------------------------------------
  // Filter + search
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    return offerings.filter((m) => {
      if (filterAina !== 'zote' && m.payment_type !== filterAina) return false
      const query = q.toLowerCase().trim()
      if (!query) return true
      return (
        m.receipt_number.toLowerCase().includes(query) ||
        (m.note || '').toLowerCase().includes(query)
      )
    })
  }, [offerings, filterAina, q])

  // ------------------------------------------------------------------
  // Rekodi malipo
  // ------------------------------------------------------------------
  const rekodiMalipo = async (payload: {
    payment_type: TitheType
    amount: number
    receipt_number: string
    note?: string
    paid_date: string
  }) => {
    try {
      const newOffering = await financeApi.createTitheOffering(payload)
      setOfferings((prev) => [newOffering, ...prev])
      setRekodiOpen(false)
      setToast({
        msg: `${payload.payment_type === 'zaka' ? 'Zaka' : 'Sadaka'} imerekodiwa.`,
        ok: true,
      })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.receipt_number?.[0] ||
        'Imeshindikana kurekodi.'
      setToast({ msg: detail, ok: false })
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
            <HandCoins size={26} className="text-brand-600" /> Zaka & Sadaka
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kanuni: 10% Zaka + 10% Sadaka = 20% ya Faida Safi
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
            onClick={() => setRekodiOpen(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} /> Rekodi Malipo
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

      {/* Card kubwa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 grid place-items-center shrink-0">
              <HandCoins size={24} />
            </div>
            <div>
              <div className="text-sm text-slate-500">Jumla ya Bwana</div>
              {loading ? (
                <SkeletonLine className="h-8 w-32 mt-1" />
              ) : (
                <div className="text-2xl md:text-3xl font-bold text-slate-900 mt-0.5">
                  {formatTsh(f.jumlaYaMungu)}
                </div>
              )}
              {!loading && (
                <div className="text-xs text-slate-500 mt-1">
                  Faida Halisi: {formatTsh(f.faidaSafi)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-200">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonLine className="h-3 w-20" />
                <SkeletonLine className="h-5 w-24" />
              </div>
            ))
          ) : (
            <>
              <div>
                <div className="text-xs text-slate-500">Faida Halisi</div>
                <div className="text-lg font-bold text-slate-900">
                  {formatTsh(f.faidaSafi)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Zaka (10%)</div>
                <div className="text-lg font-bold text-brand-700">
                  {formatTsh(f.zaka)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Sadaka (10%)</div>
                <div className="text-lg font-bold text-brand-700">
                  {formatTsh(f.sadaka)}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Salio Lako</div>
            {loading ? (
              <SkeletonLine className="h-8 w-32 mt-1" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">
                {formatTsh(f.inayobaki)}
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 grid place-items-center">
            <Wallet size={22} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <ZakaStat
              label="Zaka Inayodaiwa"
              value={formatTsh(zakaIliyodaiwa)}
              Icon={Clock}
              tone="text-amber-600"
            />
            <ZakaStat
              label="Sadaka Inayodaiwa"
              value={formatTsh(sadakaIliyodaiwa)}
              Icon={Clock}
              tone="text-amber-600"
            />
            <ZakaStat
              label="Zilizolipwa"
              value={formatTsh(malipoYote.jumla)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />
            <ZakaStat
              label="Jumla Inayodaiwa"
              value={formatTsh(jumlaIliyodaiwa)}
              Icon={AlertTriangle}
              tone={jumlaIliyodaiwa > 0 ? 'text-red-600' : 'text-emerald-600'}
            />
          </>
        )}
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta kwa risiti au maelezo..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ListFilter size={14} className="text-slate-400" />
          {(['zote', 'zaka', 'sadaka'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilterAina(k)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                filterAina === k
                  ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              {k === 'zote' ? 'Zote' : k === 'zaka' ? 'Zaka' : 'Sadaka'}
            </button>
          ))}
        </div>
      </div>

      {/* Malipo yaliyofanyika */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          Malipo Yaliyofanyika ({offerings.length})
        </h2>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <MalipoSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">
            {q || filterAina !== 'zote'
              ? 'Hakuna matokeo'
              : 'Hakuna malipo yaliyorekodiwa bado.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-emerald-600 grid place-items-center shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">
                      {m.payment_type === 'zaka' ? 'Zaka' : 'Sadaka'}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 inline-flex items-center gap-1">
                      <Receipt size={9} />
                      {m.receipt_number}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(m.paid_date)}
                    {m.note ? ` — ${m.note}` : ''}
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900 whitespace-nowrap">
                  {formatTsh(m.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {rekodiOpen && (
        <FomuRekodi
          onClose={() => setRekodiOpen(false)}
          onSubmit={rekodiMalipo}
          zakaIliyodaiwa={zakaIliyodaiwa}
          sadakaIliyodaiwa={sadakaIliyodaiwa}
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
            <XCircle size={16} className="shrink-0" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ==================================================================
// ZakaStat
// ==================================================================
function ZakaStat({
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
      <SkeletonLine className="h-3 w-24 mt-3" />
      <SkeletonLine className="h-5 w-20 mt-2" />
    </div>
  )
}

function MalipoSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
      <div className="w-9 h-9 rounded-lg bg-slate-200 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-3 w-48" />
      </div>
      <SkeletonLine className="h-4 w-24" />
    </div>
  )
}

// ==================================================================
// FomuRekodi
// ==================================================================
function FomuRekodi({
  onClose,
  onSubmit,
  zakaIliyodaiwa,
  sadakaIliyodaiwa,
}: {
  onClose: () => void
  onSubmit: (payload: {
    payment_type: TitheType
    amount: number
    receipt_number: string
    note?: string
    paid_date: string
  }) => Promise<void>
  zakaIliyodaiwa: number
  sadakaIliyodaiwa: number
}) {
  const [aina, setAina] = useState<TitheType>('zaka')
  const [kiasi, setKiasi] = useState(0)
  const [risiti, setRisiti] = useState('')
  const [maelezo, setMaelezo] = useState('')
  const [tarehe, setTarehe] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (kiasi <= 0) return setError('Kiasi lazima kiwe zaidi ya sifuri')
    if (!risiti.trim()) return setError('Risiti inahitajika')
    if (!tarehe) return setError('Tarehe inahitajika')

    setLoading(true)
    try {
      await onSubmit({
        payment_type: aina,
        amount: kiasi,
        receipt_number: risiti.toUpperCase().trim(),
        note: maelezo || undefined,
        paid_date: tarehe,
      })
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.receipt_number?.[0] ||
          'Imeshindikana kurekodi.'
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
            <div className="font-semibold">Rekodi Malipo</div>
            <div className="text-xs text-slate-500">Zaka au Sadaka</div>
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
          {/* Aina */}
          <div>
            <label className="text-sm font-medium">Aina</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(['zaka', 'sadaka'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAina(k)}
                  disabled={loading}
                  className={`px-3 py-2.5 rounded-lg border text-sm transition ${
                    aina === k
                      ? 'bg-brand-50 text-brand-700 border-brand-500 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {k === 'zaka' ? 'Zaka' : 'Sadaka'}
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Inayodaiwa:{' '}
                    {formatTsh(
                      k === 'zaka' ? zakaIliyodaiwa : sadakaIliyodaiwa
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Kiasi */}
          <div>
            <label className="text-sm font-medium">Kiasi (TZS)</label>
            <input
              type="number"
              value={kiasi || ''}
              onChange={(e) => setKiasi(Number(e.target.value))}
              placeholder="0"
              min={1}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          {/* Tarehe */}
          <div>
            <label className="text-sm font-medium">Tarehe</label>
            <input
              type="date"
              value={tarehe}
              onChange={(e) => setTarehe(e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          {/* Risiti */}
          <div>
            <label className="text-sm font-medium">Risiti</label>
            <input
              value={risiti}
              onChange={(e) => setRisiti(e.target.value.toUpperCase())}
              placeholder="RIS-001"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm font-mono disabled:bg-slate-50"
            />
          </div>

          {/* Maelezo */}
          <div>
            <label className="text-sm font-medium">Maelezo (hiari)</label>
            <input
              value={maelezo}
              onChange={(e) => setMaelezo(e.target.value)}
              placeholder="Mfano: Zaka ya mwezi Novemba"
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
                  Inarekodi...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Rekodi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}