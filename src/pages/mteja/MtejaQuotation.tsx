import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  FileText, Trash2, Plus, Minus, Smartphone, ArrowLeft, CheckCircle2,
  Loader2, AlertTriangle, Phone, Store as StoreIcon,
} from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { ordersApi } from '../../services/orderss'
import { customersApi, type Customer } from '../../services/customers'
import { iconForKundi } from '../../utils/icons'

// ==================================================================
// Format
// ==================================================================
function formatTsh(n: number | string | undefined | null): string {
  if (n == null) return 'TZS 0'
  return `TZS ${Number(n).toLocaleString('en-US')}`
}

// ==================================================================
// Page
// ==================================================================
export default function MtejaQuotation() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { detailed, total, count, inc, dec, remove, clear } = useCart()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerLoading, setCustomerLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState(user?.phone || '')

  // ------------------------------------------------------------------
  // Guard
  // ------------------------------------------------------------------
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />
  }

  // ------------------------------------------------------------------
  // ✅ Load customer — kutafuta kwa phone ya user
  // ------------------------------------------------------------------
  const loadCustomer = useCallback(async () => {
    if (!user?.phone) return
    setCustomerLoading(true)
    try {
      const customers = await customersApi.list().catch(() => [])
      const me = customers.find((c) => c.phone === user.phone)
      setCustomer(me || null)
    } catch {
      setCustomer(null)
    } finally {
      setCustomerLoading(false)
    }
  }, [user?.phone])

  useEffect(() => {
    if (user?.phone) loadCustomer()
  }, [user?.phone, loadCustomer])

  // ------------------------------------------------------------------
  // ✅ Lipa — create order + malipo
  // ------------------------------------------------------------------
  const lipa = async () => {
    if (detailed.length === 0) return
    if (!user) return

    // ✅ Validation
    if (!customer) {
      setError(
        'Hujasajiliwa kama mteja. Tafadhali wasiliana na muuzaji wako.'
      )
      return
    }
    if (!user.store_id) {
      setError('Hakuna duka lililowekwa kwenye akaunti yako.')
      return
    }
    if (!phone.trim()) {
      setError('Weka namba ya simu kwa malipo')
      return
    }

    setLoading(true)
    setError('')

    try {
      // ✅ 1. Create order — na customer_id, store_id, items
      const order = await ordersApi.create({
        customer_id: customer.id,          // ✅ kutoka customersApi
        store_id: user.store_id,          // ✅ kutoka AuthContext
        items: detailed.map((l) => ({
          product_id: l.id,
          quantity: l.wingi,
        })),
      })

      // ✅ 2. Create malipo
      await ordersApi.createMalipo({
        order_id: order.id,
        njia: 'mpesa',
        simu: phone,
        kumbukumbu: `MPESA-${Date.now().toString().slice(-6)}`,
        kiasi: total,
        hali: 'imethibitishwa',
      })

      // ✅ 3. Clear cart + toast
      clear()
      setToast(`Malipo yamekamilika! Order #${order.id.slice(0, 8).toUpperCase()}`)

      // ✅ 4. Redirect
      setTimeout(() => navigate(`/mteja/order/${order.id}`), 1200)
    } catch (e: any) {
      const detail = e?.response?.data
      if (typeof detail === 'object') {
        const first = Object.values(detail)[0]
        setError(String(first))
      } else {
        setError(detail || 'Imeshindwa kukamilisha malipo')
      }
    } finally {
      setLoading(false)
    }
  }

  // ------------------------------------------------------------------
  // Empty cart
  // ------------------------------------------------------------------
  if (detailed.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          Quotation
        </h1>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">Cart yako ni tupu</h3>
          <p className="text-sm text-slate-500 mt-1">Ongeza bidhaa kwanza.</p>
          <button
            onClick={() => navigate('/mteja/bidhaa')}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700"
          >
            <ArrowLeft size={16} /> Nenda Bidhaa
          </button>
        </div>
      </div>
    )
  }

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Quotation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {count} bidhaa kwenye cart
            {user?.full_name && (
              <span className="ml-1 text-slate-400">• {user.full_name}</span>
            )}
          </p>
        </div>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100 self-start sm:self-auto"
        >
          <Trash2 size={14} /> Futa Cart
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500">
            ✕
          </button>
        </div>
      )}

      {/* ✅ Info boxes — customer + store */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className={`p-3 rounded-xl border ${customer ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2">
            <Phone size={14} className={customer ? 'text-emerald-600' : 'text-amber-600'} />
            <div className="text-xs font-semibold text-slate-700">Mteja</div>
          </div>
          {customerLoading ? (
            <div className="text-xs text-slate-500 mt-1">Inatafuta...</div>
          ) : customer ? (
            <>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                {customer.full_name}
              </div>
              <div className="text-xs text-slate-500">{customer.phone}</div>
            </>
          ) : (
            <div className="text-xs text-amber-700 mt-1">
              Hujasajiliwa kama mteja — wasiliana na muuzaji
            </div>
          )}
        </div>

        <div className={`p-3 rounded-xl border ${user?.store_id ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            <StoreIcon size={14} className={user?.store_id ? 'text-emerald-600' : 'text-red-600'} />
            <div className="text-xs font-semibold text-slate-700">Duka</div>
          </div>
          {user?.store_id ? (
            <div className="text-sm font-semibold text-slate-900 mt-1 font-mono text-xs">
              {user.store_id.slice(0, 12)}...
            </div>
          ) : (
            <div className="text-xs text-red-700 mt-1">
              Hakuna duka — wasiliana na muuzaji
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-3 pl-4 md:pl-0 font-medium">Bidhaa</th>
                <th className="py-3 text-right font-medium">Bei</th>
                <th className="py-3 text-center font-medium">Wingi</th>
                <th className="py-3 text-right font-medium">Jumla</th>
                <th className="py-3 pr-4 md:pr-0"></th>
              </tr>
            </thead>
            <tbody>
              {detailed.map((l) => {
                const Icon = iconForKundi(l.iconKey)
                return (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-3 pl-4 md:pl-0">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 grid place-items-center shrink-0">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{l.jina}</div>
                          <div className="text-xs text-slate-500">{l.uom}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {formatTsh(l.bei)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => dec(l.id)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 grid place-items-center"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center font-semibold">
                          {l.wingi}
                        </span>
                        <button
                          onClick={() => inc(l.id)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 grid place-items-center"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold whitespace-nowrap">
                      {formatTsh(l.jumla)}
                    </td>
                    <td className="py-3 pr-4 md:pr-0 text-right">
                      <button
                        onClick={() => remove(l.id)}
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-3 text-right font-semibold">
                  JUMLA
                </td>
                <td className="py-3 text-right font-bold text-brand-700 text-lg whitespace-nowrap">
                  {formatTsh(total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment phone */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">
            <Phone size={12} className="inline mr-1" />
            Namba ya Simu (kwa malipo)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mfano: 0712345678"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Utapokea prompt ya malipo kwenye namba hii
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          <button
            onClick={lipa}
            disabled={
              loading ||
              !phone.trim() ||
              !customer ||
              !user?.store_id
            }
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Inathibitisha...
              </>
            ) : (
              <>
                <Smartphone size={16} />
                Lipa {formatTsh(total)}
              </>
            )}
          </button>
          <button
            onClick={() => navigate('/mteja/bidhaa')}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 sm:ml-auto disabled:opacity-50"
          >
            <ArrowLeft size={16} /> Endelea Kununua
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  )
}