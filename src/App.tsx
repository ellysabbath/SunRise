
import { Routes, Route, Navigate } from 'react-router-dom'

// ---------- SEO ----------
import SEO from './components/SEO'

// ---------- LAYOUT ----------
import Layout from './components/Layout'

// ---------- PUBLIC ----------
import Landing from './pages/Landing'

// ---------- AUTH ----------
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ResetComplete from './pages/auth/ResetComplete'
import VerifyPhone from './pages/auth/VerifyPhone'

// ---------- MTEJA ----------
import MtejaHome from './pages/mteja/MtejaHome'
import MtejaBidhaa from './pages/mteja/MtejaBidhaa'
import MtejaQuotation from './pages/mteja/MtejaQuotation'
import MtejaOrders from './pages/mteja/MtejaOrders'
import MtejaOrder from './pages/mteja/MtejaOrder'
import MtejaDeni from './pages/mteja/MtejaDeni'

// ---------- MUUZAJI ----------
import MuuzajiPOS from './pages/muuzaji/MuuzajiPOS'
import MuuzajiRisiti from './pages/muuzaji/MuuzajiRisiti'
import MuuzajiPokeaBidhaa from './pages/muuzaji/MuuzajiPokeaBidhaa'
import MuuzajiWateja from './pages/muuzaji/MuuzajiWateja'
import MuuzajiCarts from './pages/muuzaji/MuuzajiCarts'
import MuuzajiRipoti from './pages/muuzaji/MuuzajiRipoti'
import MuuzajiMatumizi from './pages/muuzaji/MuuzajiMatumizi'
import MuuzajiRipotiBidhaa from './pages/muuzaji/MuuzajiRipotiBidhaa'
import MuuzajiMshahara from './pages/muuzaji/MuuzajiMshahara'
import MuuzajiStoreManage from './pages/muuzaji/MuuzajiStoreManage'

// ---------- MMILIKI ----------
import MmilikiDashboard from './pages/mmiliki/MmilikiDashboard'
import MmilikiMaduka from './pages/mmiliki/MmilikiMaduka'
import MmilikiWafanyakazi from './pages/mmiliki/MmilikiWafanyakazi'
import MmilikiFaida from './pages/mmiliki/MmilikiFaida'
import MmilikiZaka from './pages/mmiliki/MmilikiZaka'
import MmilikiMauzo from './pages/mmiliki/MmilikiMauzo'
import MmilikiOrders from './pages/mmiliki/MmilikiOrders'
import MmilikiWateja from './pages/mmiliki/MmilikiWateja'
import MmilikiMatumizi from './pages/mmiliki/MmilikiMatumizi'
import MmilikiRipotiBidhaa from './pages/mmiliki/MmilikiRipotiBidhaa'
import MmilikiStoreManage from './pages/mmiliki/MmilikiStoreManage'
import MmilikiMishahara from './pages/mmiliki/MmilikiMishahara'
import UingizaVifaa from './pages/mmiliki/UingizaVifaa'
import RipotiMmiliki from './pages/mmiliki/RipotiMmiliki'
import MmilikiUsers from './pages/mmiliki/MmilikiUsers'
import MmilikiManageStock from './pages/mmiliki/MmilikiManageStock'

// ---------- SHARED ----------
import Notifications from './pages/shared/Notifications'
import NotificationDetail from './pages/shared/NotificationDetail'
import MyProfile from './pages/shared/MyProfile'
import MySettings from './pages/shared/MySettings'

// ==================================================================
// APP
// ==================================================================

export default function App() {
  return (
    <>
      {/* SEO MANAGEMENT */}
      <SEO />

      <Routes>
        {/* ================= PUBLIC ================= */}

        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/verify-phone" element={<VerifyPhone />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/reset-complete" element={<ResetComplete />} />

        {/* ================= MTEJA ================= */}

        <Route
          path="/mteja"
          element={
            <Layout
              role="mteja"
              allow={['mteja', 'admin', 'mmiliki']}
            />
          }
        >
          <Route index element={<MtejaHome />} />

          <Route path="bidhaa" element={<MtejaBidhaa />} />

          <Route path="quotation" element={<MtejaQuotation />} />

          <Route path="orders" element={<MtejaOrders />} />

          <Route path="order/:id" element={<MtejaOrder />} />

          <Route path="deni" element={<MtejaDeni />} />

          <Route
            path="profile"
            element={<MyProfile role="mteja" />}
          />

          <Route
            path="settings"
            element={<MySettings role="mteja" />}
          />

          <Route path="notifications" element={<Notifications />} />

          <Route
            path="notifications/:id"
            element={<NotificationDetail />}
          />
        </Route>

        {/* ================= MUUZAJI ================= */}

        <Route
          path="/muuzaji"
          element={
            <Layout
              role="muuzaji"
              allow={['muuzaji', 'mhazini', 'admin', 'mmiliki']}
            />
          }
        >
          <Route index element={<MuuzajiPOS />} />

          <Route path="risiti" element={<MuuzajiRisiti />} />

          <Route path="pokea" element={<MuuzajiPokeaBidhaa />} />

          <Route path="uingiza" element={<MuuzajiPokeaBidhaa />} />

          <Route path="wateja" element={<MuuzajiWateja />} />

          <Route path="carts" element={<MuuzajiCarts />} />

          <Route path="ripoti" element={<MuuzajiRipoti />} />

          <Route
            path="ripoti-bidhaa"
            element={<MuuzajiRipotiBidhaa />}
          />

          <Route
            path="store-manage"
            element={<MuuzajiStoreManage />}
          />

          <Route path="matumizi" element={<MuuzajiMatumizi />} />

          <Route path="mshahara" element={<MuuzajiMshahara />} />

          <Route
            path="profile"
            element={<MyProfile role="muuzaji" />}
          />

          <Route
            path="settings"
            element={<MySettings role="muuzaji" />}
          />

          <Route path="notifications" element={<Notifications />} />

          <Route
            path="notifications/:id"
            element={<NotificationDetail />}
          />
        </Route>

        {/* ================= MMILIKI ================= */}

        <Route
          path="/mmiliki"
          element={
            <Layout
              role="mmiliki"
              allow={['mmiliki', 'admin']}
            />
          }
        >
          <Route index element={<MmilikiDashboard />} />
          

          <Route path="maduka" element={<MmilikiMaduka />} />

          <Route path="users" element={<MmilikiUsers />} />

          <Route
            path="wafanyakazi"
            element={<MmilikiWafanyakazi />}
          />

          <Route
            path="mishahara"
            element={<MmilikiMishahara />}
          />

          <Route path="faida" element={<MmilikiFaida />} />

          <Route path="zaka" element={<MmilikiZaka />} />

          <Route path="mauzo" element={<MmilikiMauzo />} />

          <Route path="orders" element={<MmilikiOrders />} />

          <Route path="wateja" element={<MmilikiWateja />} />

          <Route path="matumizi" element={<MmilikiMatumizi />} />

          <Route
            path="ripoti-bidhaa"
            element={<MmilikiRipotiBidhaa />}
          />

          <Route
            path="store-manage"
            element={<MmilikiStoreManage />}
          />

          <Route path="ripoti" element={<RipotiMmiliki />} />

          <Route
            path="uingiza"
            element={<UingizaVifaa role="mmiliki" />}
          />
                  <Route
            path="safirisha"
            element={<MmilikiManageStock role="mmiliki" />}
          />

          <Route
            path="profile"
            element={<MyProfile role="mmiliki" />}
          />

          <Route
            path="settings"
            element={<MySettings role="mmiliki" />}
          />

          <Route path="notifications" element={<Notifications />} />

          <Route
            path="notifications/:id"
            element={<NotificationDetail />}
          />
        </Route>

        {/* ================= ADMIN ================= */}

        <Route
          path="/admin"
          element={
            <Layout
              role="mmiliki"
              allow={['admin']}
            />
          }
        >
          <Route
            index
            element={<Navigate to="uingiza" replace />}
          />

          <Route
            path="uingiza"
            element={<UingizaVifaa role="admin" />}
          />

          <Route path="notifications" element={<Notifications />} />

          <Route
            path="notifications/:id"
            element={<NotificationDetail />}
          />
        </Route>

        {/* ================= 404 ================= */}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

// ==================================================================
// NOT FOUND
// ==================================================================

function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 grid place-items-center p-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-black text-brand-600 mb-2">
          404
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Ukurasa Haupo
        </h1>

        <p className="text-sm text-slate-500 mb-6">
          Ukurasa uliouomba haupo au umehamishwa.
        </p>

        <a
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700"
        >
          Rudi Nyumbani
        </a>
      </div>
    </div>
  )
}
