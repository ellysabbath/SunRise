import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, Banknote, CheckCircle2, Clock, Users, Zap,
  RefreshCw, AlertTriangle, Loader2, Search, ListFilter,
  XCircle, Store, Plus, X, Save, UserCheck,
} from 'lucide-react'
import { staffApi, type Salary, type SalaryStatus } from '../../services/staff'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { usersApi, type User } from '../../services/users'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Constants
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

function firstOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ==================================================================
// Page
// ==================================================================
export default function MmilikiMishahara() {
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [workers, setWorkers] = useState<User[]>([]) // wafanyakazi wenye duka

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [filterHali, setFilterHali] = useState<SalaryStatus | 'zote'>('zote')
  const [filterStore, setFilterStore] = useState<string>('zote')
  const [q, setQ] = useState('')

  const [openForm, setOpenForm] = useState(false)

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const results = await Promise.allSettled([
        staffApi.salaries(),
        storesApi.list(),
        usersApi.list(),
      ])

      const sals = results[0].status === 'fulfilled' ? results[0].value : []
      const str = results[1].status === 'fulfilled' ? results[1].value : []
      const usrs = results[2].status === 'fulfilled' ? results[2].value : []

      // ✅ Chuja tu wafanyakazi wenye duka (store !== null) na sio mteja
      const workersWithStore = usrs.filter(
        (u) =>
          u.store !== null &&
          u.store !== undefined &&
          ['muuzaji', 'mhazini', 'admin'].includes(u.role)
      )

      setSalaries(sals)
      setStores(str)
      setWorkers(workersWithStore)

      if (results[0].status === 'rejected') {
        const reason: any = results[0].reason
        setError(
          reason?.response?.data?.detail ||
            'Imeshindikana kupata mishahara.'
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
  // Filter + search
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    return salaries.filter((m) => {
      if (filterHali !== 'zote' && m.status !== filterHali) return false
      if (filterStore !== 'zote' && m.store !== filterStore) return false
      const query = q.toLowerCase().trim()
      if (!query) return true
      return (
        m.staff_name.toLowerCase().includes(query) ||
        (m.store_name || '').toLowerCase().includes(query)
      )
    })
  }, [salaries, filterHali, filterStore, q])

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  const stats = useMemo(() => {
    const zote = salaries.length
    const jumla = salaries.reduce(
      (s, m) => s + parseFloat(m.total_paid || '0'),
      0
    )
    const zilizolipwa = salaries.filter((m) => m.status === 'imelipwa')
    const jumlaIliyolipwa = zilizolipwa.reduce(
      (s, m) => s + parseFloat(m.total_paid || '0'),
      0
    )
    const inasubiri = salaries.filter((m) => m.status === 'inasubiri')
    const jumlaInasubiri = inasubiri.reduce(
      (s, m) => s + parseFloat(m.total_paid || '0'),
      0
    )
    return {
      zote,
      jumla,
      zilizolipwa: zilizolipwa.length,
      jumlaIliyolipwa,
      inasubiri: inasubiri.length,
      jumlaInasubiri,
    }
  }, [salaries])

  // ------------------------------------------------------------------
  // Lipa
  // ------------------------------------------------------------------
  const lipaMshahara = async (id: string) => {
    setProcessing(id)
    try {
      const updated = await staffApi.paySalary(id)
      setSalaries((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
      )
      setToast({ msg: 'Mshahara umelipwa.', ok: true })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kulipa.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Lipa zote
  // ------------------------------------------------------------------
  const lipaZote = async () => {
    const pending = filtered.filter((m) => m.status === 'inasubiri')
    if (pending.length === 0) return
    if (
      !confirm(
        `Una uhakika unataka kulipa mishahara ${pending.length}? Hii haiwezi kutenduliwa.`
      )
    )
      return

    setProcessing('all')
    try {
      const results = await Promise.allSettled(
        pending.map((m) => staffApi.paySalary(m.id))
      )

      const successful = results.filter(
        (r) => r.status === 'fulfilled'
      ).length
      const failed = results.filter((r) => r.status === 'rejected').length

      await load()

      if (failed > 0) {
        setToast({
          msg: `Imelipwa ${successful}, imeshindikana ${failed}.`,
          ok: false,
        })
      } else {
        setToast({ msg: `Mishahara ${successful} imelipwa.`, ok: true })
      }
      setTimeout(() => setToast(null), 4000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kulipa zote.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Ongeza mshahara
  // ------------------------------------------------------------------
  const ongezaMshahara = async (payload: {
    staff_id: string
    store_id: string
    month: string
    basic_salary: number
    allowances: number
    deductions: number
  }) => {
    try {
      const newSalary = await staffApi.createSalary(payload)
      setSalaries((prev) => [newSalary, ...prev])
      setOpenForm(false)
      setToast({
        msg: `Mshahara wa ${newSalary.staff_name} umeundwa.`,
        ok: true,
      })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kuunda mshahara.',
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
            <Wallet size={26} className="text-brand-600" /> Usimamizi wa
            Mishahara
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mishahara ya wafanyakazi waliosajiliwa kwenye maduka
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Sasisha
          </button>
          <button
            onClick={() => setOpenForm(true)}
            disabled={loading || workers.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} /> Ongeza Mshahara
          </button>
          {stats.inasubiri > 0 && (
            <button
              onClick={lipaZote}
              disabled={loading || processing === 'all'}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {processing === 'all' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Zap size={16} />
              )}
              Lipa ({filtered.filter((m) => m.status === 'inasubiri').length})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat
              label="Mishahara Yote"
              value={String(stats.zote)}
              Icon={Users}
              tone="text-blue-600"
            />
            <Stat
              label="Jumla"
              value={formatTsh(stats.jumla)}
              Icon={Wallet}
              tone="text-purple-600"
            />
            <Stat
              label="Zilizolipwa"
              value={formatTsh(stats.jumlaIliyolipwa)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
              sub={`${stats.zilizolipwa} wafanyakazi`}
            />
            <Stat
              label="Zinasubiri"
              value={formatTsh(stats.jumlaInasubiri)}
              Icon={Clock}
              tone="text-amber-600"
              sub={`${stats.inasubiri} wafanyakazi`}
            />
          </>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">
        <UserCheck size={16} className="mt-0.5 shrink-0" />
        <div>
          Wafanyakazi <strong>{workers.length}</strong> wamesajiliwa kwenye
          maduka. Mishahara inaundwa kwa wafanyakazi hawa pekee.
        </div>
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
            placeholder="Tafuta kwa jina au duka..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ListFilter size={14} className="text-slate-400" />

          {/* Filter kwa duka */}
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white"
          >
            <option value="zote">Maduka yote</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.replace('Smart Hardware - ', '')}
              </option>
            ))}
          </select>

          {/* Filter kwa hali */}
          {(['zote', 'inasubiri', 'imelipwa'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilterHali(k)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                filterHali === k
                  ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              {k === 'zote'
                ? 'Zote'
                : k === 'inasubiri'
                ? 'Zinasubiri'
                : 'Zilizolipwa'}
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

      {/* Loading — skeleton list */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <MshaharaSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {q || filterHali !== 'zote' || filterStore !== 'zote'
              ? 'Hakuna matokeo'
              : 'Hakuna mishahara bado'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q || filterHali !== 'zote' || filterStore !== 'zote'
              ? 'Badilisha vichujio au utafutaji.'
              : 'Bofya "Ongeza Mshahara" kuanza.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((m) => {
            const isPaid = m.status === 'imelipwa'
            const isProcessing = processing === m.id
            const initials = (m.staff_name || '?')
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
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full bg-slate-50 border border-slate-200 grid place-items-center text-xs font-bold shrink-0 ${
                        isPaid ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">
                        {m.staff_name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Store size={10} />
                        {m.store_name
                          ? m.store_name.replace('Smart Hardware - ', '')
                          : '—'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatMonth(m.month)}
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">
                      {formatTsh(m.total_paid)}
                    </div>
                    <div
                      className={`text-[10px] uppercase font-semibold ${
                        isPaid ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {isPaid ? 'Imelipwa' : 'Inasubiri'}
                    </div>
                    {isPaid && m.paid_at && (
                      <div className="text-[10px] text-slate-400">
                        {formatDate(m.paid_at)}
                      </div>
                    )}
                  </div>
                </div>

                {!isPaid && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => lipaMshahara(m.id)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Banknote size={12} />
                      )}
                      Lipa
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — Ongeza Mshahara */}
      {openForm && (
        <FomuMshahara
          onClose={() => setOpenForm(false)}
          onSubmit={ongezaMshahara}
          workers={workers}
          stores={stores}
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
// FomuMshahara
// ==================================================================
function FomuMshahara({
  onClose,
  onSubmit,
  workers,
  stores,
}: {
  onClose: () => void
  onSubmit: (payload: {
    staff_id: string
    store_id: string
    month: string
    basic_salary: number
    allowances: number
    deductions: number
  }) => Promise<void>
  workers: User[]
  stores: StoreType[]
}) {
  const [staffId, setStaffId] = useState('')
  const [storeId, setStoreId] = useState('')
  const [month, setMonth] = useState(firstOfMonth())
  const [basic, setBasic] = useState(0)
  const [allowances, setAllowances] = useState(0)
  const [deductions, setDeductions] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Chagua mfanyakazi wa kwanza + duka lake
  useEffect(() => {
    if (workers.length > 0 && !staffId) {
      const w = workers[0]
      setStaffId(w.id)
      setStoreId(w.store || '')
    }
  }, [workers, staffId])

  // Badilisha duka mfanyakazi anapobadilishwa
  useEffect(() => {
    const w = workers.find((x) => x.id === staffId)
    if (w && w.store) setStoreId(w.store)
  }, [staffId, workers])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!staffId) return setError('Chagua mfanyakazi')
    if (!storeId) return setError('Chagua duka')
    if (!month) return setError('Chagua mwezi')
    if (basic <= 0) return setError('Mshahara wa msingi unahitajika')

    setLoading(true)
    try {
      await onSubmit({
        staff_id: staffId,
        store_id: storeId,
        month,
        basic_salary: basic,
        allowances,
        deductions,
      })
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.staff_id?.[0] ||
          'Imeshindikana kuhifadhi.'
      )
      setLoading(false)
    }
  }

  const total = basic + allowances - deductions

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !loading && onClose()}
      />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">Ongeza Mshahara</div>
            <div className="text-xs text-slate-500">
              Mshahara wa mwezi kwa mfanyakazi
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
          {/* Mfanyakazi */}
          <div>
            <label className="text-sm font-medium">
              Mfanyakazi <span className="text-red-500">*</span>
            </label>
            {workers.length === 0 ? (
              <div className="mt-1 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
                Hakuna wafanyakazi waliosajiliwa kwenye duka. Panga duka kwanza
                kwenye ukurasa wa Wafanyakazi.
              </div>
            ) : (
              <>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  disabled={loading}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50 bg-white"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name} — {w.phone}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Wafanyakazi {workers.length} waliosajiliwa kwenye maduka.
                </p>
              </>
            )}
          </div>

          {/* Duka */}
          <div>
            <label className="text-sm font-medium">
              Duka <span className="text-red-500">*</span>
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50 bg-white"
            >
              <option value="">-- Chagua duka --</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mwezi */}
          <div>
            <label className="text-sm font-medium">
              Mwezi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Chagua siku ya kwanza ya mwezi (mfano 2025-11-01).
            </p>
          </div>

          {/* Msingi */}
          <div>
            <label className="text-sm font-medium">
              Mshahara wa Msingi <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={basic || ''}
              onChange={(e) => setBasic(Number(e.target.value))}
              placeholder="0"
              min={1}
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          {/* Posho + Makato */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">Posho</label>
              <input
                type="number"
                value={allowances || ''}
                onChange={(e) => setAllowances(Number(e.target.value))}
                placeholder="0"
                min={0}
                disabled={loading}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Makato</label>
              <input
                type="number"
                value={deductions || ''}
                onChange={(e) => setDeductions(Number(e.target.value))}
                placeholder="0"
                min={0}
                disabled={loading}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Jumla */}
          {basic > 0 && (
            <div className="p-3 rounded-lg bg-slate-50 text-sm flex justify-between">
              <span className="text-slate-600">Jumla</span>
              <span className="font-bold text-slate-900">
                {formatTsh(total)}
              </span>
            </div>
          )}

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
              disabled={loading || workers.length === 0}
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
                  Hifadhi Mshahara
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================================================================
// Stat
// ==================================================================
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
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
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

function MshaharaSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-3 w-20" />
          </div>
        </div>
        <div className="sm:text-right space-y-1.5">
          <SkeletonLine className="h-5 w-24 ml-auto" />
          <SkeletonLine className="h-3 w-16 ml-auto" />
        </div>
      </div>
    </div>
  )
}