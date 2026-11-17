import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  Lock, ArrowLeft, AlertTriangle, Eye, EyeOff,
  ShieldCheck, KeyRound, Loader2,
} from 'lucide-react'
import { authApi } from '../../services/auth' // ← rekebisha njia kama ulivyofanya kwenye ForgotPassword

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { detail?: string; message?: string; error?: string; new_password?: string[] } }
  }
  return (
    e?.response?.data?.detail ||
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.response?.data?.new_password?.[0] ||
    fallback
  )
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { phone?: string; code?: string } | null }

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const phone = state?.phone
  const code = state?.code

  // Mtu akifungua ukurasa huu moja kwa moja bila kupitia OTP
  if (!phone || !code) return <Navigate to="/forgot-password" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (password.length < 6) return setError('Nywila iwe angalau herufi 6')
    if (password !== confirm) return setError('Nywila hazifanani')

    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword(phone, code, password)
      navigate('/reset-complete', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Imeshindwa kubadilisha nywila. Jaribu tena.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 mb-6"
        >
          <ArrowLeft size={14} />
          Rudi Login
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center mx-auto">
              <Lock size={28} />
            </div>
            <h1 className="text-2xl font-bold mt-3">Weka Nywila Mpya</h1>
            <p className="text-sm text-slate-500 mt-1">
              Chagua nywila mpya yenye usalama
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nywila Mpya</label>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Rudia Nywila</label>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {loading ? 'Inahifadhi...' : 'Hifadhi Nywila'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck size={12} />
              Tumia nywila imara yenye herufi na namba
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}