import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, Plus, X, Save, Clock, CheckCircle2, XCircle,
  RefreshCw, AlertTriangle, Search, ListFilter, Loader2,
  Receipt, Tag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  expensesApi,
  type ExpenseRequest,
  type ExpenseStatus,
} from '../../services/expenses'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta
// ==================================================================
const HALI_META: Record<
  ExpenseStatus,
  { label: string; tone: string; bg: string; Icon: React.ElementType }
> = {
  inasubiri: {
    label: 'Inasubiri',
    tone: 'text-amber-600',
    bg: 'bg-amber-50',
    Icon: Clock,
  },
  imekubaliwa: {
    label: 'Imekubaliwa',
    tone: 'text-emerald-600',
    bg: 'bg-emerald-50',
    Icon: CheckCircle2,
  },
  imekataliwa: {
    label: 'Imekataliwa',
    tone: 'text-red-600',
    bg: 'bg-red-50',
    Icon: XCircle,
  },
}

// ==================================================================
// Page
// ==================================================================
export default function MuuzajiMatumizi() {
  const { user } = useAuth()

  const [requests, setRequests] = useState<ExpenseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ExpenseStatus | 'zote'>('zote')

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const reqs = await expensesApi.requests({
        store: user?.store_id || undefined,
        requested_by: user?.id,
      })
      setRequests(reqs)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata maombi. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.store_id])

  // ------------------------------------------------------------------
  // Filter
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filter !== 'zote' && r.status !== filter) return false
      const query = q.toLowerCase().trim()
      if (!query) return true
      return (
        r.id.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.reason.toLowerCase().includes(query) ||
        (r.category_name || '').toLowerCase().includes(query)
      )
    })
  }, [requests, q, filter])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const zote = requests.length
    const jumla = requests.reduce((s, r) => s + parseFloat(r.amount || '0'), 0)
    const inasubiri = requests
      .filter((r) => r.status === 'inasubiri')
      .reduce((s, r) => s + parseFloat(r.amount || '0'), 0)
    const imekubaliwa = requests
      .filter((r) => r.status === 'imekubaliwa')
      .reduce((s, r) => s + parseFloat(r.amount || '0'), 0)
    return { zote, jumla, inasubiri, imekubaliwa }
  }, [requests])

  // ------------------------------------------------------------------
  // Tuma ombi — category_text typed manually
  // ------------------------------------------------------------------
  const tumaOmbi = async (payload: {
    category_text: string
    amount: number
    description: string
    reason: string
  }) => {
    if (!user?.store_id) {
      setToast({ msg: 'Hujapangiwa duka.', ok: false })
      setTimeout(() => setToast(null), 3000)
      throw new Error('Hujapangiwa duka.')
    }

    try {
      const req = await expensesApi.createRequest({
        store: user.store_id,
        category_text: payload.category_text,
        description: payload.description,
        reason: payload.reason,
        amount: payload.amount,
      })
      setRequests((prev) => [req, ...prev])
      setOpen(false)
      setToast({
        msg: `Ombi #${req.id.slice(0, 8)} limetumwa.`,
        ok: true,
      })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.category_text?.[0] ||
        'Imeshindikana kutuma ombi.'
      setToast({ msg: detail, ok: false })
      setTimeout(() => setToast(null), 4000)
      throw err
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet size={26} className="text-brand-600" /> Maombi ya Matumizi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Omba matumizi — Mmiliki ataidhinisha
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
            <Plus size={16} /> Omba Matumizi
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat
              label="Maombi Yote"
              value={String(stats.zote)}
              Icon={Wallet}
              tone="text-blue-600"
            />
            <Stat
              label="Jumla"
              value={formatTsh(stats.jumla)}
              Icon={Receipt}
              tone="text-brand-600"
            />
            <Stat
              label="Yanasubiri"
              value={formatTsh(stats.inasubiri)}
              Icon={Clock}
              tone="text-amber-600"
            />
            <Stat
              label="Yamekubaliwa"
              value={formatTsh(stats.imekubaliwa)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
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
            placeholder="Tafuta kwa ID, maelezo, au sababu..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ListFilter size={14} className="text-slate-400" />
          {(['zote', 'inasubiri', 'imekubaliwa', 'imekataliwa'] as const).map(
            (k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                  filter === k
                    ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {k === 'zote' ? 'Zote' : HALI_META[k].label}
              </button>
            )
          )}
        </div>
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
            <OmbiSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {q || filter !== 'zote'
              ? 'Hakuna matokeo'
              : 'Hakuna maombi bado'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q || filter !== 'zote'
              ? 'Badilisha kichujio au utafutaji.'
              : 'Bofya "Omba Matumizi" kuanza.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((m) => {
            const meta = HALI_META[m.status]
            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg ${meta.bg} border border-slate-200 grid place-items-center shrink-0 ${meta.tone}`}
                    >
                      <meta.Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          #{m.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                        {m.category_name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                            <Tag size={9} />
                            {m.category_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {m.description}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(m.request_date)}
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">
                      {formatTsh(m.amount)}
                    </div>
                  </div>
                </div>

                {m.approval_notes && (
                  <div className="mt-3 p-2 rounded-lg bg-slate-50 text-xs">
                    <span className="text-slate-500">Maoni ya mmiliki: </span>
                    {m.approval_notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {open && (
        <Fomu onClose={() => setOpen(false)} onSubmit={tumaOmbi} />
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

function OmbiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />
          <div className="min-w-0 space-y-1.5 flex-1">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-48" />
            <SkeletonLine className="h-3 w-24" />
          </div>
        </div>
        <div className="sm:text-right space-y-1.5">
          <SkeletonLine className="h-5 w-24 ml-auto" />
        </div>
      </div>
    </div>
  )
}

// ==================================================================
// Fomu ya ombi — aina ya matumizi inaandikwa kwa MKONO
// ==================================================================
function Fomu({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (payload: {
    category_text: string
    amount: number
    description: string
    reason: string
  }) => Promise<void>
}) {
  const [aina, setAina] = useState('')
  const [kiasi, setKiasi] = useState(0)
  const [maelezo, setMaelezo] = useState('')
  const [sababu, setSababu] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Mapendekezo ya haraka (si lazima — unaweza kuandika yoyote)
  const mapendekezo = ['Mafuta', 'Chakula', 'Usafiri', 'Umeme', 'Maji', 'Matengenezo']

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!aina.trim()) return setError('Aina ya matumizi inahitajika')
    if (kiasi <= 0) return setError('Kiasi lazima kiwe zaidi ya 0')
    if (!maelezo.trim()) return setError('Maelezo yanahitajika')
    if (!sababu.trim()) return setError('Sababu inahitajika')

    setLoading(true)
    try {
      await onSubmit({
        category_text: aina.trim(),
        amount: kiasi,
        description: maelezo.trim(),
        reason: sababu.trim(),
      })
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.category_text?.[0] ||
          err?.message ||
          'Imeshindikana kutuma ombi.'
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
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">Omba Matumizi</div>
            <div className="text-xs text-slate-500">
              Mmiliki ataidhinisha ombi lako
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
          {/* Aina ya matumizi — typed manually */}
          <div>
            <label className="text-sm font-medium">
              Aina ya Matumizi <span className="text-red-500">*</span>
            </label>
            <input
              value={aina}
              onChange={(e) => setAina(e.target.value)}
              placeholder="Mfano: Mafuta, Chakula, Umeme..."
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />

            {/* Mapendekezo ya haraka */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {mapendekezo.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAina(p)}
                  disabled={loading}
                  className={`text-[11px] px-2 py-1 rounded-full border transition ${
                    aina === p
                      ? 'bg-brand-50 border-brand-500 text-brand-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 mt-1.5">
              Andika aina yoyote. Kama haipo kwenye mfumo, itaundwa.
            </p>
          </div>

          {/* Kiasi */}
          <div>
            <label className="text-sm font-medium">
              Kiasi (TZS) <span className="text-red-500">*</span>
            </label>
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

          {/* Maelezo */}
          <div>
            <label className="text-sm font-medium">
              Maelezo <span className="text-red-500">*</span>
            </label>
            <input
              value={maelezo}
              onChange={(e) => setMaelezo(e.target.value)}
              placeholder="Mfano: Mafuta ya gari la duka"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          {/* Sababu */}
          <div>
            <label className="text-sm font-medium">
              Sababu <span className="text-red-500">*</span>
            </label>
            <textarea
              value={sababu}
              onChange={(e) => setSababu(e.target.value)}
              placeholder="Mfano: Safari ya kwenda kuchukua mzigo"
              rows={3}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm resize-none disabled:bg-slate-50"
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
                  Inatuma...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Tuma
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}