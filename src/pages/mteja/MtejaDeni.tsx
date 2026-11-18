
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import type { FormEvent, ElementType } from 'react'
import { Navigate } from 'react-router-dom'

import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Banknote,
  Smartphone,
  X,
  Receipt,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

import {
  ordersApi,
  type Order,
  type MalipoNjia,
} from '../../services/orderss'

import { useAuth } from '../../context/AuthContext'

// ============================================================
// FORMAT
// ============================================================

function formatTsh(
  value: number | string | undefined | null,
): string {
  const amount = Number(value ?? 0)

  if (!Number.isFinite(amount)) {
    return 'TZS 0'
  }

  return `TZS ${amount.toLocaleString('en-US')}`
}

// ============================================================
// TYPES
// ============================================================

type NjiaMalipoDeni = 'mpesa' | 'tigopesa' | 'cash'

type OrderDeni = Order & {
  baki: number
  jumla: number
}

interface ToastData {
  msg: string
  ok: boolean
}

// ============================================================
// PAYMENT METHODS
// ============================================================

const NJIA_META: Record<
  NjiaMalipoDeni,
  {
    label: string
    Icon: ElementType
    tone: string
  }
> = {
  cash: {
    label: 'Cash',
    Icon: Banknote,
    tone: 'text-emerald-600',
  },

  mpesa: {
    label: 'M-Pesa',
    Icon: Smartphone,
    tone: 'text-brand-600',
  },

  tigopesa: {
    label: 'Tigo Pesa',
    Icon: Smartphone,
    tone: 'text-orange-600',
  },
}

const NJIA_BACKEND: Record<
  NjiaMalipoDeni,
  MalipoNjia
> = {
  cash: 'cash',
  mpesa: 'mpesa',
  tigopesa: 'tigo',
}

// ============================================================
// ERROR HANDLER
// ============================================================

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

// ============================================================
// MAIN PAGE
// ============================================================

export default function MtejaDeni() {
  const { user, loading: authLoading } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)

  // ----------------------------------------------------------
  // LOAD CUSTOMER DEBTS
  // ----------------------------------------------------------

  const loadAll = useCallback(async () => {
    if (!user) {
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Tumia deni() kwa sababu ordersApi haina orders()
      const data = await ordersApi.deni()

      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Imeshindwa kupakua taarifa za madeni.',
        ),
      )

      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      void loadAll()
    }
  }, [authLoading, loadAll])

  // ----------------------------------------------------------
  // FILTER ORDERS WITH UNPAID DEBTS
  // ----------------------------------------------------------

  const deniOrders = useMemo<OrderDeni[]>(() => {
    return orders
      .filter((order) => {
        return (
          Boolean(order.is_deni) &&
          !order.deni_imekwisha
        )
      })
      .map((order) => ({
        ...order,
        baki: Math.max(
          0,
          Number(order.deni_iliyobaki ?? 0),
        ),
        jumla: Number(order.total ?? 0),
      }))
      .filter((order) => order.baki > 0)
  }, [orders])

  // ----------------------------------------------------------
  // TOTAL DEBT
  // ----------------------------------------------------------

  const totalDeni = useMemo(() => {
    return deniOrders.reduce(
      (total, order) => total + order.baki,
      0,
    )
  }, [deniOrders])

  // ----------------------------------------------------------
  // PAYMENT MODAL
  // ----------------------------------------------------------

  const funguaMalipo = (orderId?: string) => {
    setSelectedOrder(orderId ?? null)
    setPayOpen(true)
  }

  // ----------------------------------------------------------
  // PAYMENT SUCCESS
  // ----------------------------------------------------------

  const handleSuccess = (
    msg: string,
    ok: boolean,
  ) => {
    setPayOpen(false)
    setToast({ msg, ok })

    window.setTimeout(() => {
      setToast(null)
    }, 5000)

    if (ok) {
      void loadAll()
    }
  }

  // ----------------------------------------------------------
  // AUTH REDIRECT
  // ----------------------------------------------------------

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2
          size={30}
          className="animate-spin text-brand-600"
        />
      </div>
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="max-w-3xl space-y-5">

      {/* HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Deni Langu
          </h1>

          {user?.full_name && (
            <p className="mt-1 text-sm text-slate-500">
              {user.full_name}

              {user.phone && (
                <span className="text-slate-400">
                  {' '}• {user.phone}
                </span>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0"
          />

          <span className="flex-1">
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-500"
            aria-label="Funga ujumbe"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* CURRENT DEBT */}

      {loading ? (
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-14 w-14 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-32 rounded bg-slate-200" />
          <div className="mt-2 h-8 w-48 rounded bg-slate-200" />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">
              <div
                className={`grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 ${
                  totalDeni > 0
                    ? 'text-red-600'
                    : 'text-emerald-600'
                }`}
              >
                <Wallet size={24} />
              </div>

              <div>
                <div className="text-sm text-slate-500">
                  Deni la Sasa
                </div>

                <div
                  className={`mt-1 text-2xl font-bold md:text-3xl ${
                    totalDeni > 0
                      ? 'text-red-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {formatTsh(totalDeni)}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {totalDeni > 0
                    ? 'Tafadhali lipa deni lako'
                    : 'Hauna deni — umelipa yote'}
                </div>
              </div>
            </div>

            {totalDeni > 0 && (
              <button
                type="button"
                onClick={() => funguaMalipo()}
                className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 sm:self-auto"
              >
                <Banknote size={16} />
                Lipa Deni
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* MY ORDERS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">
            Orders Zangu ({orders.length})
          </h2>

          {deniOrders.length > 0 && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {deniOrders.length} zina deni
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded bg-slate-100"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            Hakuna order bado
          </div>
        ) : (
          <div className="divide-y divide-slate-100">

            {orders.map((order) => {
              const baki = Math.max(
                0,
                Number(order.deni_iliyobaki ?? 0),
              )

              const isDeni =
                Boolean(order.is_deni) &&
                !order.deni_imekwisha &&
                baki > 0

              return (
                <div
                  key={order.id}
                  className="flex items-center gap-3 py-3"
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 ${
                      isDeni
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {isDeni ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm font-medium">
                      #{String(order.id).slice(0, 8).toUpperCase()}
                    </div>

                    <div className="text-xs text-slate-500">
                      {order.created_at?.slice(0, 10) || 'Tarehe haipo'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatTsh(order.total)}
                    </div>

                    {isDeni ? (
                      <div className="text-xs text-amber-700">
                        Baki: {formatTsh(baki)}
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-700">
                        Imelipwa
                      </div>
                    )}
                  </div>

                  {isDeni && (
                    <button
                      type="button"
                      onClick={() => funguaMalipo(order.id)}
                      className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                    >
                      <Banknote size={12} />
                      Lipa
                    </button>
                  )}
                </div>
              )
            })}

          </div>
        )}
      </div>

      {/* PAYMENT MODAL */}

      {payOpen && user && (
        <MalipoDeniModal
          key={selectedOrder ?? 'all-orders'}
          selectedOrder={selectedOrder}
          orders={deniOrders}
          userPhone={user.phone ?? ''}
          onClose={() => setPayOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* TOAST */}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 z-[60] flex max-w-md -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm text-white shadow-2xl ${
            toast.ok
              ? 'bg-emerald-600'
              : 'bg-red-600'
          }`}
        >
          {toast.ok ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}

          {toast.msg}

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Funga ujumbe"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// PAYMENT MODAL
// ============================================================

function MalipoDeniModal({
  selectedOrder,
  orders,
  userPhone,
  onClose,
  onSuccess,
}: {
  selectedOrder: string | null
  orders: OrderDeni[]
  userPhone: string
  onClose: () => void
  onSuccess: (msg: string, ok: boolean) => void
}) {
  const [njia, setNjia] = useState<NjiaMalipoDeni>('mpesa')
  const [kiasi, setKiasi] = useState(0)
  const [kumbukumbu, setKumbukumbu] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ----------------------------------------------------------
  // SELECTED ORDER
  // ----------------------------------------------------------

  const order = selectedOrder
    ? orders.find((item) => item.id === selectedOrder) ?? null
    : null

  const jumlaBaki = order
    ? order.baki
    : orders.reduce(
        (total, item) => total + item.baki,
        0,
      )

  // ----------------------------------------------------------
  // INITIAL PAYMENT AMOUNT
  // ----------------------------------------------------------

  useEffect(() => {
    setKiasi(jumlaBaki)
  }, [jumlaBaki])

  // ----------------------------------------------------------
  // SUBMIT PAYMENT
  // ----------------------------------------------------------

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setError('')

    if (!Number.isFinite(kiasi) || kiasi <= 0) {
      setError('Kiasi lazima kiwe zaidi ya sifuri.')
      return
    }

    if (kiasi > jumlaBaki) {
      setError('Kiasi hakiwezi kuzidi baki la deni.')
      return
    }

    if (njia !== 'cash' && !kumbukumbu.trim()) {
      setError('Weka kumbukumbu ya malipo (reference).')
      return
    }

    setSaving(true)

    try {
      const kumbukumbuMalipo =
        njia === 'cash'
          ? 'CASH'
          : kumbukumbu.trim().toUpperCase()

      const haliMalipo =
        njia === 'cash'
          ? 'imethibitishwa'
          : 'inasubiri'

      // ------------------------------------------------------
      // PAYMENT FOR ONE ORDER
      // ------------------------------------------------------

      if (order) {
        await ordersApi.createMalipo({
          order_id: order.id,
          njia: NJIA_BACKEND[njia],
          simu: userPhone,
          kumbukumbu: kumbukumbuMalipo,
          kiasi,
          hali: haliMalipo,
        })
      } else {
        // ----------------------------------------------------
        // PAYMENT FOR ALL ORDERS
        // ----------------------------------------------------

        let remaining = kiasi

        const sortedOrders = [...orders].sort(
          (a, b) => a.baki - b.baki,
        )

        for (const item of sortedOrders) {
          if (remaining <= 0) break
          if (item.baki <= 0) continue

          const malipoKiasi = Math.min(
            remaining,
            item.baki,
          )

          await ordersApi.createMalipo({
            order_id: item.id,
            njia: NJIA_BACKEND[njia],
            simu: userPhone,
            kumbukumbu: kumbukumbuMalipo,
            kiasi: malipoKiasi,
            hali: haliMalipo,
          })

          remaining -= malipoKiasi
        }
      }

      const message =
        njia === 'cash'
          ? `Malipo ya ${formatTsh(kiasi)} yamewasilishwa kwa Cash.`
          : `Malipo ya ${formatTsh(kiasi)} yamewasilishwa. Yanasubiri uthibitisho wa duka.`

      onSuccess(message, true)
    } catch (err) {
      onSuccess(
        getErrorMessage(
          err,
          'Imeshindwa kukamilisha malipo.',
        ),
        false,
      )
    } finally {
      setSaving(false)
    }
  }

  const njiaMeta = NJIA_META[njia]
  const NjiaIcon = njiaMeta.Icon

  // ==========================================================
  // MODAL RENDER
  // ==========================================================

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">

      {/* BACKDROP */}

      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!saving) onClose()
        }}
      />

      {/* MODAL CONTENT */}

      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">

        {/* HEADER */}

        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">

          <div>
            <div className="flex items-center gap-2 font-semibold">
              <Banknote
                size={16}
                className="text-brand-600"
              />
              Lipa Deni
            </div>

            <div className="text-xs text-slate-500">
              {order
                ? `Order #${String(order.id).slice(0, 8).toUpperCase()}`
                : `Orders ${orders.length} zenye deni`}
            </div>

            <div
              className={`mt-1 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold ${njiaMeta.tone}`}
            >
              <NjiaIcon size={10} />
              {njiaMeta.label}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!saving) onClose()
            }}
            disabled={saving}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Funga"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-4"
        >

          {/* REMAINING DEBT */}

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">
              Baki ya Kulipa
            </div>

            <div className="mt-0.5 text-2xl font-bold text-red-700">
              {formatTsh(jumlaBaki)}
            </div>
          </div>

          {/* PAYMENT METHOD */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Njia ya Malipo
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(
                Object.keys(NJIA_META) as NjiaMalipoDeni[]
              ).map((key) => {
                const meta = NJIA_META[key]
                const Icon = meta.Icon

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNjia(key)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition ${
                      njia === key
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      size={16}
                      className={meta.tone}
                    />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* AMOUNT */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Kiasi Unacholipa (TSh)
            </label>

            <input
              type="number"
              value={kiasi || ''}
              onChange={(event) => {
                setKiasi(Number(event.target.value))
              }}
              max={jumlaBaki}
              min={1}
              step={1}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            />

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setKiasi(jumlaBaki)}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium hover:bg-slate-200"
              >
                Lipa Yote
              </button>

              <button
                type="button"
                onClick={() => {
                  setKiasi(Math.floor(jumlaBaki / 2))
                }}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium hover:bg-slate-200"
              >
                Nusu
              </button>
            </div>
          </div>

          {/* PAYMENT REFERENCE */}

          {njia !== 'cash' && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Kumbukumbu ya Malipo
                <span className="text-red-500"> *</span>
              </label>

              <input
                type="text"
                value={kumbukumbu}
                onChange={(event) => {
                  setKumbukumbu(
                    event.target.value.toUpperCase(),
                  )
                }}
                placeholder="Mfano: QGR7XK2P9L"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-brand-500"
              />

              <div className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                <AlertTriangle
                  size={12}
                  className="mt-0.5 shrink-0"
                />
                Weka kumbukumbu halisi kutoka SMS ya mtandao.
              </div>
            </div>
          )}

          {/* PAYMENT INFORMATION */}

          {njia === 'cash' ? (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0"
              />
              Malipo ya Cash yatatumwa kama malipo yaliyothibitishwa.
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              <Smartphone
                size={14}
                className="mt-0.5 shrink-0"
              />
              Malipo yatasubiri uthibitisho wa duka. Deni litapungua baada ya uthibitisho.
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0"
              />
              {error}
            </div>
          )}

          {/* ACTION BUTTONS */}

          <div className="flex gap-2 border-t border-slate-200 pt-2">

            <button
              type="button"
              onClick={() => {
                if (!saving) onClose()
              }}
              disabled={saving}
              className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              Ghairi
            </button>

            <button
              type="submit"
              disabled={saving || jumlaBaki <= 0}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Inakamilisha...
                </>
              ) : (
                <>
                  <Receipt size={16} />
                  Thibitisha Malipo
                </>
              )}
            </button>

          </div>
        </form>
      </div>
    </div>
  )
}
