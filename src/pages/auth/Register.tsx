
import { useState } from 'react'
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
  Smartphone,
  Store,
} from 'lucide-react'
import api from '../../lib/axios'

// ================================================================
// ROLES
// ================================================================

type Role = 'mteja' | 'muuzaji'

const ROLES: {
  key: Role
  label: string
  description: string
  Icon: React.ElementType
  color: string
}[] = [
  {
    key: 'mteja',
    label: 'Mteja',
    description: 'Nunua bidhaa, angalia orders',
    Icon: User,
    color: 'text-blue-600',
  },
  {
    key: 'muuzaji',
    label: 'Muuzaji',
    description: 'POS, wateja, mauzo',
    Icon: Store,
    color: 'text-emerald-600',
  },
]

// ================================================================
// REGISTER COMPONENT
// ================================================================

export default function Register() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<Role>('mteja')

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ==============================================================
  // HANDLE REGISTER
  // ==============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate full name
    if (!fullName.trim()) {
      return setError('Jina kamili linahitajika')
    }

    // Validate phone number
    const formattedPhone = phone.replace(/\s/g, '')

    if (!/^0[67]\d{2}-?\d{3}-?\d{3}$/.test(formattedPhone)) {
      return setError(
        'Weka namba sahihi ya simu (mfano 0754-123-456)'
      )
    }

    // Validate password
    if (password.length < 6) {
      return setError('Nywila iwe angalau herufi 6')
    }

    // Confirm password
    if (password !== confirm) {
      return setError('Nywila hazifanani')
    }

    const cleanPhone = phone.replace(/\s|-/g, '')

    setLoading(true)

    try {
      await api.post('/auth/register/', {
        phone: cleanPhone,
        full_name: fullName.trim(),
        password,
        role,
      })

      // Redirect to OTP verification
      navigate(
        `/verify-phone?phone=${encodeURIComponent(cleanPhone)}`,
        {
          replace: true,
        }
      )

    } catch (err: any) {
      const data = err?.response?.data

      if (
        typeof data?.detail === 'string' &&
        data.detail.toLowerCase().includes('imetumika')
      ) {
        setError(
          'Namba hii tayari imetumika. Jaribu kuingia au tumia namba nyingine.'
        )
        return
      }

      if (data?.role) {
        setError(`Role si sahihi: ${data.role[0]}`)
        return
      }

      const detail =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        'Imeshindikana kujisajili. Jaribu tena.'

      setError(detail)

    } finally {
      setLoading(false)
    }
  }

  // ==============================================================
  // PAGE DESIGN
  // ==============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        {/* Back to Home */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 mb-6"
        >
          <ArrowLeft size={14} />
          Rudi Nyumbani
        </Link>

        {/* Register Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg">

          {/* Header */}
          <div className="text-center mb-6">

            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center mx-auto">
              <UserPlus size={28} />
            </div>

            <h1 className="text-2xl font-bold mt-3">
              Jisajili
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Unda akaunti yako — utapokea OTP kwa simu
            </p>

          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* FULL NAME */}
            <div>

              <label className="text-sm font-medium">
                Jina Kamili
              </label>

              <div className="relative mt-1">

                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Mfano: John Mwakyusa"
                  disabled={loading}
                  autoComplete="name"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />

              </div>

            </div>

            {/* PHONE NUMBER */}
            <div>

              <label className="text-sm font-medium">
                Namba ya Simu
              </label>

              <div className="relative mt-1">

                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0754-123-456"
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={loading}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />

              </div>

              <p className="text-[11px] text-slate-500 mt-1">
                Utapokea SMS ya OTP kuthibitisha namba hii.
              </p>

            </div>

            {/* ACCOUNT ROLE */}
            <div>

              <label className="text-sm font-medium">
                Aina ya Akaunti
              </label>

              <div className="grid grid-cols-2 gap-2 mt-1">

                {ROLES.map((r) => {

                  const Icon = r.Icon
                  const active = role === r.key

                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      disabled={loading}
                      aria-pressed={active}
                      className={`flex items-start gap-2 p-3 rounded-lg border text-left transition ${
                        active
                          ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-200'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >

                      <Icon
                        size={18}
                        className={`shrink-0 mt-0.5 ${
                          active ? r.color : 'text-slate-400'
                        }`}
                      />

                      <div className="min-w-0">

                        <div
                          className={`text-sm font-semibold ${
                            active
                              ? 'text-brand-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {r.label}
                        </div>

                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          {r.description}
                        </div>

                      </div>

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

              <label className="text-sm font-medium">
                Nywila
              </label>

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
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100"
                  tabIndex={-1}
                  aria-label={
                    showPassword
                      ? 'Ficha nywila'
                      : 'Onyesha nywila'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                </button>

              </div>

            </div>

            {/* CONFIRM PASSWORD */}
            <div>

              <label className="text-sm font-medium">
                Rudia Nywila
              </label>

              <div className="relative mt-1">

                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

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

            {/* ERROR MESSAGE */}
            {error && (

              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">

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
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <Smartphone size={16} />
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

          {/* SECURITY INFORMATION */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">

            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">

              <ShieldCheck size={12} />

              Utapokea SMS ya OTP kuthibitisha namba yako

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
