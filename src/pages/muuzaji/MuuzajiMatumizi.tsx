
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType, FormEvent } from 'react'
import {
  Wallet,
  Plus,
  X,
  Save,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Search,
  ListFilter,
  Loader2,
  Receipt,
  Store,
  User,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import {
  expensesApi,
  type ExpenseRequest,
} from '../../services/expenses'
import {
  storesApi,
  type Store as StoreType,
} from '../../services/stores'
import { formatTsh } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

type ExpenseStatus = 'pending' | 'approved' | 'rejected'
type ExpenseFilter = ExpenseStatus | 'zote'

interface ToastData {
  msg: string
  ok: boolean
}

interface ExpensePayload {
  category_text: string
  amount: number
  description: string
  reason: string
}

interface FormProps {
  onClose: () => void
  onSubmit: (payload: ExpensePayload) => Promise<void>
}

const HALI_META: Record<
  ExpenseStatus,
  {
    label: string
    bg: string
    text: string
    icon: ElementType
  }
> = {
  pending: {
    label: 'Inasubiri',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: Clock,
  },
  approved: {
    label: 'Imekubaliwa',
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Imekataliwa',
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: XCircle,
  },
}

/**
 * Hubadilisha status inayotoka backend kuwa status inayotambulika
 * kwenye frontend.
 */
function normalizeExpenseStatus(status: unknown): ExpenseStatus {
  const value = String(status ?? '')
    .trim()
    .toLowerCase()

  if (
    [
      'approved',
      'imekubaliwa',
      'imeidhinishwa',
      'accepted',
    ].includes(value)
  ) {
    return 'approved'
  }

  if (
    [
      'rejected',
      'imekataliwa',
      'declined',
    ].includes(value)
  ) {
    return 'rejected'
  }

  return 'pending'
}

function getAmount(amount: ExpenseRequest['amount']): number {
  const value = Number(amount ?? 0)
  return Number.isFinite(value) ? value : 0
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            detail?: string
            message?: string
          }
        }
      }
    ).response

    const message =
      response?.data?.detail ??
      response?.data?.message

    if (message) return message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function Stat({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: ElementType
  color: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <SkeletonLine className="mb-3 h-3 w-24" />
      <SkeletonLine className="h-6 w-20" />
    </div>
  )
}

function OmbiSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <SkeletonLine className="h-4 w-40" />
          <SkeletonLine className="h-3 w-28" />
          <SkeletonLine className="h-3 w-52" />
        </div>
        <SkeletonLine className="h-7 w-24 rounded-full" />
      </div>
    </div>
  )
}

function Fomu({ onClose, onSubmit }: FormProps) {
  const [aina, setAina] = useState('')
  const [kiasi, setKiasi] = useState('')
  const [maelezo, setMaelezo] = useState('')
  const [sababu, setSababu] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const ainaZilizopendekezwa = [
    'Mafuta',
    'Chakula',
    'Usafiri',
    'Umeme',
    'Maji',
    'Matengenezo',
  ]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const amount = Number(kiasi)

    if (!aina.trim()) {
      setError('Tafadhali weka aina ya matumizi.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Tafadhali weka kiasi sahihi cha fedha.')
      return
    }

    if (!maelezo.trim()) {
      setError('Tafadhali eleza matumizi unayoomba.')
      return
    }

    if (!sababu.trim()) {
      setError('Tafadhali eleza sababu ya matumizi haya.')
      return
    }

    setLoading(true)

    try {
      await onSubmit({
        category_text: aina.trim(),
        amount,
        description: maelezo.trim(),
        reason: sababu.trim(),
      })
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Imeshindikana kutuma ombi. Jaribu tena.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose()
        }
      }}
    >
      <div className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Omba Matumizi
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Jaza taarifa za matumizi unayoomba.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Funga"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Aina ya matumizi
            </label>

            <input
              type="text"
              value={aina}
              onChange={(event) => setAina(event.target.value)}
              placeholder="Mfano: Mafuta"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              {ainaZilizopendekezwa.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAina(item)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-blue-400 hover:bg-blue-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Kiasi cha fedha (TSh)
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={kiasi}
              onChange={(event) => setKiasi(event.target.value)}
              placeholder="Mfano: 50000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Maelezo ya matumizi
            </label>

            <textarea
              rows={3}
              value={maelezo}
              onChange={(event) => setMaelezo(event.target.value)}
              placeholder="Eleza matumizi unayoomba..."
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Sababu ya matumizi
            </label>

            <textarea
              rows={3}
              value={sababu}
              onChange={(event) => setSababu(event.target.value)}
              placeholder="Kwa nini matumizi haya yanahitajika?"
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Ghairi
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Inatuma...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Tuma Ombi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MuuzajiMatumizi() {
  const { user } = useAuth()

  const storeId = user?.store_id
    ? String(user.store_id)
    : ''

  const userId = user?.id
    ? String(user.id)
    : ''

  const [requests, setRequests] = useState<ExpenseRequest[]>([])
  const [store, setStore] = useState<StoreType | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ExpenseFilter>('zote')

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok })

    window.setTimeout(() => {
      setToast(null)
    }, 3500)
  }, [])

  const load = useCallback(async (showLoader = true) => {
    if (!user) {
      setRequests([])
      setStore(null)
      setLoading(false)
      setError('Tafadhali ingia kwenye akaunti yako.')
      return
    }

    if (!storeId) {
      setRequests([])
      setStore(null)
      setLoading(false)
      setError('Akaunti yako haijaunganishwa na duka.')
      return
    }

    if (showLoader) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    setError('')

    try {
      const [requestData, storeData] = await Promise.all([
        expensesApi.requests(),
        storesApi.get(storeId),
      ])

      setRequests(
        Array.isArray(requestData)
          ? requestData
          : [],
      )

      setStore(storeData)
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Imeshindikana kupata taarifa za matumizi.',
        ),
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, storeId])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Chuja maombi ya duka na mtumiaji husika.
   * Kama backend haijajumuisha field husika, ombi haliondolewi
   * kwa sababu ya field hiyo kukosekana.
   */
  const myRequests = useMemo(() => {
    return requests.filter((request) => {
      const requestStore = request.store
        ? String(request.store)
        : ''

      const requestUser = request.requested_by
        ? String(request.requested_by)
        : ''

      if (
        requestStore &&
        requestStore !== storeId
      ) {
        return false
      }

      if (
        requestUser &&
        userId &&
        requestUser !== userId
      ) {
        return false
      }

      return true
    })
  }, [requests, storeId, userId])

  const stats = useMemo(() => {
    const pending = myRequests.filter(
      (request) =>
        normalizeExpenseStatus(request.status) === 'pending',
    )

    const approved = myRequests.filter(
      (request) =>
        normalizeExpenseStatus(request.status) === 'approved',
    )

    const rejected = myRequests.filter(
      (request) =>
        normalizeExpenseStatus(request.status) === 'rejected',
    )

    const totalAmount = myRequests.reduce(
      (total, request) => total + getAmount(request.amount),
      0,
    )

    return {
      total: myRequests.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      totalAmount,
    }
  }, [myRequests])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()

    return myRequests.filter((request) => {
      if (
        filter !== 'zote' &&
        normalizeExpenseStatus(request.status) !== filter
      ) {
        return false
      }

      if (!query) return true

      const id = String(request.id ?? '').toLowerCase()
      const description = String(
        request.description ?? '',
      ).toLowerCase()

      const storeName = String(
        request.store_name ?? '',
      ).toLowerCase()

      const requestedBy = String(
        request.requested_by_name ?? '',
      ).toLowerCase()

      return (
        id.includes(query) ||
        description.includes(query) ||
        storeName.includes(query) ||
        requestedBy.includes(query)
      )
    })
  }, [myRequests, q, filter])

  const tumaOmbi = async (payload: ExpensePayload) => {
    if (!userId || !storeId) {
      showToast(
        'Taarifa za akaunti au duka hazijapatikana.',
        false,
      )
      return
    }

    try {
      const created = await expensesApi.createRequest({
        store: storeId,
        requested_by: userId,
        category_text: payload.category_text,
        description: payload.description,
        reason: payload.reason,
        amount: payload.amount,
      })

      setRequests((previous) => [
        created,
        ...previous,
      ])

      setOpen(false)
      showToast('Ombi lako limetumwa kikamilifu.', true)
    } catch (err) {
      const message = getErrorMessage(
        err,
        'Imeshindikana kutuma ombi.',
      )

      showToast(message, false)
      throw err
    }
  }

  const filterOptions: {
    value: ExpenseFilter
    label: string
  }[] = [
    { value: 'zote', label: 'Maombi yote' },
    { value: 'pending', label: 'Inasubiri' },
    { value: 'approved', label: 'Imekubaliwa' },
    { value: 'rejected', label: 'Imekataliwa' },
  ]

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Wallet size={23} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Matumizi ya Duka
              </h1>
              <p className="text-sm text-gray-500">
                Simamia na fuatilia maombi yako ya matumizi.
              </p>
            </div>
          </div>

          {store && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Store size={15} />
              <span>{store.name}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load(false)}
            disabled={loading || refreshing}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            Onyesha upya
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Omba Matumizi
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Stat
              title="Maombi yote"
              value={stats.total}
              icon={Receipt}
              color="bg-blue-100 text-blue-700"
            />

            <Stat
              title="Yanasubiri"
              value={stats.pending}
              icon={Clock}
              color="bg-amber-100 text-amber-700"
            />

            <Stat
              title="Yamekubaliwa"
              value={stats.approved}
              icon={CheckCircle2}
              color="bg-green-100 text-green-700"
            />

            <Stat
              title="Yamekataliwa"
              value={stats.rejected}
              icon={XCircle}
              color="bg-red-100 text-red-700"
            />
          </>
        )}
      </div>

      {/* Total amount */}
      {!loading && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            Jumla ya kiasi kilichoombwa
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-900">
            {formatTsh(stats.totalAmount)}
          </p>
        </div>
      )}

      {/* Search and filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tafuta maombi..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ListFilter size={17} className="text-gray-400" />

            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  filter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* Requests list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Orodha ya Maombi
          </h2>

          {!loading && (
            <span className="text-sm text-gray-500">
              {filtered.length} maombi
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <OmbiSkeleton />
            <OmbiSkeleton />
            <OmbiSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Receipt size={27} />
            </div>

            <h3 className="mt-4 font-semibold text-gray-800">
              Hakuna maombi yaliyopatikana
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              {q || filter !== 'zote'
                ? 'Jaribu kubadilisha utafutaji au kichujio.'
                : 'Bado hujatuma ombi lolote la matumizi.'}
            </p>

            {!q && filter === 'zote' && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={17} />
                Omba Matumizi
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((request) => {
              const status = normalizeExpenseStatus(
                request.status,
              )

              const meta = HALI_META[status]
              const StatusIcon = meta.icon

              return (
                <div
                  key={request.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {request.description || 'Ombi la matumizi'}
                        </h3>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.bg} ${meta.text}`}
                        >
                          <StatusIcon size={14} />
                          {meta.label}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Receipt size={15} />
                          Ombi #{String(request.id)}
                        </span>

                        {request.store_name && (
                          <span className="flex items-center gap-1.5">
                            <Store size={15} />
                            {request.store_name}
                          </span>
                        )}

                        {request.requested_by_name && (
                          <span className="flex items-center gap-1.5">
                            <User size={15} />
                            {request.requested_by_name}
                          </span>
                        )}
                      </div>

                      {request.approval_notes && (
                        <div className="mt-3 rounded-lg bg-gray-50 p-3">
                          <p className="text-xs font-semibold text-gray-600">
                            Maelezo ya uamuzi
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {request.approval_notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-xs text-gray-500">
                        Kiasi kilichoombwa
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {formatTsh(getAmount(request.amount))}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Request form */}
      {open && (
        <Fomu
          onClose={() => setOpen(false)}
          onSubmit={tumaOmbi}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
            toast.ok ? 'bg-green-600' : 'bg-red-600'
          }`}
          role="status"
        >
          {toast.ok ? (
            <CheckCircle2 size={19} className="shrink-0" />
          ) : (
            <AlertTriangle size={19} className="shrink-0" />
          )}

          <span>{toast.msg}</span>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 rounded p-0.5 hover:bg-white/20"
            aria-label="Funga ujumbe"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
