import { useEffect, useMemo, useState } from 'react'
import {
  User, Phone, Mail, Store, Shield, Briefcase, Wallet,
  CheckCircle2, XCircle, Building2, Pencil, Save, X, Crown,
  Users, Receipt, TrendingUp, Loader2, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../services/auth'
import { ordersApi } from '../../services/orders'
import { customersApi, type Customer } from '../../services/customers'
import { storesApi } from '../../services/stores'
import { staffApi, type Salary } from '../../services/staff'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

type Role = 'mteja' | 'muuzaji' | 'mmiliki'

const ROLE_ICON: Record<Role, React.ElementType> = {
  mteja: User,
  muuzaji: Briefcase,
  mmiliki: Crown,
}

const ROLE_LABEL: Record<Role, string> = {
  mteja: 'Mteja',
  muuzaji: 'Muuzaji',
  mmiliki: 'Mmiliki',
}

// ==================================================================
// Types za ndani
// ==================================================================
interface OrderPayment {
  id: string
  amount: string
  status: 'inasubiri' | 'imethibitishwa' | 'imekataliwa'
}

interface Order {
  id: string
  customer: string
  customer_name: string
  store: string
  order_date: string
  status: 'inasubiri_malipo' | 'imekamilika' | 'imekataliwa'
  total: string
  payments: OrderPayment[]
}

interface Store {
  id: string
  name: string
  location: string
  owner: string
  is_active: boolean
}

// ==================================================================
// Page
// ==================================================================
export default function MyProfile({ role }: { role: Role }) {
  const { user, refreshUser } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [salaries, setSalaries] = useState<Salary[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
  })

  // ------------------------------------------------------------------
  // Load data
  // ------------------------------------------------------------------
  const load = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      // Data za kila role
      if (role === 'mteja') {
        const [ords, custs] = await Promise.all([
          ordersApi.list(),
          customersApi.list(),
        ])
        setOrders(ords as Order[])
        setCustomers(custs)
      } else if (role === 'muuzaji') {
        const [ords, sals] = await Promise.all([
          ordersApi.list(),
          staffApi.salaries({ staff: user.id }),
        ])
        setOrders(ords as Order[])
        setSalaries(sals)
      } else {
        const [ords, str, sals] = await Promise.all([
          ordersApi.list(),
          storesApi.list(),
          staffApi.salaries(),
        ])
        setOrders(ords as Order[])
        setStores(str as Store[])
        setSalaries(sals)
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata taarifa. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role])

  // ------------------------------------------------------------------
  // Fungua edit
  // ------------------------------------------------------------------
  const openEdit = () => {
    if (!user) return
    setEditForm({
      full_name: user.full_name,
      phone: user.phone,
    })
    setEditOpen(true)
  }

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await authApi.updateMe({
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.replace(/\s|-/g, ''),
      })
      await refreshUser()
      setEditOpen(false)
      setToast({ msg: 'Wasifu umeshahifadhiwa.', ok: true })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kuhifadhi.',
        ok: false,
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSaving(false)
    }
  }

  // ------------------------------------------------------------------
  // Guard
  // ------------------------------------------------------------------
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <Loader2 size={32} className="animate-spin mx-auto text-brand-500" />
      </div>
    )
  }

  const RoleIcon = ROLE_ICON[role]
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <User size={26} className="text-brand-600" /> Wasifu Wangu
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Taarifa zako binafsi na muhtasari wa akaunti
        </p>
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

      {/* ============ KICHWA CHA WASIFU ============ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-brand-600 text-white grid place-items-center text-2xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {user.full_name}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                <RoleIcon size={10} />
                {ROLE_LABEL[role]}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="text-sm text-slate-600 flex items-center gap-1.5">
                <Phone size={12} className="text-slate-400" />
                {user.phone}
              </div>
              {user.store_id && (
                <div className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Store size={12} className="text-slate-400" />
                  Duka limepangiwa
                </div>
              )}
            </div>
          </div>
          <button
            onClick={openEdit}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold self-start sm:self-auto"
          >
            <Pencil size={14} /> Badilisha
          </button>
        </div>
      </div>

      {/* ============ MUHTASARI KULINGANA NA ROLE ============ */}
      {role === 'mteja' && (
        <MtejaSummary
          user={user}
          customers={customers}
          orders={orders}
          loading={loading}
        />
      )}
      {role === 'muuzaji' && (
        <MuuzajiSummary
          user={user}
          orders={orders}
          salaries={salaries}
          loading={loading}
        />
      )}
      {role === 'mmiliki' && (
        <MmilikiSummary
          stores={stores}
          orders={orders}
          salaries={salaries}
          loading={loading}
        />
      )}

      {/* ============ TAARIFA ZA AKOUNTI ============ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Shield size={16} className="text-brand-600" />
          Taarifa za Akaunti
        </h3>
        <div className="space-y-2 text-sm">
          <InfoRow label="Jina Kamili" value={user.full_name} />
          <InfoRow label="Namba ya Simu" value={user.phone} />
          <InfoRow label="Jukumu" value={ROLE_LABEL[role]} />
          <InfoRow label="Hali ya Akaunti" value="Active" tone="emerald" />
        </div>
      </div>

      {/* ============ MODAL YA KUBADILISHA ============ */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setEditOpen(false)}
          />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-semibold">Badilisha Wasifu</div>
                <div className="text-xs text-slate-500">
                  Sasisha taarifa zako binafsi
                </div>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                disabled={saving}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Jina Kamili</label>
                <input
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, full_name: e.target.value })
                  }
                  disabled={saving}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Namba ya Simu</label>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  inputMode="tel"
                  disabled={saving}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200 disabled:opacity-50"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? (
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
// MTEJA Summary
// ==================================================================
function MtejaSummary({
  user,
  customers,
  orders,
  loading,
}: {
  user: any
  customers: Customer[]
  orders: Order[]
  loading: boolean
}) {
  const stats = useMemo(() => {
    // Tafuta customer anayelingana na phone
    const mteja = customers.find((c) => c.phone === user.phone)
    if (!mteja) return { deni: 0, orders: 0, manunuzi: 0 }

    const ordersZake = orders.filter((o) => o.customer === mteja.id)
    const jumlaManunuzi = ordersZake.reduce(
      (s, o) => s + parseFloat(o.total || '0'),
      0
    )
    const deni = ordersZake.reduce((s, o) => {
      const confirmed = o.payments
        .filter((p) => p.status === 'imethibitishwa')
        .reduce((a, p) => a + parseFloat(p.amount || '0'), 0)
      return s + Math.max(parseFloat(o.total || '0') - confirmed, 0)
    }, 0)
    return {
      deni,
      orders: ordersZake.length,
      manunuzi: jumlaManunuzi,
    }
  }, [user.phone, customers, orders])

  if (loading) return <SummarySkeleton cols={3} />

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <SumStat
        label="Deni Langu"
        value={formatTsh(stats.deni)}
        Icon={Wallet}
        tone={stats.deni > 0 ? 'text-red-600' : 'text-emerald-600'}
      />
      <SumStat
        label="Orders"
        value={String(stats.orders)}
        Icon={Receipt}
        tone="text-blue-600"
      />
      <SumStat
        label="Manunuzi Yote"
        value={formatTsh(stats.manunuzi)}
        Icon={TrendingUp}
        tone="text-emerald-600"
      />
    </div>
  )
}

// ==================================================================
// MUUZAJI Summary
// ==================================================================
function MuuzajiSummary({
  user,
  orders,
  salaries,
  loading,
}: {
  user: any
  orders: Order[]
  salaries: Salary[]
  loading: boolean
}) {
  const stats = useMemo(() => {
    const ordersZake = orders.filter((o) => o.created_by === user.id)
    const jumlaMauzo = ordersZake.reduce(
      (s, o) => s + parseFloat(o.total || '0'),
      0
    )
    const jumlaFaida = ordersZake.reduce((s, o) => {
      const cogs = o.items.reduce(
        (a, it) =>
          a + parseFloat(it.unit_cost || '0') * parseFloat(it.quantity || '0'),
        0
      )
      return s + (parseFloat(o.total || '0') - cogs)
    }, 0)
    return {
      jumlaMauzo,
      jumlaFaida,
      ordersZake: ordersZake.length,
      mishahara: salaries.length,
    }
  }, [user.id, orders, salaries])

  if (loading) return <SummarySkeleton cols={4} />

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SumStat
        label="Mauzo Yangu"
        value={formatTsh(stats.jumlaMauzo)}
        Icon={Receipt}
        tone="text-blue-600"
      />
      <SumStat
        label="Faida Ghafi"
        value={formatTsh(stats.jumlaFaida)}
        Icon={TrendingUp}
        tone="text-emerald-600"
      />
      <SumStat
        label="Orders"
        value={String(stats.ordersZake)}
        Icon={Store}
        tone="text-purple-600"
      />
      <SumStat
        label="Mishahara"
        value={String(stats.mishahara)}
        Icon={Wallet}
        tone="text-amber-600"
      />
    </div>
  )
}

// ==================================================================
// MMILIKI Summary
// ==================================================================
function MmilikiSummary({
  stores,
  orders,
  salaries,
  loading,
}: {
  stores: Store[]
  orders: Order[]
  salaries: Salary[]
  loading: boolean
}) {
  const stats = useMemo(() => {
    const jumlaMauzo = orders.reduce(
      (s, o) => s + parseFloat(o.total || '0'),
      0
    )
    const jumlaFaida = orders.reduce((s, o) => {
      const cogs = o.items.reduce(
        (a, it) =>
          a + parseFloat(it.unit_cost || '0') * parseFloat(it.quantity || '0'),
        0
      )
      return s + (parseFloat(o.total || '0') - cogs)
    }, 0)
    return {
      jumlaMauzo,
      jumlaFaida,
      stores: stores.length,
      mishahara: salaries.length,
    }
  }, [orders, stores, salaries])

  if (loading) return <SummarySkeleton cols={4} />

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SumStat
        label="Maduka"
        value={String(stats.stores)}
        Icon={Building2}
        tone="text-blue-600"
      />
      <SumStat
        label="Wafanyakazi"
        value={String(stats.mishahara)}
        Icon={Users}
        tone="text-purple-600"
      />
      <SumStat
        label="Mauzo Yote"
        value={formatTsh(stats.jumlaMauzo)}
        Icon={Receipt}
        tone="text-emerald-600"
      />
      <SumStat
        label="Faida Ghafi"
        value={formatTsh(stats.jumlaFaida)}
        Icon={TrendingUp}
        tone="text-emerald-600"
      />
    </div>
  )
}

// ==================================================================
// Sub-components
// ==================================================================
function SumStat({
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

function SummarySkeleton({ cols }: { cols: number }) {
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-${cols} gap-3`}
      style={{ gridTemplateColumns: undefined }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200 p-4"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
          <SkeletonLine className="h-3 w-20 mt-3" />
          <SkeletonLine className="h-5 w-24 mt-2" />
        </div>
      ))}
    </div>
  )
}

function InfoRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'emerald' | 'red'
}) {
  const toneColor =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'red'
      ? 'text-red-700'
      : 'text-slate-900'

  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{label}</span>
      {tone ? (
        <span
          className={`inline-flex items-center gap-1 text-sm font-semibold ${toneColor}`}
        >
          {tone === 'emerald' && <CheckCircle2 size={12} />}
          {tone === 'red' && <XCircle size={12} />}
          {value}
        </span>
      ) : (
        <span className="font-semibold text-slate-900 text-right">{value}</span>
      )}
    </div>
  )
}