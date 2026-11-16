import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck, Phone, CheckCircle2, AlertTriangle,
  ArrowLeft, Loader2, RotateCcw,
} from 'lucide-react'
import api from '../../lib/axios'

export default function VerifyPhone() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const phone = params.get('phone') || ''

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const inputsRef = useRef<HTMLInputElement[]>([])

  // Kama hakuna phone — mpeleke /register
  useEffect(() => {
    if (!phone) navigate('/register', { replace: true })
  }, [phone, navigate])

  // Countdown ya resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // Focus box ya kwanza
  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  // ------------------------------------------------------------------
  // Input handling
  // ------------------------------------------------------------------
  const setDigit = (i: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 1)
    const next = [...digits]
    next[i] = clean
    setDigits(next)

    if (clean && i < 5) {
      inputsRef.current[i + 1]?.focus()
    }
  }

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) inputsRef.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputsRef.current[i + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6)
    if (!pasted) return

    const next = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)

    const focus = Math.min(pasted.length, 5)
    inputsRef.current[focus]?.focus()
  }

  const code = digits.join('')

  // ------------------------------------------------------------------
  // Submit — thibitisha
  // ------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (code.length !== 6) return setError('Weka tarakimu 6 za OTP')

    setLoading(true)
    try {
      await api.post('/auth/verify-phone/', { phone, code })
      setSuccess(true)
      // Baada ya 1.5s, mpeleke login
      setTimeout(() => {
        navigate(
          `/login?verified=1&phone=${encodeURIComponent(phone)}`,
          { replace: true }
        )
      }, 1500)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'OTP si sahihi au imeisha muda'
      )
      setDigits(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // ------------------------------------------------------------------
  // Tuma OTP tena
  // ------------------------------------------------------------------
  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setResending(true)
    try {
      await api.post('/auth/resend-otp/', { phone })
      setResendCooldown(60)
      setDigits(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Imeshindikana kutuma OTP'
      )
    } finally {
      setResending(false)
    }
  }

  // ------------------------------------------------------------------
  // Success screen
  // ------------------------------------------------------------------
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-2xl font-bold mt-4">Imethibitishwa!</h1>
            <p className="text-sm text-slate-500 mt-2">
              Akaunti yako imethibitishwa. Tunakupeleka kuingia...
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-brand-600">
              <Loader2 size={16} className="animate-spin" />
              Inaelekeza...
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Main screen
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 mb-6"
        >
          <ArrowLeft size={14} />
          Rudi Kujisajili
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center mx-auto">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-bold mt-3">Thibitisha Akaunti</h1>
            <p className="text-sm text-slate-500 mt-1">
              Tumetuma OTP kwa{' '}
              <span className="font-semibold text-slate-900">{phone}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block text-center mb-3">
                Weka tarakimu 6 za OTP
              </label>
              <div className="flex gap-2 justify-center">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      if (el) inputsRef.current[i] = el
                    }}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    inputMode="numeric"
                    maxLength={1}
                    disabled={loading}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-slate-200 focus:border-brand-500 outline-none disabled:bg-slate-50 font-mono"
                  />
                ))}
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
              disabled={loading || code.length !== 6}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Inathibitisha...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Thibitisha
                </>
              )}
            </button>
          </form>

          {/* Resend */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
            >
              {resending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCcw size={12} />
              )}
              {resendCooldown > 0
                ? `Tuma tena baada ya ${resendCooldown}s`
                : 'Tuma OTP tena'}
            </button>
          </div>

          {/* Msaada */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Phone size={12} />
              OTP ni salama — usiitume kwa mtu mwingine
            </div>
          </div>
        </div>

        {/* Msaada wa ziada */}
        <p className="text-center text-xs text-slate-500 mt-4">
          Hukupokea SMS? Hakikisha namba yako ipo sahihi au{' '}
          <button
            type="button"
            onClick={() => navigate('/register', { replace: true })}
            className="text-brand-600 font-semibold hover:underline"
          >
            jisajili upya
          </button>
          .
        </p>
      </div>
    </div>
  )
}