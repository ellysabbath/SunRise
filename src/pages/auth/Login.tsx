import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  LogIn, Phone, Lock, Eye, EyeOff, ArrowLeft,
  AlertTriangle, ShieldCheck, KeyRound, UserPlus,
  Loader2, CheckCircle2, Smartphone,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { login } = useAuth()

  // Ikiwa ametoka /verify-phone, tunaonyesha ujumbe wa mafanikio
  const justVerified = params.get('verified') === '1'
  const prefilledPhone = params.get('phone') || ''

  const [simu, setSimu] = useState(prefilledPhone)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerify, setNeedsVerify] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsVerify(false)

    // Validation
    if (!simu.trim()) return setError('Namba ya simu inahitajika')
    if (!password.trim()) return setError('Nywila inahitajika')

    const cleanPhone = simu.replace(/\s|-/g, '')

    setLoading(true)
    try {
      const user = await login(cleanPhone, password)

      // Navigate kulingana na role
      switch (user.role) {
        case 'mteja':
          navigate('/mteja', { replace: true })
          break
        case 'muuzaji':
        case 'mhazini':
          navigate('/muuzaji', { replace: true })
          break
        case 'mmiliki':
          navigate('/mmiliki', { replace: true })
          break
        case 'admin':
          navigate('/admin', { replace: true })
          break
        default:
          navigate('/', { replace: true })
      }
    } catch (err: any) {
      const data = err?.response?.data

      // Mtumiaji hajathibitisha — mpeleke /verify-phone
      if (data?.needs_verification) {
        setNeedsVerify(true)
        setError(
          data?.detail ||
            'Akaunti yako haijathibitishwa. Thibitisha namba yako kwanza.'
        )
        return
      }

      const detail =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        'Imeshindikana kuingia. Jaribu tena.'
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 mb-6"
        >
          <ArrowLeft size={14} />
          Rudi Nyumbani
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg">
          {/* Ujumbe wa mafanikio baada ya verify */}
          {justVerified && !error && (
            <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Akaunti imethibitishwa!</div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  Ingia kwa namba yako ya simu na nywila.
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center mx-auto">
              <LogIn size={28} />
            </div>
            <h1 className="text-2xl font-bold mt-3">Ingia</h1>
            <p className="text-sm text-slate-500 mt-1">
              Weka namba yako ya simu na nywila
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Namba ya Simu</label>
              <div className="relative mt-1">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={simu}
                  onChange={(e) => setSimu(e.target.value)}
                  placeholder="0754-123-456"
                  inputMode="tel"
                  autoComplete="username"
                  disabled={loading}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Nywila</label>
              <div className="relative mt-1">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div>{error}</div>
                  {needsVerify && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/verify-phone?phone=${encodeURIComponent(
                            simu.replace(/\s|-/g, '')
                          )}`,
                          { replace: true }
                        )
                      }
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-800 underline hover:text-red-900"
                    >
                      <Smartphone size={12} />
                      Nenda uthibitishe namba yako
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Inaingia...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Ingia
                </>
              )}
            </button>
          </form>

          {/* Kiungo cha kusahau nywila */}
          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
            >
              <KeyRound size={12} />
              Umesahau Nywila?
            </Link>
          </div>

          {/* Kiungo cha kujisajili */}
          <div className="mt-4 text-center text-sm text-slate-600">
            Huna akaunti?{' '}
            <Link
              to="/register"
              className="inline-flex items-center gap-1 text-brand-600 font-semibold hover:underline"
            >
              <UserPlus size={12} />
              Jisajili
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck size={12} />
              Usalama wa akaunti yako ni kipaumbele chetu
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}