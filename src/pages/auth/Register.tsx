
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
  UserPlus,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  User,
  Loader2,
  Store,
  CheckCircle2,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

import api from '../../lib/axios'

// ================================================================
// USER ROLES
// ================================================================

type Role = 'mteja' | 'muuzaji'

// ================================================================
// ROLE CONFIGURATION
// ================================================================

interface RoleOption {
  key: Role
  label: string
  description: string
  Icon: LucideIcon
  color: string
  activeBg: string
}

const ROLES: RoleOption[] = [
  {
    key: 'mteja',
    label: 'Mteja',
    description: 'Nunua bidhaa na angalia orders',
    Icon: User,
    color: 'text-blue-600',
    activeBg: 'bg-blue-50',
  },
  {
    key: 'muuzaji',
    label: 'Muuzaji',
    description: 'POS, wateja na mauzo',
    Icon: Store,
    color: 'text-emerald-600',
    activeBg: 'bg-emerald-50',
  },
]

// ================================================================
// REGISTER COMPONENT
// ================================================================

export default function Register() {
  const navigate = useNavigate()

  // ==============================================================
  // FORM STATES
  // ==============================================================

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [role, setRole] = useState<Role>('mteja')

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ==============================================================
  // PHONE FORMATTING
  // ==============================================================

  const cleanPhone = (value: string): string => {
    return value.replace(/[\s-]/g, '')
  }

  // ==============================================================
  // HANDLE REGISTRATION
  // ==============================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    setError('')

    // ------------------------------------------------------------
    // VALIDATE FULL NAME
    // ------------------------------------------------------------

    if (!fullName.trim()) {
      setError('Jina kamili linahitajika')
      return
    }

    if (fullName.trim().length < 3) {
      setError('Jina kamili liwe na angalau herufi 3')
      return
    }

    // ------------------------------------------------------------
    // VALIDATE PHONE NUMBER
    // ------------------------------------------------------------

    const formattedPhone = cleanPhone(phone)

    if (!/^0[67]\d{8}$/.test(formattedPhone)) {
      setError(
        'Weka namba sahihi ya simu (mfano 0754-123-456)'
      )
      return
    }

    const normalizedPhone = formattedPhone

    // ------------------------------------------------------------
    // VALIDATE PASSWORD
    // ------------------------------------------------------------

    if (password.length < 6) {
      setError('Nywila iwe angalau herufi 6')
      return
    }

    // ------------------------------------------------------------
    // CONFIRM PASSWORD
    // ------------------------------------------------------------

    if (password !== confirm) {
      setError('Nywila hazifanani')
      return
    }

    // ------------------------------------------------------------
    // VALIDATE ROLE
    // ------------------------------------------------------------

    const validRole = ROLES.some(
      (item) => item.key === role
    )

    if (!validRole) {
      setError('Tafadhali chagua aina sahihi ya akaunti')
      return
    }

    // ------------------------------------------------------------
    // SEND REGISTRATION REQUEST
    // ------------------------------------------------------------

    setLoading(true)

    try {
      await api.post('/auth/register/', {
        phone: normalizedPhone,
        full_name: fullName.trim(),
        password,
        role,
      })

      // ----------------------------------------------------------
      // REDIRECT TO PHONE VERIFICATION
      // ----------------------------------------------------------

      navigate(
        `/verify-phone?phone=${encodeURIComponent(normalizedPhone)}`,
        {
          replace: true,
        }
      )

    } catch (err: unknown) {

      const apiError = err as {
        response?: {
          data?: {
            detail?: string
            role?: string[]
            phone?: string[]
            non_field_errors?: string[]
          }
        }
        message?: string
      }

      const data = apiError.response?.data

      // ----------------------------------------------------------
      // PHONE ALREADY EXISTS
      // ----------------------------------------------------------

      if (data?.phone?.length) {
        setError(data.phone[0])
        return
      }

      if (
        typeof data?.detail === 'string' &&
        data.detail.toLowerCase().includes('imetumika')
      ) {
        setError(
          'Namba hii tayari imetumika. Jaribu kuingia au tumia namba nyingine.'
        )
        return
      }

      // ----------------------------------------------------------
      // INVALID ROLE
      // ----------------------------------------------------------

      if (data?.role?.length) {
        setError(
          `Aina ya akaunti si sahihi: ${data.role[0]}`
        )
        return
      }

      // ----------------------------------------------------------
      // OTHER ERRORS
      // ----------------------------------------------------------

      const detail =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        apiError.message ||
        'Imeshindikana kujisajili. Jaribu tena.'

      setError(detail)

    } finally {
      setLoading(false)
    }
  }

  // ==============================================================
  // PAGE UI
  // ==============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        {/* BACK TO HOME */}

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 mb-6 transition"
        >
          <ArrowLeft size={14} />
          Rudi Nyumbani
        </Link>

        {/* REGISTER CARD */}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg">

          {/* HEADER */}

          <div className="text-center mb-6">

            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center mx-auto">
              <UserPlus size={28} />
            </div>

            <h1 className="text-2xl font-bold mt-3 text-slate-800">
              Jisajili
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Unda akaunti yako — utapokea OTP kwa simu
            </p>

          </div>

          {/* REGISTRATION FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* FULL NAME */}

            <div>

              <label
                htmlFor="fullName"
                className="text-sm font-medium text-slate-700"
              >
                Jina Kamili
              </label>

              <div className="relative mt-1">

                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  placeholder="Mfano: John Mwakyusa"
                  disabled={loading}
                  autoComplete="name"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm disabled:bg-slate-50 transition"
                />

              </div>

            </div>

            {/* PHONE NUMBER */}

            <div>

              <label
                htmlFor="phone"
                className="text-sm font-medium text-slate-700"
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
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="0754-123-456"
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={loading}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm disabled:bg-slate-50 transition"
                />

              </div>

              <p className="text-[11px] text-slate-500 mt-1">
                Utapokea SMS ya OTP kuthibitisha namba hii.
              </p>

            </div>

            {/* ACCOUNT ROLE */}

            <div>

              <label className="text-sm font-medium text-slate-700">
                Aina ya Akaunti
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">

                {ROLES.map((item) => {
                  const Icon = item.Icon
                  const active = role === item.key

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setRole(item.key)}
                      disabled={loading}
                      aria-pressed={active}
                      className={`relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        active
                          ? `${item.activeBg} border-brand-500 ring-1 ring-brand-200`
                          : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >

                      <div
                        className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${
                          active
                            ? 'bg-white'
                            : 'bg-slate-100'
                        }`}
                      >

                        <Icon
                          size={19}
                          className={
                            active
                              ? item.color
                              : 'text-slate-400'
                          }
                        />

                      </div>

                      <div className="min-w-0 flex-1">

                        <div
                          className={`text-sm font-semibold ${
                            active
                              ? 'text-brand-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {item.label}
                        </div>

                        <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          {item.description}
                        </div>

                      </div>

                      {active && (
                        <CheckCircle2
                          size={17}
                          className="text-brand-600 shrink-0"
                        />
                      )}

                    </button>
                  )
                })}

              </div>

              <p className="text-[11px] text-slate-500 mt-1.5">
                Chagua aina ya akaunti unayotaka kutumia.
              </p>

            </div>

            {/* PASSWORD */}

            <div>

              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
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
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm disabled:bg-slate-50 transition"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
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
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>

              </div>

            </div>

            {/* CONFIRM PASSWORD */}

            <div>

              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-slate-700"
              >
                Rudia Nywila
              </label>

              <div className="relative mt-1">

                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(event) =>
                    setConfirm(event.target.value)
                  }
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm disabled:bg-slate-50 transition"
                />

              </div>

            </div>

            {/* ERROR MESSAGE */}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm"
              >

                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0"
                />

                <div className="flex-1">
                  {error}
                </div>

              </div>
            )}

            {/* SUBMIT BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >

              {loading ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Inatuma OTP...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Jisajili
                </>
              )}

            </button>

          </form>

          {/* LOGIN LINK */}

          <div className="mt-4 text-center text-sm text-slate-600">

            Una akaunti tayari?{' '}

            <Link
              to="/login"
              className="text-brand-600 font-semibold hover:underline"
            >
              Ingia
            </Link>

          </div>

          {/* SECURITY FOOTER */}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">

            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck size={13} />
              Utapokea SMS ya OTP kuthibitisha namba yako
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
