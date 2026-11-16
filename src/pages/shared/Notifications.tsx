import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Search, Filter, CheckCheck, Trash2, ArrowRight,
  Inbox, RefreshCw, AlertTriangle, Mail, MessageSquare,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react'
import {
  notificationsApi,
  type NotificationLog,
  type NotificationChannel,
} from '../../services/notifications'
import { formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta kwa channel
// ==================================================================
const CHANNEL_META: Record<
  NotificationChannel,
  { color: string; Icon: React.ElementType; label: string }
> = {
  sms: {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: MessageSquare,
    label: 'SMS',
  },
  email: {
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    Icon: Mail,
    label: 'Email',
  },
}

type FilterKey = NotificationChannel | 'zote'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'zote', label: 'Zote' },
  { key: 'sms', label: 'SMS' },
  { key: 'email', label: 'Email' },
]

// ==================================================================
// Page
// ==================================================================
export default function Notifications() {
  const navigate = useNavigate()

  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterKey>('zote')
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await notificationsApi.logs({ limit: 200 })
      setLogs(data)
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
    load()
  }, [])

  // ------------------------------------------------------------------
  // Unread count
  // ------------------------------------------------------------------
  const unreadCount = useMemo(
    () => logs.filter((n) => !n.read).length,
    [logs]
  )

  // ------------------------------------------------------------------
  // Filter + search
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    let list = logs

    // Filter kwa channel
    if (filter !== 'zote') {
      list = list.filter((n) => n.channel === filter)
    }

    // Filter unread
    if (showOnlyUnread) {
      list = list.filter((n) => !n.read)
    }

    // Search
    const query = q.toLowerCase().trim()
    if (query) {
      list = list.filter(
        (n) =>
          n.id.toLowerCase().includes(query) ||
          (n.subject || '').toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          n.recipient.toLowerCase().includes(query)
      )
    }

    return list
  }, [logs, filter, showOnlyUnread, q])

  // ------------------------------------------------------------------
  // Mark as read
  // ------------------------------------------------------------------
  const handleMarkRead = async (id: string) => {
    setProcessing(id)
    try {
      const updated = await notificationsApi.markAsRead(id)
      setLogs((prev) => prev.map((n) => (n.id === id ? updated : n)))
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Imeshindikana kuweka kama imesomwa.'
      )
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Mark all read
  // ------------------------------------------------------------------
  const handleMarkAllRead = async () => {
    const unread = logs.filter((n) => !n.read)
    if (unread.length === 0) return

    setProcessing('all')
    try {
      await notificationsApi.markAllRead(unread.map((n) => n.id))
      setLogs((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Imeshindikana kuweka zote kama zimesomwa.'
      )
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Futa moja
  // ------------------------------------------------------------------
  const handleFuta = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta taarifa hii?')) return
    setProcessing(id)
    try {
      await notificationsApi.remove(id)
      setLogs((prev) => prev.filter((n) => n.id !== id))
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Imeshindikana kufuta.')
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Futa zote
  // ------------------------------------------------------------------
  const handleFutaZote = async () => {
    if (logs.length === 0) return
    if (
      !confirm(
        `Una uhakika unataka kufuta taarifa zote ${logs.length}? Hii haiwezi kutenduliwa.`
      )
    )
      return

    setProcessing('all-delete')
    try {
      await notificationsApi.removeMany(logs.map((n) => n.id))
      setLogs([])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Imeshindikana kufuta zote.')
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Click — mark read + navigate
  // ------------------------------------------------------------------
  const handleClick = async (n: NotificationLog) => {
    if (!n.read) {
      try {
        await notificationsApi.markAsRead(n.id)
        setLogs((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        )
      } catch {
        // endelea
      }
    }
    navigate(`/notifications/${n.id}`)
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bell size={24} className="text-brand-600" />
            Taarifa
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {logs.length} taarifa — {unreadCount} hazijasomwa
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Sasisha
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={processing === 'all'}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm font-semibold hover:bg-brand-100 disabled:opacity-50"
            >
              {processing === 'all' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCheck size={14} />
              )}
              Soma Zote
            </button>
          )}
          {logs.length > 0 && (
            <button
              onClick={handleFutaZote}
              disabled={processing === 'all-delete'}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
            >
              {processing === 'all-delete' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Futa Zote
            </button>
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta kwa subject, ujumbe, au mpokeaji..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={14} className="text-slate-400" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                filter === f.key
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setShowOnlyUnread((v) => !v)}
            className={`ml-auto px-3 py-1.5 rounded-lg text-sm border transition ${
              showOnlyUnread
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            Hazijasomwa ({unreadCount})
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <LogSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Inbox size={40} className="mx-auto mb-3 text-slate-300" />
          <div className="font-semibold">
            {logs.length === 0
              ? 'Hakuna taarifa'
              : 'Hakuna taarifa inayolingana'}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {logs.length === 0
              ? 'Ukipata taarifa mpya, zitaonekana hapa.'
              : 'Badilisha kichujio au utafutaji.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = CHANNEL_META[n.channel] || CHANNEL_META.sms
            const isProcessing = processing === n.id
            return (
              <div
                key={n.id}
                className={`bg-white rounded-xl border p-4 transition ${
                  !n.read
                    ? 'border-brand-200 bg-brand-50/30'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 border ${meta.color}`}
                  >
                    <meta.Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleClick(n)}
                        className="font-semibold text-sm text-left hover:text-brand-600"
                      >
                        {n.subject || 'Taarifa'}
                      </button>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                      )}
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {meta.label}
                      </span>
                      {n.success ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          <CheckCircle2 size={9} />
                          Imefanikiwa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                          <XCircle size={9} />
                          Imeshindwa
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Kwa: {n.recipient}
                    </div>
                    <div className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {n.message}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatDate(n.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        disabled={isProcessing}
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        title="Weka kama imesomwa"
                      >
                        {isProcessing ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCheck size={16} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleClick(n)}
                      className="p-2 rounded-lg text-brand-600 hover:bg-brand-50"
                      title="Fungua"
                    >
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={() => handleFuta(n.id)}
                      disabled={isProcessing}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                      title="Futa"
                    >
                      {isProcessing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ==================================================================
// Skeleton
// ==================================================================
function LogSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-4 w-1/3" />
          <SkeletonLine className="h-3 w-1/2" />
          <SkeletonLine className="h-3 w-full" />
          <SkeletonLine className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  )
}