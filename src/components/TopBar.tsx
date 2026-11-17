import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Bell, Menu, Settings, User, LogOut, ChevronDown, X,
  ShoppingCart, Plus, Minus, Trash2, ArrowRight, LogOutIcon,
  Package, Users, FileText, Mail, MessageSquare, Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import {
  notificationsApi,
  type NotificationLog,
} from '../services/notifications'
import {
  searchEverything,
  type SearchResult,
  type SearchType,
} from '../services/search'
import { iconForKundi } from '../utils/icons'
import { formatDate } from '../lib/format'

// ==================================================================
// Types
// ==================================================================
type Role = 'mteja' | 'muuzaji' | 'mmiliki'

interface TopBarProps {
  role: Role
  onMenuClick: () => void
}

const ROLE_LABEL: Record<Role, string> = {
  mteja: 'Mteja',
  muuzaji: 'Muuzaji',
  mmiliki: 'Mmiliki',
}

const TYPE_LABEL: Record<SearchType, string> = {
  bidhaa: 'Bidhaa',
  mteja: 'Mteja',
  order: 'Order',
}

const TYPE_ICON: Record<SearchType, React.ElementType> = {
  bidhaa: Package,
  mteja: Users,
  order: FileText,
}

// ==================================================================
// Component — ✅ React.memo inazuia re-render isiyo ya lazima
// ==================================================================
function TopBarInner({ role, onMenuClick }: TopBarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const cart = useCart()

  // ✅ Primitive values — sio object — kwa deps za hooks
  const userId = user?.id
  const storeId = user?.store_id || undefined

  // ------------------------------------------------------------------
  // Local state
  // ------------------------------------------------------------------
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifList, setNotifList] = useState<NotificationLog[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const [cartOpen, setCartOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const showCart = role === 'mteja' || role === 'muuzaji'

  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const cartRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // ✅ Ref kwa loadNotifications — inazuia useCallback dependency loop
  const loadNotificationsRef = useRef<() => Promise<void>>(async () => {})

  // ------------------------------------------------------------------
  // Derived
  // ------------------------------------------------------------------
  const initials = useMemo(
    () =>
      (user?.full_name || '?')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    [user?.full_name]
  )

  const unreadCount = useMemo(
    () => notifList.filter((n) => !n.read).length,
    [notifList]
  )

  // ✅ searchScope ni stable — sio array mpya kila render
  const searchScope = useMemo<SearchType[]>(
    () =>
      role === 'mteja'
        ? ['bidhaa']
        : ['bidhaa', 'mteja', 'order'],
    [role]
  )

  // ------------------------------------------------------------------
  // 1. Notifications loader (stable kupitia useCallback)
  // ------------------------------------------------------------------
  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifList([])
      return
    }
    setNotifLoading(true)
    try {
      const data = await notificationsApi.logs({
        limit: 20,
        recipient: userId,
        store: storeId,
      })
      setNotifList(data)
    } catch {
      setNotifList([])
    } finally {
      setNotifLoading(false)
    }
  }, [userId, storeId])

  // ✅ Sasisha ref kila loadNotifications inabadilika
  useEffect(() => {
    loadNotificationsRef.current = loadNotifications
  }, [loadNotifications])

  // ✅ Load notifications MARA MOJA tu user anapobadilika
  // (sio kila render — userId ni primitive)
  useEffect(() => {
    if (userId) {
      loadNotificationsRef.current()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ------------------------------------------------------------------
  // 2. Search — debounced, ina-run TU query inapobadilika
  // ------------------------------------------------------------------
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setSearchLoading(false)
      return
    }

    let cancelled = false
    const t = setTimeout(async () => {
      if (cancelled) return
      setSearchLoading(true)
      try {
        const r = await searchEverything(trimmed, {
          limit: 5,
          store: storeId,
          scope: searchScope,
        })
        if (!cancelled) setResults(r)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, storeId, searchScope])

  // ------------------------------------------------------------------
  // 3. Outside click
  // ------------------------------------------------------------------
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (searchRef.current && !searchRef.current.contains(t))
        setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(t))
        setNotifOpen(false)
      if (cartRef.current && !cartRef.current.contains(t))
        setCartOpen(false)
      if (profileRef.current && !profileRef.current.contains(t))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ------------------------------------------------------------------
  // 4. Escape key
  // ------------------------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setNotifOpen(false)
        setCartOpen(false)
        setProfileOpen(false)
        setLogoutOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleSearchResult = useCallback(
    (route: string) => {
      navigate(route)
      setQuery('')
      setSearchOpen(false)
    },
    [navigate]
  )

  const toggleNotif = useCallback(async () => {
    setNotifOpen((v) => {
      const next = !v
      if (next) loadNotificationsRef.current()
      return next
    })
    setCartOpen(false)
    setProfileOpen(false)
  }, [])

  const toggleCart = useCallback(() => {
    setCartOpen((v) => !v)
    setNotifOpen(false)
    setProfileOpen(false)
  }, [])

  const toggleProfile = useCallback(() => {
    setProfileOpen((v) => !v)
    setNotifOpen(false)
    setCartOpen(false)
  }, [])

  const handleNotifClick = useCallback(
    async (n: NotificationLog) => {
      setNotifOpen(false)
      if (!n.read) {
        try {
          await notificationsApi.markAsRead(n.id)
          setNotifList((prev) =>
            prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
          )
        } catch {
          // endelea
        }
      }
      navigate(`/notifications/${n.id}`)
    },
    [navigate]
  )

  const handleOnaZote = useCallback(() => {
    setNotifOpen(false)
    navigate(`/notifications`)
  }, [navigate])

  const handleMarkAllRead = useCallback(async () => {
    const unread = notifList.filter((n) => !n.read)
    if (unread.length === 0) return
    setMarkingAll(true)
    try {
      await notificationsApi.markAllRead(unread.map((n) => n.id))
      setNotifList((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      // endelea
    } finally {
      setMarkingAll(false)
    }
  }, [notifList])

  const goToQuotation = useCallback(() => {
    setCartOpen(false)
    if (!storeId) {
      navigate('/mteja/quotation')
      return
    }
    navigate(`/mteja/quotation?store=${storeId}`)
  }, [navigate, storeId])

  const goToBidhaa = useCallback(() => {
    setCartOpen(false)
    navigate(role === 'muuzaji' ? '/muuzaji' : '/mteja/bidhaa')
  }, [navigate, role])

  const goToProfile = useCallback(() => {
    setProfileOpen(false)
    navigate(`/${role}/profile`)
  }, [navigate, role])

  const goToSettings = useCallback(() => {
    setProfileOpen(false)
    navigate(`/${role}/settings`)
  }, [navigate, role])

  const handleLogout = useCallback(() => {
    setProfileOpen(false)
    setLogoutOpen(true)
  }, [])

  const confirmLogout = useCallback(() => {
    setLogoutOpen(false)
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="h-16 px-3 md:px-6 flex items-center gap-2 md:gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 shrink-0"
          aria-label="Fungua menyu"
        >
          <Menu size={22} />
        </button>

        {/* ===== SEARCH ===== */}
        <div ref={searchRef} className="flex-1 min-w-0 relative">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder={
                role === 'mteja'
                  ? 'Tafuta bidhaa...'
                  : 'Tafuta bidhaa, mteja, order...'
              }
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-100 border border-transparent focus:bg-white focus:border-brand-500 outline-none text-sm"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setSearchOpen(false)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-200"
                aria-label="Futa"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {searchOpen && query && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-xl max-h-[70vh] overflow-auto">
              {searchLoading ? (
                <div className="p-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  Inatafuta...
                </div>
              ) : results.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Hakuna matokeo ya "
                  <span className="font-medium text-slate-700">{query}</span>"
                </div>
              ) : (
                <div className="py-1">
                  {results.map((r, i) => {
                    const Icon = TYPE_ICON[r.type] || Package
                    return (
                      <button
                        key={`${r.type}-${i}`}
                        onClick={() => handleSearchResult(r.route)}
                        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-left"
                      >
                        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0">
                          <Icon size={16} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {r.title}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {r.subtitle}
                          </div>
                        </div>
                        <span className="hidden sm:inline text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                          {TYPE_LABEL[r.type]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== RIGHT ACTIONS ===== */}
        <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
          {/* CART */}
          {showCart && (
            <div ref={cartRef} className="relative">
              <button
                onClick={toggleCart}
                className="relative flex items-center gap-2 px-2 md:px-2.5 py-2 rounded-lg hover:bg-slate-100 transition"
                aria-label="Cart"
              >
                <div className="relative">
                  <ShoppingCart size={20} />
                  {cart.count > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 bg-brand-600 text-white text-[10px] rounded-full grid place-items-center font-bold">
                      {cart.count > 99 ? '99+' : cart.count}
                    </span>
                  )}
                </div>
                {cart.total > 0 && (
                  <span className="hidden md:inline text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded-md whitespace-nowrap">
                    TZS {cart.total.toLocaleString()}
                  </span>
                )}
              </button>

              {cartOpen && (
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                  <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <ShoppingCart size={14} className="text-brand-600" />
                        Cart Yako
                        {cart.count > 0 && (
                          <span className="text-[10px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded-full">
                            {cart.count}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        TZS {cart.total.toLocaleString()}
                      </div>
                    </div>
                    {cart.detailed.length > 0 && (
                      <button
                        onClick={cart.clear}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        Ondoa zote
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-auto divide-y divide-slate-100">
                    {cart.detailed.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        <ShoppingCart
                          size={32}
                          className="mx-auto mb-2 text-slate-300"
                        />
                        <div className="font-medium">Cart yako ni tupu</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Ongeza bidhaa kuanza
                        </div>
                      </div>
                    ) : (
                      cart.detailed.map((l) => {
                        const Icon = iconForKundi(l.iconKey)
                        return (
                          <div key={l.id} className="p-3 flex gap-3">
                            <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden grid place-items-center shrink-0 text-slate-600">
                              {l.pichaUrl ? (
                                <img
                                  src={l.pichaUrl}
                                  alt={l.jina}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Icon size={18} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {l.jina}
                              </div>
                              <div className="text-xs text-slate-500">
                                TZS {l.bei.toLocaleString()} / {l.uom}
                              </div>
                              <div className="flex items-center gap-1.5 mt-2">
                                <button
                                  onClick={() => cart.dec(l.id)}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 grid place-items-center"
                                  aria-label="Punguza"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-sm font-bold w-6 text-center">
                                  {l.wingi}
                                </span>
                                <button
                                  onClick={() => cart.inc(l.id)}
                                  className="w-6 h-6 rounded-md bg-brand-600 text-white hover:bg-brand-700 grid place-items-center"
                                  aria-label="Ongeza"
                                >
                                  <Plus size={12} />
                                </button>
                                <button
                                  onClick={() => cart.remove(l.id)}
                                  className="ml-auto p-1 rounded-md text-red-500 hover:bg-red-50"
                                  aria-label="Ondoa"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="text-sm font-bold self-start whitespace-nowrap">
                              TZS {l.jumla.toLocaleString()}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="p-3 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Jumla</span>
                      <span className="font-bold text-base">
                        TZS {cart.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={goToBidhaa}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-sm hover:bg-slate-200 font-medium"
                      >
                        Endelea
                      </button>
                      <button
                        onClick={goToQuotation}
                        disabled={cart.detailed.length === 0}
                        className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
                      >
                        Quotation
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS */}
          <div ref={notifRef} className="relative">
            <button
              onClick={toggleNotif}
              className="relative p-2 rounded-lg hover:bg-slate-100"
              aria-label="Taarifa"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] rounded-full grid place-items-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    Taarifa
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markingAll}
                      className="text-xs text-brand-600 hover:underline disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {markingAll && (
                        <Loader2 size={10} className="animate-spin" />
                      )}
                      Weka zote
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-auto divide-y divide-slate-100">
                  {notifLoading ? (
                    <div className="p-8 flex items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin" />
                      Inapakia...
                    </div>
                  ) : notifList.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      <Bell size={32} className="mx-auto mb-2 text-slate-300" />
                      Hakuna taarifa
                    </div>
                  ) : (
                    notifList.map((n) => {
                      const Icon =
                        n.channel === 'email' ? Mail : MessageSquare
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`w-full text-left p-3 hover:bg-slate-50 transition ${
                            !n.read ? 'bg-brand-50/40' : ''
                          }`}
                        >
                          <div className="flex gap-2">
                            <div
                              className={`mt-0.5 shrink-0 ${
                                n.success ? 'text-emerald-500' : 'text-red-500'
                              }`}
                            >
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium flex items-center gap-2">
                                <span className="truncate">
                                  {n.subject || 'Taarifa'}
                                </span>
                                {!n.read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                {n.message}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">
                                {formatDate(n.created_at)} — {n.recipient}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
                <div className="p-2 border-t border-slate-100 text-center">
                  <button
                    onClick={handleOnaZote}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Ona taarifa zote
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PROFILE */}
          <div ref={profileRef} className="relative">
            <button
              onClick={toggleProfile}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100"
              aria-label="Wasifu"
            >
              <div className="w-8 h-8 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold leading-tight">
                  {user?.full_name || 'Mtumiaji'}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  {ROLE_LABEL[role]}
                </div>
              </div>
              <ChevronDown
                size={14}
                className="hidden md:block text-slate-400"
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-600 text-white grid place-items-center text-sm font-bold">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {user?.full_name || 'Mtumiaji'}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {user?.phone || '—'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-1">
                  <button
                    onClick={goToProfile}
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm rounded-lg hover:bg-slate-100"
                  >
                    <User size={16} className="text-slate-500" /> Wasifu Wangu
                  </button>
                  <button
                    onClick={goToSettings}
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm rounded-lg hover:bg-slate-100"
                  >
                    <Settings size={16} className="text-slate-500" />{' '}
                    Mipangilio
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm rounded-lg hover:bg-red-50 text-red-600"
                  >
                    <LogOut size={16} /> Toka (Logout)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ MODAL YA KUTOKA ============ */}
      {logoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setLogoutOpen(false)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 grid place-items-center mx-auto">
                <LogOutIcon size={26} className="text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mt-3">
                Toka Kwenye Akaunti?
              </h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Una uhakika unataka kutoka kwenye akaunti yako? Utahitaji
                kuingia tena.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLogoutOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
                >
                  Ghairi
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 inline-flex items-center justify-center gap-1.5"
                >
                  <LogOut size={14} />
                  Ndiyo, Toka
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

// ✅ memo inazuia re-render kama props hazibadiliki
export default memo(TopBarInner)