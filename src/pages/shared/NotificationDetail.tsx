import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCheck, Trash2, Inbox,
  Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Mail, MessageSquare,
} from 'lucide-react'
import {
  notificationsApi,
  type NotificationLog,
  type NotificationChannel,
} from '../../services/notifications'
import { formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// Meta kwa channel (sms/email)
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

// ==================================================================
// Page
// ==================================================================
export default function NotificationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [notif, setNotif] = useState<NotificationLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<'read' | 'delete' | null>(null)

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------
  const load = async () => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await notificationsApi.get(id)
      setNotif(data)
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotif(null)
      } else {
        setError(
          err?.response?.data?.detail ||
            'Imeshindikana kupata taarifa. Angalia muunganisho.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ------------------------------------------------------------------
  // Mark as read
  // ------------------------------------------------------------------
  const handleMarkRead = async () => {
    if (!notif) return
    setProcessing('read')
    try {
      const updated = await notificationsApi.markAsRead(notif.id)
      setNotif(updated)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Imeshindikana kuweka kama imesomwa.'
      )
    } finally {
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Futa
  // ------------------------------------------------------------------
  const handleFuta = async () => {
    if (!notif) return
    if (!confirm('Una uhakika unataka kufuta taarifa hii?')) return
    setProcessing('delete')
    try {
      await notificationsApi.remove(notif.id)
      navigate('/notifications', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Imeshindikana kufuta.')
      setProcessing(null)
    }
  }

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600"
        >
          <ArrowLeft size={16} /> Rudi
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-4 w-24" />
              <SkeletonLine className="h-6 w-3/4 mt-2" />
              <SkeletonLine className="h-3 w-32" />
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-slate-200 space-y-2">
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-5/6" />
            <SkeletonLine className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Error
  // ------------------------------------------------------------------
  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-10 text-center">
        <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
        <div className="font-semibold">Hitilafu</div>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
        <div className="mt-4 flex gap-2 justify-center">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700"
          >
            <RefreshCw size={16} /> Jaribu tena
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200"
          >
            <ArrowLeft size={16} /> Rudi
          </button>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Not found
  // ------------------------------------------------------------------
  if (!notif) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-10 text-center">
        <Inbox size={40} className="mx-auto mb-3 text-slate-300" />
        <div className="font-semibold">Taarifa haipo</div>
        <p className="text-sm text-slate-500 mt-1">
          Taarifa uliyoitafuta haipatikani au ilifutwa.
        </p>
        <button
          onClick={() => navigate('/notifications')}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700"
        >
          <ArrowLeft size={16} /> Rudi Taarifa
        </button>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const meta = CHANNEL_META[notif.channel] || CHANNEL_META.sms

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Rudi
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-lg grid place-items-center shrink-0 border ${meta.color}`}
          >
            <meta.Icon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${meta.color}`}
              >
                {meta.label}
              </span>
              {notif.success ? (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={10} /> Imefanikiwa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                  <XCircle size={10} /> Imeshindwa
                </span>
              )}
              {!notif.read && (
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-brand-600 text-white">
                  Mpya
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold mt-2">
              {notif.subject || 'Taarifa'}
            </h1>
            <div className="text-xs text-slate-500 mt-1">
              Kwa: {notif.recipient}
            </div>
            <div className="text-xs text-slate-500">
              {formatDate(notif.created_at)}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-5 pt-5 border-t border-slate-200">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {notif.message}
          </p>
          {notif.error && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <div className="font-semibold mb-1">Kosa:</div>
              <div className="font-mono text-xs">{notif.error}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          {!notif.read && (
            <button
              onClick={handleMarkRead}
              disabled={processing === 'read'}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              {processing === 'read' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCheck size={16} />
              )}
              Weka Kama Imesomwa
            </button>
          )}

          <button
            onClick={handleFuta}
            disabled={processing === 'delete'}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 sm:ml-auto disabled:opacity-50"
          >
            {processing === 'delete' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Futa
          </button>
        </div>
      </div>
    </div>
  )
}