
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import api from '../lib/axios'

// ======================================================
// USER ROLES
// ======================================================

export type UserRole =
  | 'mteja'
  | 'muuzaji'
  | 'mhazini'
  | 'mmiliki'
  | 'admin'

// ======================================================
// USER TYPE
// ======================================================

export interface User {
  id: string
  phone: string
  full_name: string
  role: UserRole
  store_id?: string | null
}

// ======================================================
// API RESPONSE TYPES
// ======================================================

interface LoginResponse {
  access: string
  refresh: string
  user: {
    id: string | number
    phone?: string
    full_name?: string
    role: string
    store_id?: string | number | null
  }
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (phone: string, password: string) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<User | null>
}

// ======================================================
// VALIDATE USER ROLE
// ======================================================

const VALID_ROLES: UserRole[] = [
  'mteja',
  'muuzaji',
  'mhazini',
  'mmiliki',
  'admin',
]

function isValidUserRole(role: unknown): role is UserRole {
  return (
    typeof role === 'string' &&
    VALID_ROLES.includes(role as UserRole)
  )
}

// ======================================================
// NORMALIZE USER DATA
// ======================================================

function normalizeUser(data: unknown): User {
  if (!data || typeof data !== 'object') {
    throw new Error('Taarifa za mtumiaji hazipo.')
  }

  const raw = data as Record<string, unknown>

  if (
    typeof raw.id !== 'string' &&
    typeof raw.id !== 'number'
  ) {
    throw new Error('User ID haipo.')
  }

  if (!isValidUserRole(raw.role)) {
    throw new Error('Aina ya akaunti haijatambulika.')
  }

  return {
    id: String(raw.id),
    phone: String(raw.phone ?? ''),
    full_name: String(raw.full_name ?? ''),
    role: raw.role,
    store_id:
      raw.store_id === null || raw.store_id === undefined
        ? null
        : String(raw.store_id),
  }
}

// ======================================================
// AUTH CONTEXT
// ======================================================

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
)

// ======================================================
// AUTH PROVIDER
// ======================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // ====================================================
  // AUTO LOGIN
  // ====================================================

  useEffect(() => {
    let active = true

    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('access_token')

      if (!accessToken) {
        if (active) {
          setLoading(false)
        }
        return
      }

      try {
        const response = await api.get('/auth/me/')
        const authenticatedUser = normalizeUser(response.data)

        if (active) {
          setUser(authenticatedUser)
        }
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      active = false
    }
  }, [])

  // ====================================================
  // LOGIN
  // ====================================================

  const login = useCallback(
    async (phone: string, password: string): Promise<User> => {
      const response = await api.post<LoginResponse>(
        '/auth/login/',
        {
          phone,
          password,
        }
      )

      const data = response.data

      if (
        !data ||
        typeof data.access !== 'string' ||
        typeof data.refresh !== 'string' ||
        !data.user
      ) {
        throw new Error(
          'Server haikurudisha taarifa kamili za login.'
        )
      }

      const authenticatedUser = normalizeUser(data.user)

      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)

      setUser(authenticatedUser)

      return authenticatedUser
    },
    []
  )

  // ====================================================
  // LOGOUT
  // ====================================================

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')

    setUser(null)
  }, [])

  // ====================================================
  // REFRESH USER
  // ====================================================

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await api.get('/auth/me/')

      const authenticatedUser = normalizeUser(response.data)

      setUser(authenticatedUser)

      return authenticatedUser
    } catch {
      return null
    }
  }, [])

  // ====================================================
  // CONTEXT VALUE
  // ====================================================

  const contextValue: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    loading,
    login,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// ======================================================
// USE AUTH HOOK
// ======================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    )
  }

  return context
}
