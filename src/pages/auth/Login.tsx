
import { useState, type FormEvent } from 'react'

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import {
  LogIn,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  UserPlus,
  Loader2,
  CheckCircle2,
  Smartphone,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../context/AuthContext'

// ======================================================
// ROLE DASHBOARDS
// ======================================================

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  mteja: '/mteja',
  muuzaji: '/muuzaji',
  mhazini: '/muuzaji',
  mmiliki: '/mmiliki',
  admin: '/admin',
}

// ======================================================
// LOGIN COMPONENT
// ======================================================

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const { login } = useAuth()

  // ====================================================
  // URL PARAMETERS
  // ====================================================

  const justVerified = params.get('verified') === '1'
  const prefilledPhone = params.get('phone') ?? ''

  // ====================================================
  // STATES
  // ====================================================

  const [simu, setSimu] = useState(prefilledPhone)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerify, setNeedsVerify] = useState(false)

  // ====================================================
  // CLEAN PHONE NUMBER
  // ====================================================

  const cleanPhone = (phone: string): string => {
    return phone.replace(/[\s-]/g, '')
  }

  // ====================================================
  // NAVIGATE BY ROLE
  // ====================================================

  const navigateByRole = (role: UserRole) => {
    const destination = ROLE_DASHBOARDS[role]

    navigate(destination, {
      replace: true,
    })
  }

  // ====================================================
  // HANDLE LOGIN
  // ====================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setError('')
    setNeedsVerify(false)

    if (!simu.trim()) {
      setError('Namba ya simu inahitajika')
      return
    }

    if (!password.trim()) {
      setError('Nywila inahitajika')
      return
    }

    const phone = cleanPhone(simu)

    setLoading(true)

    try {
      const authenticatedUser = await login(phone, password)

      navigateByRole(authenticatedUser.role)
    } catch (err: unknown) {
      const apiError = err as {
        response?: {
          data?: {
            needs_verification?: boolean
            detail?: string
            non_field_errors?: string[]
          }
        }
        message?: string
      }

      const responseData = apiError.response?.data

      // -----------------------------------------------
      // PHONE VERIFICATION REQUIRED
      // -----------------------------------------------

      if (responseData?.needs_verification) {
        setNeedsVerify(true)

        setError(
          responseData.detail ??
            'Akaunti yako haijathibitishwa. Thibitisha namba yako kwanza.'
        )

        return
      }

      // -----------------------------------------------
      // OTHER LOGIN ERRORS
      // -----------------------------------------------

      const errorMessage =
        responseData?.detail ||
        responseData?.non_field_errors?.[0] ||
        apiError.message ||
        'Imeshindikana kuingia. Jaribu tena.'

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // ====================================================
  // COMPONENT UI
  // ====================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        {/* BACK HOME */}

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 mb-6"
        >
          <ArrowLeft size={14} />
          Rudi Nyumbani
        </Link>

        {/* LOGIN CARD */}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg">

          {/* VERIFIED MESSAGE */}

          {justVerified && (
            <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">

              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0"
              />

              <div>
                <div className="font-semibold">
                  Akaunti imethibitishwa!
                </div>

                <div className="text-xs text-emerald-600 mt-0.5">
                  Ingia kwa namba yako ya simu na nywila.
                </div>
              </div>
            </div>
          )}

          {/* HEADER */}

          <div className="text-center mb-6">

            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center mx-auto">
              <LogIn size={28} />
            </div>

            <h1 className="text-2xl font-bold mt-3">
              Ingia
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Weka namba yako ya simu na nywila
            </p>

          </div>

          {/* LOGIN FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-3"
          >

            {/* PHONE NUMBER */}

            <div>

              <label
                htmlFor="phone"
                className="text-sm font-medium"
              >
                Namba ya Simu
              </label>

              <div className="relative mt-1">

                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="phone"
                  type="tel"
                  value={simu}
                  onChange={(event) => setSimu(event.target.value)}
                  placeholder="0754-123-456"
                  inputMode="tel"
                  autoComplete="username"
                  disabled={loading}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />

              </div>
            </div>

            {/* PASSWORD */}

            <div>

              <label
                htmlFor="password"
                className="text-sm font-medium"
              >
                Nywila
              </label>

              <div className="relative mt-1">

                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'Ficha nywila'
                      : 'Onyesha nywila'
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                </button>

              </div>
            </div>

            {/* ERROR MESSAGE */}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm"
              >

                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0"
                />

                <div className="flex-1">

                  <div>{error}</div>

                  {needsVerify && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/verify-phone?phone=${encodeURIComponent(
                            cleanPhone(simu)
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

            {/* SUBMIT BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >

              {loading ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
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

          {/* FORGOT PASSWORD */}

          <div className="mt-4 text-center">

            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
            >
              <KeyRound size={12} />
              Umesahau Nywila?
            </Link>

          </div>

          {/* REGISTER */}

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

          {/* SECURITY FOOTER */}

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
