import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  KeyRound, Phone, ArrowLeft, AlertTriangle, CheckCircle2,
  ShieldCheck, Smartphone, Loader2,
} from 'lucide-react'
import { authApi } from '../../services/auth' // ← rekebisha njia kulingana na mahali faili la authApi lilipo

// Kutoa ujumbe wa error kutoka backend (axios)
function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { detail?: string; message?: string; error?: string } }
  }
  return (
    e?.response?.data?.detail ||
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    fallback
  )
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [simu, setSimu] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // Namba safi (bila nafasi na dashes) inayotumwa kwa backend
  const cleanPhone = simu.replace(/[\s-]/g, '')

  const requestOtp = async () => {
    if (!/^0[67]\d{8}$/.test(cleanPhone)) {
      setError('Weka namba sahihi ya simu')
      return false
    }
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await authApi.requestOtp(cleanPhone, 'reset', 'sms')
      return true
    } catch (err) {
      setError(getErrorMessage(err, 'Imeshindwa kutuma OTP. Jaribu tena.'))
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (await requestOtp()) setOtpSent(true)
  }

  const handleResend = async () => {
    if (loading) return
    if (await requestOtp()) {
      setOtp('')
      setInfo('OTP mpya imetumwa')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (otp.length !== 6) return setError('OTP inapaswa kuwa tarakimu 6')

    setError('')
    setInfo('')
    setLoading(true)
    try {
      const data = await authApi.verifyOtp(cleanPhone, otp)
      // Peleka phone, code na jibu la backend (mfano token) kwenye ukurasa wa reset
      navigate('/reset-password', {
        state: { phone: cleanPhone, code: otp, verified: data },
      })
    } catch (err) {
      setError(getErrorMessage(err, 'OTP si sahihi au imeisha muda'))
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
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto">
              <KeyRound size={28} />
            </div>
            <h1 className="text-2xl font-bold mt-3">Umesahau Nywila?</h1>
            <p className="text-sm text-slate-500 mt-1">
              {otpSent
                ? 'Weka OTP uliyotumiwa kwa simu'
                : 'Weka namba yako ili tukupe OTP'}
            </p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Namba ya Simu</label>
                <div className="relative mt-1">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={simu}
                    onChange={(e) => setSimu(e.target.value)}
                    placeholder="0754-123-456"
                    inputMode="tel"
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
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
                {loading ? 'Inatuma...' : 'Tuma OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-800">
                  OTP imetumwa kwa <span className="font-semibold">{simu}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">OTP (tarakimu 6)</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  disabled={loading}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none font-mono text-center text-lg tracking-widest disabled:bg-slate-50"
                />
              </div>

              {info && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  {info}
                </div>
              )}

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
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {loading ? 'Inathibitisha...' : 'Thibitisha OTP'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    setError('')
                    setInfo('')
                  }}
                  className="text-slate-500 hover:text-brand-600 disabled:opacity-60"
                >
                  Badilisha namba ya simu
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResend}
                  className="text-brand-600 hover:underline font-medium disabled:opacity-60"
                >
                  Tuma tena OTP
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck size={12} />
              OTP ni salama - usiituma kwa mtu mwingine
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}