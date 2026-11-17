import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3, TrendingUp, Package, Users, Wallet,
  AlertTriangle, CheckCircle2, Download,
  FileText, Search, Trash2, X, Eye, Plus,
  Clock, RefreshCw, Loader2, ArrowDownToLine,
  Table as TableIcon, File, HelpCircle,
  Store, User, Lock, Calendar, Filter,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { ordersApi, type Order as ApiOrder } from '../../services/orders'
import { productsApi, type Product } from '../../services/products'
import { customersApi, type Customer } from '../../services/customers'
import { inventoryApi, type StockLevel } from '../../services/inventory'
import { storesApi, type Store as StoreType } from '../../services/stores'
import {
  documentsApi,
  type DocumentMeta,
  type AinaDocument,
} from '../../services/documents'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Local types — tunatumia ApiOrder kutoka services
// ==================================================================
type Order = ApiOrder

// ==================================================================
// Date filter
// ==================================================================
type FilterMode = 'zote' | 'mwaka' | 'mwezi' | 'wiki' | 'siku'

interface DateFilter {
  mode: FilterMode
  mwaka: number
  mwezi: number
  wiki: number
  siku: string
}

function getMwakaWaSasa() {
  return new Date().getFullYear()
}
function getMweziWaSasa() {
  return new Date().getMonth() + 1
}
function getWikiYaSasa() {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  const days = Math.floor((d.getTime() - start.getTime()) / 86400000)
  return Math.ceil((days + start.getDay() + 1) / 7)
}
function getSikuYaSasa() {
  return new Date().toISOString().slice(0, 10)
}

function ikoNdaniYaFilter(tarehe: string, filter: DateFilter): boolean {
  if (!tarehe) return false
  const t = new Date(tarehe)
  if (isNaN(t.getTime())) return false
  if (filter.mode === 'zote') return true
  if (filter.mode === 'mwaka') return t.getFullYear() === filter.mwaka
  if (filter.mode === 'mwezi')
    return t.getFullYear() === filter.mwaka && t.getMonth() + 1 === filter.mwezi
  if (filter.mode === 'wiki') {
    if (t.getFullYear() !== filter.mwaka) return false
    const start = new Date(filter.mwaka, 0, 1)
    const days = Math.floor((t.getTime() - start.getTime()) / 86400000)
    return Math.ceil((days + start.getDay() + 1) / 7) === filter.wiki
  }
  if (filter.mode === 'siku') return tarehe.slice(0, 10) === filter.siku
  return true
}

// ==================================================================
// Meta
// ==================================================================
const AINA_DOC_META: Record<
  AinaDocument,
  { label: string; Icon: React.ElementType; tone: string }
> = {
  mauzo: { label: 'Mauzo', Icon: TrendingUp, tone: 'text-blue-600' },
  stoki: { label: 'Stoki', Icon: Package, tone: 'text-emerald-600' },
  wateja: { label: 'Wateja', Icon: Users, tone: 'text-purple-600' },
  madeni: { label: 'Madeni', Icon: Wallet, tone: 'text-red-600' },
  gharama: { label: 'Gharama', Icon: FileText, tone: 'text-amber-600' },
  jumla: { label: 'Jumla', Icon: BarChart3, tone: 'text-slate-600' },
}

const FORMAT_META: Record<
  'pdf' | 'csv',
  { Icon: React.ElementType; tone: string }
> = {
  pdf: { Icon: File, tone: 'text-red-600' },
  csv: { Icon: TableIcon, tone: 'text-blue-600' },
}

const HALI_DOC_META: Record<
  'tayari' | 'inasindika' | 'imemalizika',
  { label: string; Icon: React.ElementType; tone: string }
> = {
  tayari: { label: 'Tayari', Icon: CheckCircle2, tone: 'text-emerald-600' },
  inasindika: { label: 'Inasindika', Icon: Clock, tone: 'text-amber-600' },
  imemalizika: {
    label: 'Imemalizika',
    Icon: CheckCircle2,
    tone: 'text-slate-600',
  },
}

type Tab = 'mauzo' | 'stoki' | 'wateja' | 'documents'

const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
  { key: 'mauzo', label: 'Mauzo', Icon: TrendingUp },
  { key: 'stoki', label: 'Stoki', Icon: Package },
  { key: 'wateja', label: 'Wateja', Icon: Users },
  { key: 'documents', label: 'Documents', Icon: FileText },
]

// ==================================================================
// Toast
// ==================================================================
function Toast({
  message,
  ok,
  onClose,
}: {
  message: string
  ok: boolean
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-md ${
        ok ? 'bg-emerald-600' : 'bg-red-600'
      }`}
    >
      {ok ? (
        <CheckCircle2 size={16} className="shrink-0" />
      ) : (
        <AlertTriangle size={16} className="shrink-0" />
      )}
      <div className="flex-1">{message}</div>
      <button onClick={onClose} className="p-0.5 rounded hover:bg-white/20">
        <X size={14} />
      </button>
    </div>
  )
}

// ==================================================================
// ConfirmModal
// ==================================================================
function ConfirmModal({
  open,
  title,
  message,
  tone = 'danger',
  confirmLabel = 'Thibitisha',
  cancelLabel = 'Ghairi',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  tone?: 'danger' | 'warning' | 'success' | 'info'
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  const toneMap = {
    danger: {
      iconBg: 'bg-red-50',
      iconBorder: 'border-red-200',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      iconBg: 'bg-amber-50',
      iconBorder: 'border-amber-200',
      icon: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
    success: {
      iconBg: 'bg-emerald-50',
      iconBorder: 'border-emerald-200',
      icon: 'text-emerald-600',
      button: 'bg-emerald-600 hover:bg-emerald-700',
    },
    info: {
      iconBg: 'bg-blue-50',
      iconBorder: 'border-blue-200',
      icon: 'text-blue-600',
      button: 'bg-brand-600 hover:bg-brand-700',
    },
  }[tone]

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
      />
      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 text-center">
          <div
            className={`w-14 h-14 rounded-full ${toneMap.iconBg} border ${toneMap.iconBorder} grid place-items-center mx-auto`}
          >
            <HelpCircle size={26} className={toneMap.icon} />
          </div>
          <h3 className="font-semibold text-slate-900 mt-3">{title}</h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed whitespace-pre-line">
            {message}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2.5 rounded-lg text-white text-sm font-semibold ${toneMap.button} disabled:opacity-50 inline-flex items-center justify-center gap-2`}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================================================================
// DateFilterBar
// ==================================================================
function DateFilterBar({
  filter,
  onChange,
}: {
  filter: DateFilter
  onChange: (f: DateFilter) => void
}) {
  const modeLabel: Record<FilterMode, string> = {
    zote: 'Zote',
    mwaka: `Mwaka ${filter.mwaka}`,
    mwezi: `Mwezi ${filter.mwezi}/${filter.mwaka}`,
    wiki: `Wiki ${filter.wiki} (${filter.mwaka})`,
    siku: filter.siku,
  }
  const miaka = Array.from({ length: 5 }, (_, i) => getMwakaWaSasa() - i)
  const miezi = [
    'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
    'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba',
  ]
  const wiki = Array.from({ length: 52 }, (_, i) => i + 1)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 mr-1">
            Kipindi:
          </span>
        </div>
        <button
          onClick={() => onChange({ ...filter, mode: 'zote' })}
          className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
            filter.mode === 'zote'
              ? 'bg-brand-600 text-white border-brand-600 font-semibold'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          Zote
        </button>
        <button
          onClick={() =>
            onChange({ ...filter, mode: 'mwaka', mwaka: filter.mwaka })
          }
          className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
            filter.mode === 'mwaka'
              ? 'bg-brand-600 text-white border-brand-600 font-semibold'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          Mwaka
        </button>
        <button
          onClick={() =>
            onChange({ ...filter, mode: 'mwezi', mwezi: filter.mwezi })
          }
          className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
            filter.mode === 'mwezi'
              ? 'bg-brand-600 text-white border-brand-600 font-semibold'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          Mwezi
        </button>
        <button
          onClick={() =>
            onChange({ ...filter, mode: 'wiki', wiki: filter.wiki })
          }
          className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
            filter.mode === 'wiki'
              ? 'bg-brand-600 text-white border-brand-600 font-semibold'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          Wiki
        </button>
        <button
          onClick={() =>
            onChange({ ...filter, mode: 'siku', siku: filter.siku })
          }
          className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
            filter.mode === 'siku'
              ? 'bg-brand-600 text-white border-brand-600 font-semibold'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          Siku
        </button>
        <div className="ml-auto text-xs text-slate-500 flex items-center gap-1">
          <Calendar size={12} />
          {modeLabel[filter.mode]}
        </div>
      </div>

      {filter.mode !== 'zote' && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center">
          <select
            value={filter.mwaka}
            onChange={(e) =>
              onChange({ ...filter, mwaka: Number(e.target.value) })
            }
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-brand-500 outline-none"
          >
            {miaka.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {filter.mode === 'mwezi' && (
            <select
              value={filter.mwezi}
              onChange={(e) =>
                onChange({ ...filter, mwezi: Number(e.target.value) })
              }
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-brand-500 outline-none"
            >
              {miezi.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}
          {filter.mode === 'wiki' && (
            <select
              value={filter.wiki}
              onChange={(e) =>
                onChange({ ...filter, wiki: Number(e.target.value) })
              }
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-brand-500 outline-none"
            >
              {wiki.map((w) => (
                <option key={w} value={w}>
                  Wiki {w}
                </option>
              ))}
            </select>
          )}
          {filter.mode === 'siku' && (
            <input
              type="date"
              value={filter.siku}
              onChange={(e) =>
                onChange({ ...filter, siku: e.target.value })
              }
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-brand-500 outline-none"
            />
          )}
        </div>
      )}
    </div>
  )
}

// ==================================================================
// Page
// ==================================================================
export default function MuuzajiRipoti() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('mauzo')

  const storeId = user?.store_id || undefined
  const userId = user?.id || undefined

  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [documents, setDocuments] = useState<DocumentMeta[]>([])
  const [store, setStore] = useState<StoreType | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filter, setFilter] = useState<DateFilter>({
    mode: 'mwezi',
    mwaka: getMwakaWaSasa(),
    mwezi: getMweziWaSasa(),
    wiki: getWikiYaSasa(),
    siku: getSikuYaSasa(),
  })

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    if (!storeId) {
      setError('Hujapangiwa duka. Wasiliana na mmiliki.')
      setLoading(false)
      return
    }

    if (
      user?.role !== 'muuzaji' &&
      user?.role !== 'mmiliki' &&
      user?.role !== 'admin'
    ) {
      setError('Huna ruhusa ya kuona ripoti za duka.')
      setLoading(false)
      return
    }

    try {
      const results = await Promise.allSettled([
        ordersApi.list({ store: storeId }),
        productsApi.list(storeId),
        customersApi.list({ store: storeId }),
        inventoryApi.stockLevels({ store: storeId }),
        documentsApi.list({ store: storeId }),
        storesApi.get(storeId),
      ])

      setOrders(
        results[0].status === 'fulfilled' ? results[0].value : []
      )
      setProducts(
        results[1].status === 'fulfilled' ? results[1].value : []
      )
      setCustomers(
        results[2].status === 'fulfilled' ? results[2].value : []
      )
      setStockLevels(
        results[3].status === 'fulfilled' ? results[3].value : []
      )
      setDocuments(
        results[4].status === 'fulfilled' ? results[4].value : []
      )
      setStore(
        results[5].status === 'fulfilled' ? results[5].value : null
      )

      if (results[0].status === 'rejected') {
        const reason: any = results[0].reason
        setError(
          reason?.response?.data?.detail ||
            'Imeshindikana kupata ripoti. Angalia muunganisho.'
        )
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata ripoti. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }, [storeId, user?.role])

  useEffect(() => {
    load()
  }, [load])

  // ------------------------------------------------------------------
  // Filtered
  // ------------------------------------------------------------------
  const myOrders = useMemo(() => {
    if (!storeId) return []
    return orders
      .filter((o) => !o.store || o.store === storeId)
      .filter((o) => ikoNdaniYaFilter(o.order_date, filter))
  }, [orders, storeId, filter])

  const myDocuments = useMemo(() => {
    if (!storeId) return []
    return documents
      .filter((d) => !d.store || d.store === storeId)
      .filter((d) => ikoNdaniYaFilter(d.created_at, filter))
  }, [documents, storeId, filter])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 size={26} className="text-brand-600" /> Ripoti za Duka
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              <Lock size={10} /> Duka Lako
            </span>
          </h1>
          <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <User size={12} /> {user?.full_name || 'Muuzaji'}
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
                <AlertTriangle size={14} /> Hujapangiwa duka
              </span>
            )}
          </div>
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

      <DateFilterBar filter={filter} onChange={setFilter} />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border whitespace-nowrap transition ${
              tab === t.key
                ? 'bg-brand-600 text-white border-brand-600 font-semibold'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <t.Icon size={14} />
            {t.label}
            {t.key === 'documents' && myDocuments.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  tab === t.key ? 'bg-white/20' : 'bg-slate-100'
                }`}
              >
                {myDocuments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={load} className="text-xs font-semibold underline">
            Jaribu tena
          </button>
        </div>
      )}

      {tab === 'mauzo' && (
        <RipotiMauzoTab orders={myOrders} loading={loading} />
      )}
      {tab === 'stoki' && (
        <RipotiStokiTab
          products={products}
          stockLevels={stockLevels}
          loading={loading}
        />
      )}
      {tab === 'wateja' && (
        <RipotiWatejaTab
          customers={customers}
          orders={myOrders}
          loading={loading}
        />
      )}
      {tab === 'documents' && (
        <DocumentsTab
          storeId={storeId}
          userId={userId}
          documents={myDocuments}
          setDocuments={setDocuments}
          loading={loading}
        />
      )}
    </div>
  )
}

// ==================================================================
// RipotiMauzoTab
// ==================================================================
function RipotiMauzoTab({
  orders,
  loading,
}: {
  orders: Order[]
  loading: boolean
}) {
  const ripotiKwaTarehe = useMemo(() => {
    const map = new Map<
      string,
      { tarehe: string; mauzo: number; faida: number; orders: number }
    >()
    for (const o of orders) {
      const tarehe = o.order_date?.slice(0, 10) || '—'
      const jumla = parseFloat(o.total || '0')
      const cogs = (o.items || []).reduce(
        (s, it) =>
          s + parseFloat(it.unit_cost || '0') * parseFloat(it.quantity || '0'),
        0
      )
      const faida = jumla - cogs
      const ex = map.get(tarehe)
      if (ex) {
        ex.mauzo += jumla
        ex.faida += faida
        ex.orders += 1
      } else {
        map.set(tarehe, { tarehe, mauzo: jumla, faida, orders: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.tarehe < b.tarehe ? -1 : 1
    )
  }, [orders])

  const jumla = useMemo(
    () =>
      ripotiKwaTarehe.reduce(
        (a, r) => ({
          mauzo: a.mauzo + r.mauzo,
          faida: a.faida + r.faida,
          orders: a.orders + r.orders,
        }),
        { mauzo: 0, faida: 0, orders: 0 }
      ),
    [ripotiKwaTarehe]
  )

  const downloadCsv = () => {
    const rows = [
      ['Tarehe', 'Mauzo', 'Faida', 'Orders'],
      ...ripotiKwaTarehe.map((r) => [r.tarehe, r.mauzo, r.faida, r.orders]),
      ['JUMLA', jumla.mauzo, jumla.faida, jumla.orders],
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ripoti-mauzo-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat
              label="Mauzo Yote"
              value={formatTsh(jumla.mauzo)}
              Icon={TrendingUp}
              tone="text-blue-600"
            />
            <Stat
              label="Faida Ghafi"
              value={formatTsh(jumla.faida)}
              Icon={CheckCircle2}
              tone="text-emerald-600"
            />
            <Stat
              label="Orders"
              value={String(jumla.orders)}
              Icon={Package}
              tone="text-blue-600"
            />
            <Stat
              label="Wastani/Order"
              value={formatTsh(
                jumla.orders ? Math.round(jumla.mauzo / jumla.orders) : 0
              )}
              Icon={BarChart3}
              tone="text-amber-600"
            />
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-600" /> Mauzo kwa Siku
          </h3>
        </div>
        <div className="w-full h-64">
          {loading ? (
            <div className="h-full grid place-items-center">
              <Loader2 size={32} className="animate-spin text-brand-500" />
            </div>
          ) : ripotiKwaTarehe.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-slate-500">
              Hakuna mauzo kwa kipindi hiki
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ripotiKwaTarehe}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tarehe" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v) => formatTsh(Number(v ?? 0))} />
                <Line
                  type="monotone"
                  dataKey="mauzo"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Mauzo"
                />
                <Line
                  type="monotone"
                  dataKey="faida"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Faida"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText size={16} className="text-brand-600" /> Jedwali la Mauzo
          </h3>
          <button
            onClick={downloadCsv}
            disabled={loading || ripotiKwaTarehe.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium disabled:opacity-50"
          >
            <Download size={12} /> Pakua CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={4} />
              ))}
            </div>
          ) : ripotiKwaTarehe.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Hakuna mauzo kwa kipindi hiki
            </div>
          ) : (
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3 font-medium">Tarehe</th>
                  <th className="p-3 text-right font-medium">Mauzo</th>
                  <th className="p-3 text-right font-medium">Faida</th>
                  <th className="p-3 text-right font-medium">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ripotiKwaTarehe.map((r) => (
                  <tr key={r.tarehe} className="hover:bg-slate-50/50">
                    <td className="p-3">{formatDate(r.tarehe)}</td>
                    <td className="p-3 text-right">
                      {r.mauzo.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-emerald-600 font-medium">
                      {r.faida.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">{r.orders}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td className="p-3 font-bold">JUMLA</td>
                  <td className="p-3 text-right font-bold">
                    {jumla.mauzo.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-700">
                    {jumla.faida.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-bold">{jumla.orders}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================================================================
// RipotiStokiTab
// ==================================================================
function RipotiStokiTab({
  products,
  stockLevels,
  loading,
}: {
  products: Product[]
  stockLevels: StockLevel[]
  loading: boolean
}) {
  const ripotiStoki = useMemo(() => {
    return products.map((b) => {
      const level = stockLevels.find((s) => s.product === b.id)
      const stoki = level ? parseFloat(level.quantity) : 0
      const kiwangoChini = b.low_stock_alert || 5
      const hali: 'sawa' | 'inaribia' | 'imeisha' =
        stoki <= 0 ? 'imeisha' : stoki <= kiwangoChini ? 'inaribia' : 'sawa'
      return {
        id: b.id,
        bidhaa: b.name,
        sku: b.sku,
        stoki,
        kiwangoChini,
        hali,
      }
    })
  }, [products, stockLevels])

  const jumlaImeisha = ripotiStoki.filter((r) => r.hali === 'imeisha').length
  const jumlaInaribia = ripotiStoki.filter((r) => r.hali === 'inaribia').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat
              label="Bidhaa Zote"
              value={String(ripotiStoki.length)}
              Icon={Package}
              tone="text-blue-600"
            />
            <Stat
              label="Zimeisha"
              value={String(jumlaImeisha)}
              Icon={AlertTriangle}
              tone="text-red-600"
            />
            <Stat
              label="Zinaribia"
              value={String(jumlaInaribia)}
              Icon={Clock}
              tone="text-amber-600"
            />
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold flex items-center gap-2">
            <Package size={16} className="text-brand-600" /> Jedwali la Stoki
          </h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={4} />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3 font-medium">Bidhaa</th>
                  <th className="p-3 text-right font-medium">Stoki</th>
                  <th className="p-3 text-right font-medium">
                    Kiwango Chini
                  </th>
                  <th className="p-3 text-right font-medium">Hali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ripotiStoki.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-sm text-slate-500"
                    >
                      Hakuna bidhaa bado kwenye duka lako
                    </td>
                  </tr>
                ) : (
                  ripotiStoki.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center text-slate-600 shrink-0">
                            <Package size={14} />
                          </div>
                          <div>
                            <div className="font-medium">{r.bidhaa}</div>
                            <div className="text-xs text-slate-500">
                              {r.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {r.stoki}
                      </td>
                      <td className="p-3 text-right text-slate-500">
                        {r.kiwangoChini}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                            r.hali === 'sawa'
                              ? 'bg-emerald-50 text-emerald-700'
                              : r.hali === 'inaribia'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {r.hali === 'sawa' && <CheckCircle2 size={12} />}
                          {(r.hali === 'inaribia' ||
                            r.hali === 'imeisha') && (
                            <AlertTriangle size={12} />
                          )}
                          {r.hali}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================================================================
// RipotiWatejaTab
// ==================================================================
function RipotiWatejaTab({
  customers,
  orders,
  loading,
}: {
  customers: Customer[]
  orders: Order[]
  loading: boolean
}) {
  const ripotiWateja = useMemo(() => {
    return customers.map((m) => {
      const ordersZake = orders.filter((o) => o.customer === m.id)
      const jumlaManunuzi = ordersZake.reduce(
        (s, o) => s + parseFloat(o.total || '0'),
        0
      )
      const deni = ordersZake.reduce((s, o) => {
        const confirmed = (o.payments || [])
          .filter((p) => p.status === 'imethibitishwa')
          .reduce((a, p) => a + parseFloat(p.amount || '0'), 0)
        return s + Math.max(parseFloat(o.total || '0') - confirmed, 0)
      }, 0)
      const mwisho = ordersZake[0]?.order_date
        ? formatDate(ordersZake[0].order_date)
        : '—'
      return {
        id: m.id,
        mteja: m.full_name,
        simu: m.phone,
        manunuzi: jumlaManunuzi,
        deni,
        mwishoKununua: mwisho,
      }
    })
  }, [customers, orders])

  const jumlaDeni = ripotiWateja.reduce((s, w) => s + w.deni, 0)
  const jumlaManunuzi = ripotiWateja.reduce((s, w) => s + w.manunuzi, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat
              label="Wateja"
              value={String(ripotiWateja.length)}
              Icon={Users}
              tone="text-blue-600"
            />
            <Stat
              label="Jumla ya Madeni"
              value={formatTsh(jumlaDeni)}
              Icon={Wallet}
              tone="text-red-600"
            />
            <Stat
              label="Jumla ya Manunuzi"
              value={formatTsh(jumlaManunuzi)}
              Icon={TrendingUp}
              tone="text-emerald-600"
            />
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold flex items-center gap-2">
            <Users size={16} className="text-brand-600" /> Jedwali la Wateja
          </h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={4} />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3 font-medium">Mteja</th>
                  <th className="p-3 text-right font-medium">Manunuzi</th>
                  <th className="p-3 text-right font-medium">Deni</th>
                  <th className="p-3 font-medium">Mwisho Kununua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ripotiWateja.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-sm text-slate-500"
                    >
                      Hakuna wateja bado kwenye duka lako
                    </td>
                  </tr>
                ) : (
                  ripotiWateja.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-medium">{w.mteja}</div>
                        <div className="text-xs text-slate-500">{w.simu}</div>
                      </td>
                      <td className="p-3 text-right">
                        {w.manunuzi.toLocaleString()}
                      </td>
                      <td
                        className={`p-3 text-right font-semibold ${
                          w.deni > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {w.deni.toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-500">
                        {w.mwishoKununua}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================================================================
// DocumentsTab
// ==================================================================
function DocumentsTab({
  storeId,
  documents,
  setDocuments,
  loading,
}: {
  storeId?: string
  userId?: string
  documents: DocumentMeta[]
  setDocuments: React.Dispatch<React.SetStateAction<DocumentMeta[]>>
  loading: boolean
}) {
  const [q, setQ] = useState('')
  const [filterAina, setFilterAina] = useState<AinaDocument | 'zote'>('zote')
  const [selected, setSelected] = useState<DocumentMeta | null>(null)
  const [zalisha, setZalisha] = useState(false)
  const [generating, setGenerating] = useState<AinaDocument | null>(null)
  const [localLoading, setLocalLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<DocumentMeta | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    return documents.filter((d) => {
      if (filterAina !== 'zote' && d.aina !== filterAina) return false
      if (!query) return true
      return (
        d.jina.toLowerCase().includes(query) ||
        d.id.toLowerCase().includes(query) ||
        (d.store_name || '').toLowerCase().includes(query)
      )
    })
  }, [documents, q, filterAina])

  const stats = useMemo(
    () => ({
      zote: documents.length,
      tayari: documents.filter((d) => d.hali === 'tayari').length,
      inasindika: documents.filter((d) => d.hali === 'inasindika').length,
    }),
    [documents]
  )

  const refresh = async () => {
    if (!storeId) return
    setLocalLoading(true)
    try {
      const docs = await documentsApi.list({ store: storeId })
      setDocuments(docs)
    } catch (err: any) {
      setToast({
        msg:
          err?.response?.data?.detail || 'Imeshindikana kupata documents.',
        ok: false,
      })
    } finally {
      setLocalLoading(false)
    }
  }

  const handleZalisha = async (aina: AinaDocument) => {
    if (!storeId) {
      setToast({ msg: 'Hujapangiwa duka.', ok: false })
      return
    }
    setGenerating(aina)
    try {
      const doc = await documentsApi.generate({
        aina,
        format: 'pdf',
        store_id: storeId,
      })
      setDocuments((prev) => [doc, ...prev])
      setZalisha(false)
      setSelected(doc)
      setToast({ msg: 'Ripoti imezalishwa.', ok: true })
    } catch (err: any) {
      setToast({
        msg:
          err?.response?.data?.detail ||
          err?.response?.data?.aina?.[0] ||
          'Imeshindikana kuzalisha ripoti.',
        ok: false,
      })
    } finally {
      setGenerating(null)
    }
  }

  const handleFuta = async () => {
    if (!confirmDelete || !storeId) return

    // ✅ d.store (sio d.store_id)
    if (confirmDelete.store && confirmDelete.store !== storeId) {
      setToast({ msg: 'Document si ya duka lako.', ok: false })
      setConfirmDelete(null)
      return
    }

    setDeleting(true)
    try {
      await documentsApi.remove(confirmDelete.id)
      setDocuments((prev) => prev.filter((d) => d.id !== confirmDelete.id))
      setToast({ msg: 'Document imefutwa.', ok: true })
      setConfirmDelete(null)
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.detail || 'Imeshindikana kufuta.',
        ok: false,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat
          label="Documents Zote"
          value={String(stats.zote)}
          Icon={FileText}
          tone="text-blue-600"
        />
        <Stat
          label="Tayari"
          value={String(stats.tayari)}
          Icon={CheckCircle2}
          tone="text-emerald-600"
        />
        <Stat
          label="Zinasindika"
          value={String(stats.inasindika)}
          Icon={Clock}
          tone="text-amber-600"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setZalisha(true)}
          disabled={loading || !storeId}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
        >
          <Plus size={16} /> Zalisha Ripoti
        </button>
        <button
          onClick={refresh}
          disabled={localLoading || !storeId}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={localLoading ? 'animate-spin' : ''}
          />
          Sasisha
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta kwa jina, ID, au duka..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterAina('zote')}
            className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
              filterAina === 'zote'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            Zote
          </button>
          {(Object.keys(AINA_DOC_META) as AinaDocument[]).map((a) => {
            const meta = AINA_DOC_META[a]
            return (
              <button
                key={a}
                onClick={() => setFilterAina(a)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition ${
                  filterAina === a
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <meta.Icon size={10} />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-lg bg-slate-200 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <SkeletonLine className="h-4 w-48" />
                <SkeletonLine className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">
            {q || filterAina !== 'zote'
              ? 'Hakuna matokeo'
              : 'Hakuna documents kwenye duka lako'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {q || filterAina !== 'zote'
              ? 'Badilisha kichujio au utafutaji.'
              : 'Bofya "Zalisha Ripoti" kuanza.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((d) => {
            const aina = AINA_DOC_META[d.aina]
            const format = FORMAT_META[d.format]
            const hali = HALI_DOC_META[d.hali]
            return (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${format.tone}`}
                  >
                    <format.Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setSelected(d)}
                      className="text-sm font-semibold text-left truncate hover:text-brand-600 w-full"
                    >
                      {d.jina}
                    </button>
                    <div className="flex items-center gap-2 flex-wrap mt-1 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 ${aina.tone}`}
                      >
                        <aina.Icon size={10} />
                        {aina.label}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="uppercase font-semibold text-slate-600">
                        {d.format}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500">{d.ukubwa}</span>
                      <span className="text-slate-300">|</span>
                      <span
                        className={`inline-flex items-center gap-1 ${hali.tone}`}
                      >
                        <hali.Icon size={10} />
                        {hali.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatDate(d.created_at)} — {d.kipindi || '—'}
                      {d.aliyezalisha_name
                        ? ` — ${d.aliyezalisha_name}`
                        : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setSelected(d)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                      title="Ona"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(d)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                      title="Futa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <DocumentDetailModal
          doc={selected}
          storeId={storeId}
          onClose={() => setSelected(null)}
        />
      )}

      {zalisha && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !generating && setZalisha(false)}
          />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <div className="font-semibold">Zalisha Ripoti Mpya</div>
                <div className="text-xs text-slate-500">
                  Data itahesabiwa kutoka duka lako
                </div>
              </div>
              <button
                onClick={() => setZalisha(false)}
                disabled={!!generating}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {(Object.keys(AINA_DOC_META) as AinaDocument[]).map((a) => {
                const meta = AINA_DOC_META[a]
                const isGenerating = generating === a
                return (
                  <button
                    key={a}
                    onClick={() => handleZalisha(a)}
                    disabled={!!generating}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 ${meta.tone}`}
                    >
                      {isGenerating ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <meta.Icon size={16} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{meta.label}</div>
                      <div className="text-xs text-slate-500">
                        {isGenerating
                          ? 'Inahesabu...'
                          : `Tengeneza ripoti ya ${meta.label.toLowerCase()}`}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Futa Document?"
        message={`Una uhakika unataka kufuta "${confirmDelete?.jina}"?\nHatua hii haiwezi kutenduliwa.`}
        tone="danger"
        confirmLabel="Ndiyo, Futa"
        cancelLabel="Ghairi"
        loading={deleting}
        onConfirm={handleFuta}
        onCancel={() => !deleting && setConfirmDelete(null)}
      />

      {toast && (
        <Toast
          message={toast.msg}
          ok={toast.ok}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// ==================================================================
// DocumentDetailModal
// ==================================================================
function DocumentDetailModal({
  doc,
  storeId,
  onClose,
}: {
  doc: DocumentMeta
  storeId?: string
  onClose: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const aina = AINA_DOC_META[doc.aina]
  const format = FORMAT_META[doc.format]
  const hali = HALI_DOC_META[doc.hali]
  const data = doc.data_snapshot || {}

  // ✅ doc.store (sio doc.store_id)
  const isOwned = !doc.store || doc.store === storeId

  const handleDownload = async () => {
    if (!isOwned) {
      setToast({ msg: 'Document si ya duka lako.', ok: false })
      return
    }
    setDownloading(true)
    setDownloadError('')
    try {
      const blob =
        doc.format === 'csv'
          ? await documentsApi.downloadCsv(doc.id)
          : await documentsApi.downloadPdf(doc.id)
      if (!blob || blob.size === 0) throw new Error('Faili ni tupu')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.aina}-${doc.id}.${doc.format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setToast({ msg: 'Faili imepakuliwa.', ok: true })
    } catch (err: any) {
      let msg = 'Imeshindikana kupakua faili.'
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const parsed = JSON.parse(text)
          msg = parsed.detail || msg
        } catch {}
      } else if (err?.response?.data?.detail) {
        msg = err.response.data.detail
      } else if (err?.message) {
        msg = err.message
      }
      setDownloadError(msg)
      setToast({ msg, ok: false })
    } finally {
      setDownloading(false)
    }
  }

  const renderData = () => {
    if (doc.aina === 'mauzo') {
      return (
        <div className="space-y-1.5">
          <Row label="Mauzo" value={formatTsh(data.mauzo || 0)} />
          <Row label="COGS" value={formatTsh(data.cogs || 0)} tone="text-amber-700" />
          <Row label="Faida" value={formatTsh(data.faida || 0)} tone="text-emerald-700" bold />
          <Row label="Orders" value={String(data.orders || 0)} />
          <Row label="Wastani/Order" value={formatTsh(data.wastani_kwa_order || 0)} />
        </div>
      )
    }
    if (doc.aina === 'stoki') {
      return (
        <div className="space-y-1.5">
          <Row label="Bidhaa Zote" value={String(data.bidhaa_zote || 0)} />
          <Row label="Stoki Jumla" value={`${(data.stoki_jumla || 0).toLocaleString()} pcs`} />
          <Row label="Zimeisha" value={String(data.zimeisha || 0)} tone="text-red-600" />
          <Row label="Zinaribia" value={String(data.zinaribia || 0)} tone="text-amber-600" />
          <Row label="Thamani" value={formatTsh(data.thamani || 0)} bold />
        </div>
      )
    }
    if (doc.aina === 'wateja') {
      return (
        <div className="space-y-1.5">
          <Row label="Wateja Wote" value={String(data.wateja_wote || 0)} />
          <Row label="Manunuzi Jumla" value={formatTsh(data.manunuzi_jumla || 0)} tone="text-emerald-700" />
          <Row label="Deni Jumla" value={formatTsh(data.deni_jumla || 0)} tone="text-red-600" bold />
        </div>
      )
    }
    if (doc.aina === 'madeni') {
      return (
        <div className="space-y-1.5">
          <Row label="Orders za Deni" value={String(data.orders_deni || 0)} />
          <Row label="Deni Jumla" value={formatTsh(data.deni_jumla || 0)} tone="text-red-600" bold />
        </div>
      )
    }
    if (doc.aina === 'gharama') {
      return (
        <div className="space-y-1.5">
          <Row label="Opex" value={formatTsh(data.opex || 0)} tone="text-orange-700" />
          <Row label="Mishahara" value={formatTsh(data.mishahara || 0)} tone="text-purple-700" />
          <Row label="Gharama Zote" value={formatTsh(data.gharama_jumla || 0)} tone="text-red-600" bold />
        </div>
      )
    }
    return (
      <div className="space-y-1.5">
        <Row label="Mauzo" value={formatTsh(data.mauzo?.mauzo || 0)} />
        <Row label="COGS" value={formatTsh(data.mauzo?.cogs || 0)} tone="text-amber-700" />
        <Row label="Gharama" value={formatTsh(data.gharama?.gharama_jumla || 0)} tone="text-red-600" />
        <Row label="Faida Safi" value={formatTsh(data.faida_safi || 0)} tone="text-emerald-700" bold />
        <div className="pt-2 mt-2 border-t border-slate-200" />
        <Row label="Zaka (10%)" value={formatTsh(data.zaka || 0)} />
        <Row label="Sadaka (10%)" value={formatTsh(data.sadaka || 0)} />
        <Row label="Inayobaki" value={formatTsh(data.inayobaki || 0)} tone="text-emerald-700" bold />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <div>
            <div className="font-semibold">{doc.id.slice(0, 8)}</div>
            <div className="text-xs text-slate-500">{formatDate(doc.created_at)}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-semibold ${format.tone}`}>
              <format.Icon size={12} />
              {doc.format.toUpperCase()}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${hali.tone}`}>
              <hali.Icon size={12} />
              {hali.label}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${aina.tone}`}>
              <aina.Icon size={12} />
              {aina.label}
            </span>
          </div>

          <div>
            <div className="text-xs text-slate-500">Jina la Document</div>
            <div className="font-semibold">{doc.jina}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500">Ukubwa</div>
              <div className="font-semibold">{doc.ukubwa}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Format</div>
              <div className="font-semibold uppercase">{doc.format}</div>
            </div>
          </div>

          {doc.kipindi && (
            <div>
              <div className="text-xs text-slate-500">Kipindi</div>
              <div className="font-medium">{doc.kipindi}</div>
            </div>
          )}

          {doc.store_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Store size={12} /> {doc.store_name}
            </div>
          )}
          {doc.aliyezalisha_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Users size={12} /> {doc.aliyezalisha_name}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Data ya Ripoti
            </div>
            {renderData()}
          </div>

          {downloadError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1">{downloadError}</div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button
              onClick={handleDownload}
              disabled={downloading || doc.hali !== 'tayari' || !isOwned}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowDownToLine size={14} />
              )}
              {downloading ? 'Inapakua...' : 'Pakua'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200"
            >
              Funga
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.msg}
          ok={toast.ok}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// ==================================================================
// Stat + Row + Skeletons
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

function Row({
  label,
  value,
  tone,
  bold,
}: {
  label: string
  value: string
  tone?: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span
        className={`${bold ? 'font-bold' : 'font-semibold'} ${
          tone ?? 'text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
      <SkeletonLine className="h-3 w-20 mt-3" />
      <SkeletonLine className="h-5 w-24 mt-2" />
    </div>
  )
}

function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div
      className="grid gap-2 items-center"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}