
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import {
  Plus,
  Search,
  X,
  Save,
  Phone,
  MapPin,
  RefreshCw,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Store,
  User,
  Lock,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import {
  customersApi,
  type Customer,
  type CustomerType,
} from '../../services/customers'
import { ordersApi } from '../../services/orders'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { formatTsh } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ================================================================
// AINA ZA WATEJA
// ================================================================

const AINA: { key: CustomerType; label: string }[] = [
  { key: 'rejareja', label: 'Rejareja' },
  { key: 'jumla', label: 'Jumla' },
  { key: 'mkandarasi', label: 'Mkandarasi' },
]

// ================================================================
// TYPES
// ================================================================

interface OrderPayment {
  id: string
  amount: string
  status: 'inasubiri' | 'imethibitishwa' | 'imekataliwa'
}

interface Order {
  id: string
  customer: string
  store?: string
  total: string
  payments: OrderPayment[]
}

interface ApiError {
  response?: {
    data?: {
      detail?: string
    }
  }
  message?: string
}

interface CustomerPayload {
  full_name: string
  phone: string
  location: string
  customer_type: CustomerType
}

// ================================================================
// HELPER
// ================================================================

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  const err = error as ApiError

  return (
    err?.response?.data?.detail ||
    err?.message ||
    fallback
  )
}

function toAmount(value: string | number | undefined): number {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

// ================================================================
// UKURASA MKUU
// ================================================================

export default function MuuzajiWateja() {
  const { user } = useAuth()

  const storeId = user?.store_id || undefined
  const role = user?.role

  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [store, setStore] = useState<StoreType | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const [open, setOpen] = useState(false)

  const [toast, setToast] = useState<{
    msg: string
    ok: boolean
  } | null>(null)

  // ==============================================================
  // LOAD DATA
  // ==============================================================

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    // Hakikisha mtumiaji ameingia
    if (!user) {
      setCustomers([])
      setOrders([])
      setStore(null)
      setError('Tafadhali ingia kwenye mfumo kwanza.')
      setLoading(false)
      return
    }

    // Hakikisha mtumiaji ana duka
    if (!storeId) {
      setCustomers([])
      setOrders([])
      setStore(null)
      setError('Hujapangiwa duka. Wasiliana na mmiliki.')
      setLoading(false)
      return
    }

    // Ruhusa za kuona wateja
    if (
      role !== 'muuzaji' &&
      role !== 'mmiliki' &&
      role !== 'admin'
    ) {
      setCustomers([])
      setOrders([])
      setStore(null)
      setError('Huna ruhusa ya kuona wateja wa duka.')
      setLoading(false)
      return
    }

    try {
      const [custs, ords, myStore] = await Promise.all([
        customersApi.list({ store: storeId }),
        ordersApi.list({ store: storeId }),
        storesApi.get(storeId),
      ])

      setCustomers(custs)
      setOrders(ords as Order[])
      setStore(myStore)
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Imeshindikana kupata wateja. Angalia muunganisho.'
        )
      )
    } finally {
      setLoading(false)
    }
  }, [user, storeId, role])

  useEffect(() => {
    void load()
  }, [load])

  // ==============================================================
  // WATEJA WA DUKA HUSIKA
  // ==============================================================

  const myCustomers = useMemo(() => {
    if (!storeId) return []

    return customers.filter(
      (customer) =>
        !customer.store_id ||
        customer.store_id === storeId
    )
  }, [customers, storeId])

  // ==============================================================
  // ORDERS ZA DUKA HUSIKA
  // ==============================================================

  const myOrders = useMemo(() => {
    if (!storeId) return []

    return orders.filter(
      (order) =>
        !order.store ||
        order.store === storeId
    )
  }, [orders, storeId])

  // ==============================================================
  // SEARCH
  // ==============================================================

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()

    if (!query) return myCustomers

    return myCustomers.filter((customer) => {
      const name = customer.full_name?.toLowerCase() || ''
      const phone = customer.phone || ''

      return (
        name.includes(query) ||
        phone.includes(query)
      )
    })
  }, [myCustomers, q])

  // ==============================================================
  // MADENI YA WATEJA
  // ==============================================================

  const deniKwaMteja = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}

    myOrders.forEach((order) => {
      const confirmed = (order.payments || [])
        .filter(
          (payment) =>
            payment.status === 'imethibitishwa'
        )
        .reduce(
          (sum, payment) =>
            sum + toAmount(payment.amount),
          0
        )

      const baki = Math.max(
        toAmount(order.total) - confirmed,
        0
      )

      map[order.customer] =
        (map[order.customer] || 0) + baki
    })

    return map
  }, [myOrders])

  // ==============================================================
  // MANUNUZI YA WATEJA
  // ==============================================================

  const manunuziKwaMteja = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}

    myOrders.forEach((order) => {
      map[order.customer] =
        (map[order.customer] || 0) +
        toAmount(order.total)
    })

    return map
  }, [myOrders])

  // ==============================================================
  // TOAST
  // ==============================================================

  const showToast = useCallback(
    (msg: string, ok: boolean) => {
      setToast({ msg, ok })

      window.setTimeout(() => {
        setToast(null)
      }, ok ? 3000 : 4000)
    },
    []
  )

  // ==============================================================
  // ONGEZA MTEJA
  // ==============================================================

  const ongezaMteja = async (
    payload: CustomerPayload
  ): Promise<void> => {
    if (!storeId) {
      showToast(
        'Hujapangiwa duka. Wasiliana na mmiliki.',
        false
      )
      throw new Error('Hujapangiwa duka.')
    }

    try {
      const mteja = await customersApi.create({
        ...payload,
        store: storeId,
      })

      setCustomers((previous) => [
        mteja,
        ...previous,
      ])

      setOpen(false)

      showToast(
        `Mteja ${mteja.full_name} ameongezwa.`,
        true
      )
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        'Imeshindikana kuongeza mteja.'
      )

      showToast(message, false)

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
            <Users
              size={26}
              className="text-brand-600"
            />

            Wateja

            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
              title="Wateja wa duka lako pekee"
            >
              <Lock size={10} />
              Duka Lako
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
                Hujapangiwa duka
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 self-start sm:self-auto">

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

          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!storeId}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} />
            Ongeza Mteja
          </button>

        </div>
      </div>

      {/* SEARCH */}

      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={q}
          onChange={(event) =>
            setQ(event.target.value)
          }
          placeholder="Tafuta kwa jina au simu..."
          className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
        />
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0"
          />

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

      {/* LOADING */}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <WatejaSkeleton key={index} />
          ))}
        </div>
      )}

      {/* EMPTY */}

      {!loading &&
        filtered.length === 0 &&
        !error && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users
              size={40}
              className="mx-auto text-slate-300 mb-3"
            />

            <h3 className="font-semibold">
              {q
                ? 'Hakuna matokeo ya utafutaji'
                : 'Hakuna wateja bado kwenye duka lako'}
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              {q
                ? 'Badilisha neno la utafutaji.'
                : 'Bonyeza "Ongeza Mteja" kuanza.'}
            </p>
          </div>
        )}

      {/* CUSTOMER GRID */}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

          {filtered.map((customer) => {
            const deni =
              deniKwaMteja[customer.id] || 0

            const manunuzi =
              manunuziKwaMteja[customer.id] || 0

            const initials = customer.full_name
              .split(' ')
              .filter(Boolean)
              .map((name) => name[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()

            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 text-slate-700 grid place-items-center text-sm font-bold shrink-0">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {customer.full_name}
                    </div>

                    <div className="text-xs text-slate-500 capitalize">
                      {customer.customer_type}
                    </div>
                  </div>

                </div>

                {/* CONTACT */}

                <div className="mt-3 space-y-1 text-xs text-slate-600">

                  <div className="flex items-center gap-1.5">
                    <Phone size={12} />
                    {customer.phone}
                  </div>

                  {customer.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} />
                      {customer.location}
                    </div>
                  )}

                </div>

                {/* FINANCIAL SUMMARY */}

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">

                  <div>
                    <div className="text-slate-500">
                      Manunuzi
                    </div>

                    <div className="font-bold text-brand-700 truncate">
                      {formatTsh(manunuzi)}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">
                      Deni
                    </div>

                    <div
                      className={`font-bold truncate ${
                        deni > 0
                          ? 'text-red-600'
                          : 'text-emerald-600'
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

      {/* ADD CUSTOMER MODAL */}

      {open && (
        <Fomu
          storeId={storeId}
          onClose={() => setOpen(false)}
          onSubmit={ongezaMteja}
        />
      )}

      {/* TOAST */}

      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] text-white text-sm px-4 py-3 rounded-xl shadow-2xl max-w-md flex items-center gap-2 ${
            toast.ok
              ? 'bg-emerald-600'
              : 'bg-red-600'
          }`}
        >
          {toast.ok ? (
            <CheckCircle2
              size={16}
              className="shrink-0"
            />
          ) : (
            <XCircle
              size={16}
              className="shrink-0"
            />
          )}

          {toast.msg}
        </div>
      )}

    </div>
  )
}

// ================================================================
// SKELETON
// ================================================================

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

// ================================================================
// FOMU YA KUONGEZA MTEJA
// ================================================================

function Fomu({
  storeId,
  onClose,
  onSubmit,
}: {
  storeId?: string
  onClose: () => void
  onSubmit: (payload: CustomerPayload) => Promise<void>
}) {
  const [jina, setJina] = useState('')
  const [simu, setSimu] = useState('')
  const [aina, setAina] =
    useState<CustomerType>('rejareja')
  const [mahali, setMahali] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ==============================================================
  // SUBMIT
  // ==============================================================

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!storeId) {
      setError(
        'Hujapangiwa duka. Wasiliana na mmiliki.'
      )
      return
    }

    if (!jina.trim()) {
      setError('Jina linahitajika.')
      return
    }

    const cleanPhone = simu.replace(/\s|-/g, '')

    if (!/^0[67]\d{8}$/.test(cleanPhone)) {
      setError(
        'Weka namba sahihi ya simu (mfano 0754-123-456).'
      )
      return
    }

    setLoading(true)

    try {
      await onSubmit({
        full_name: jina.trim(),
        phone: cleanPhone,
        location: mahali.trim(),
        customer_type: aina,
      })
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Imeshindikana kuhifadhi mteja.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  // ==============================================================
  // FORM RENDER
  // ==============================================================

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">

      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!loading) onClose()
        }}
      />

      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* MODAL HEADER */}

        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">

          <div>
            <div className="font-semibold">
              Ongeza Mteja
            </div>

            <div className="text-xs text-slate-500">
              Jaza taarifa za mteja wa duka lako
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

        <form
          onSubmit={submit}
          className="p-4 space-y-3"
        >

          {/* NAME */}

          <div>
            <label
              htmlFor="customer-name"
              className="text-sm font-medium"
            >
              Jina Kamili
            </label>

            <input
              id="customer-name"
              value={jina}
              onChange={(event) =>
                setJina(event.target.value)
              }
              placeholder="Mfano: John Mwakyusa"
              disabled={loading}
              required
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          {/* PHONE */}

          <div>
            <label
              htmlFor="customer-phone"
              className="text-sm font-medium"
            >
              Namba ya Simu
            </label>

            <input
              id="customer-phone"
              value={simu}
              onChange={(event) =>
                setSimu(event.target.value)
              }
              placeholder="0754-123-456"
              inputMode="tel"
              type="tel"
              disabled={loading}
              required
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          {/* CUSTOMER TYPE */}

          <div>
            <label className="text-sm font-medium">
              Aina ya Mteja
            </label>

            <div className="grid grid-cols-3 gap-2 mt-1">

              {AINA.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setAina(item.key)}
                  disabled={loading}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition ${
                    aina === item.key
                      ? 'bg-brand-50 text-brand-700 border-brand-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}

            </div>
          </div>

          {/* LOCATION */}

          <div>
            <label
              htmlFor="customer-location"
              className="text-sm font-medium"
            >
              Mahali (hiari)
            </label>

            <input
              id="customer-location"
              value={mahali}
              onChange={(event) =>
                setMahali(event.target.value)
              }
              placeholder="Mfano: Kwembe, Dar"
              disabled={loading}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
            />
          </div>

          {/* ERROR */}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0"
              />
              {error}
            </div>
          )}

          {/* BUTTONS */}

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
              disabled={loading || !storeId}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
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
