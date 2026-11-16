import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, X, Save, Phone, MapPin, RefreshCw,
  Users, AlertTriangle, Loader2, CheckCircle2, XCircle,
} from 'lucide-react'
import {
  customersApi,
  type Customer,
  type CustomerType,
} from '../../services/customers'
import { ordersApi } from '../../services/orders'
import { formatTsh } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Aina za mteja (backend: rejareja, jumla, mkandarasi)
// ==================================================================
const AINA: { key: CustomerType; label: string }[] = [
  { key: 'rejareja', label: 'Rejareja' },
  { key: 'jumla', label: 'Jumla' },
  { key: 'mkandarasi', label: 'Mkandarasi' },
]

// ==================================================================
// Types za ndani (kutoka orders)
// ==================================================================
interface OrderPayment {
  id: string
  amount: string
  status: 'inasubiri' | 'imethibitishwa' | 'imekataliwa'
}

interface Order {
  id: string
  customer: string
  total: string
  payments: OrderPayment[]
}

// ==================================================================
// Page
// ==================================================================
export default function MuuzajiWateja() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

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
      setOrders(ords as Order[])
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
  // Filter
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
  // Deni kwa kila mteja (kutoka orders)
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
  // Ongeza mteja
  // ------------------------------------------------------------------
  const ongezaMteja = async (payload: {
    full_name: string
    phone: string
    location: string
    customer_type: CustomerType
  }) => {
    try {
      const mteja = await customersApi.create(payload)
      setCustomers((prev) => [mteja, ...prev])
      setOpen(false)
      setToast({ msg: `Mteja ${mteja.full_name} ameongezwa.`, ok: true })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        'Imeshindikana kuongeza mteja.'
      setToast({ msg: detail, ok: false })
      setTimeout(() => setToast(null), 4000)
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
            <Users size={26} className="text-brand-600" /> Wateja
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sajili na simamia wateja wa duka
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
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700"
          >
            <Plus size={16} /> Ongeza Mteja
          </button>
        </div>
      </div>

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
          className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
        />
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

      {/* Loading — skeleton grid */}
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
            {q ? 'Hakuna matokeo ya utafutaji' : 'Hakuna wateja bado'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q
              ? 'Badilisha neno la utafutaji.'
              : 'Bonyeza "Ongeza Mteja" kuanza.'}
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
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 text-slate-700 grid place-items-center text-sm font-bold shrink-0">
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

      {/* Modal */}
      {open && (
        <Fomu onClose={() => setOpen(false)} onSubmit={ongezaMteja} />
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
// Skeleton
// ==================================================================
function WatejaSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
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

// ==================================================================
// Fomu ya kuongeza mteja
// ==================================================================
function Fomu({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (payload: {
    full_name: string
    phone: string
    location: string
    customer_type: CustomerType
  }) => Promise<void>
}) {
  const [jina, setJina] = useState('')
  const [simu, setSimu] = useState('')
  const [aina, setAina] = useState<CustomerType>('rejareja')
  const [mahali, setMahali] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!jina.trim()) return setError('Jina linahitajika')
    if (!/^0[67]\d{2}-?\d{3}-?\d{3}$/.test(simu.replace(/\s/g, '')))
      return setError('Weka namba sahihi ya simu (mfano 0754-123-456)')

    setLoading(true)
    try {
      await onSubmit({
        full_name: jina.trim(),
        phone: simu.replace(/\s|-/g, ''),
        location: mahali.trim(),
        customer_type: aina,
      })
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Imeshindikana kuhifadhi.'
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
            <div className="font-semibold">Ongeza Mteja</div>
            <div className="text-xs text-slate-500">
              Jaza taarifa za mteja
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
          <div>
            <label className="text-sm font-medium">Jina Kamili</label>
            <input
              value={jina}
              onChange={(e) => setJina(e.target.value)}
              placeholder="Mfano: John Mwakyusa"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Namba ya Simu</label>
            <input
              value={simu}
              onChange={(e) => setSimu(e.target.value)}
              placeholder="0754-123-456"
              inputMode="tel"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Aina ya Mteja</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {AINA.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAina(a.key)}
                  disabled={loading}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition ${
                    aina === a.key
                      ? 'bg-brand-50 text-brand-700 border-brand-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Mahali (hiari)</label>
            <input
              value={mahali}
              onChange={(e) => setMahali(e.target.value)}
              placeholder="Mfano: Kwembe, Dar"
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
                  Inahifadhi...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Hifadhi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}