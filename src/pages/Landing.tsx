
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  LogIn,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Package,
  Receipt,
  Users,
  TrendingUp,
  Wallet,
  HandCoins,
  Building2,
  Lock,
  ChevronRight,
  ShoppingCart,
  Briefcase,
  Crown,
} from 'lucide-react'

import Footer from '../components/Footer'

// ============================================================
// LANDING PAGE
// ============================================================

export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ======================================================
          NAVBAR
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">

          {/* BRAND */}
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white grid place-items-center font-bold text-lg shrink-0">
              S
            </div>

            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm leading-tight truncate">
                SUNRISE GLASSES
              </div>

              <div className="font-bold text-xs sm:text-sm leading-tight truncate">
                & ALUMINIUM PROFILES
              </div>

              <div className="text-[10px] text-slate-500 leading-tight truncate">
                Duka la Vifaa vya Ujenzi
              </div>
            </div>
          </Link>

          {/* NAVIGATION ACTIONS */}
          <div className="flex items-center gap-2 shrink-0">

            <Link
              to="/forgot-password"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-brand-600 rounded-lg hover:bg-slate-50 transition"
            >
              <KeyRound size={14} />
              Umesahau Nywila?
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 border border-brand-600 text-brand-600 rounded-lg text-xs sm:text-sm font-semibold hover:bg-brand-50 transition"
            >
              <UserPlus size={14} />
              Jisajili
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-brand-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-brand-700 transition"
            >
              <LogIn size={14} />
              Ingia
            </Link>

          </div>
        </div>
      </header>


      {/* ======================================================
          HERO SECTION
      ====================================================== */}

      <section className="border-b border-slate-100 bg-gradient-to-br from-white via-white to-brand-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 md:py-28">

          <div className="text-center max-w-4xl mx-auto">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-100 bg-brand-50 text-brand-700 text-[10px] sm:text-xs font-semibold mb-5">
              <Sparkles size={13} />
              Mfumo wa Kisasa wa Usimamizi wa Duka
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">

              Karibu{' '}

              <span className="text-brand-600">
                SUNRISE GLASSES
              </span>

              <br />

              <span className="text-brand-500">
                & ALUMINIUM PROFILES
              </span>

            </h1>

            <p className="text-slate-600 mt-5 sm:mt-7 text-sm sm:text-base md:text-lg leading-relaxed max-w-3xl mx-auto">
              Mfumo kamili wa kusimamia duka la vifaa vya ujenzi.
              Dhibiti mauzo, stoki, wateja, wafanyakazi, mishahara,
              faida na ripoti zako — vyote katika mfumo mmoja.
            </p>

            {/* HERO ACTIONS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-8 sm:mt-10">

              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl text-sm sm:text-base font-semibold hover:bg-brand-700 shadow-sm transition"
              >
                <UserPlus size={18} />
                Fungua Akaunti
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl text-sm sm:text-base font-semibold border border-slate-200 hover:border-brand-300 hover:bg-slate-50 transition"
              >
                <LogIn size={18} />
                Ingia Kwenye Akaunti
              </Link>

            </div>

            <p className="text-xs text-slate-400 mt-4">
              Jisajili kama mteja au muuzaji na uthibitishe namba yako ya simu.
            </p>

          </div>
        </div>
      </section>


      {/* ======================================================
          PORTALS SECTION
      ====================================================== */}

      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 md:py-20">

          <div className="text-center mb-10">

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-[10px] sm:text-xs font-semibold mb-3">
              <Sparkles size={12} />
              SUNRISE PORTALS
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Chagua Portal Yako
            </h2>

            <p className="text-slate-500 mt-2 max-w-2xl mx-auto text-xs sm:text-sm">
              Ingia kwenye portal inayohusiana na jukumu lako
              ili kupata huduma zinazokufaa.
            </p>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">

            <PortalCard
              to="/mteja"
              Icon={ShoppingCart}
              title="Mteja"
              desc="Nunua bidhaa, angalia quotation, orders na deni lako."
              badge="Mteja Portal"
            />

            <PortalCard
              to="/muuzaji"
              Icon={Briefcase}
              title="Muuzaji"
              desc="Simamia POS, risiti, bidhaa, wateja na mauzo ya duka."
              badge="Muuzaji Portal"
            />

            <PortalCard
              to="/mmiliki"
              Icon={Crown}
              title="Mmiliki"
              desc="Simamia maduka, faida, mishahara na ripoti za biashara."
              badge="Mmiliki Dashboard"
            />

          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Ufikiaji wa kila portal unategemea ruhusa za akaunti yako.
          </p>

        </div>
      </section>


      {/* ======================================================
          FEATURES SECTION
      ====================================================== */}

      <section className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 md:py-24">

          <div className="text-center mb-10 sm:mb-14">

            <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold mb-2">
              Vipengele vya Mfumo
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Kila Kitu Unachohitaji
            </h2>

            <p className="text-slate-500 mt-3 max-w-2xl mx-auto text-xs sm:text-sm">
              Teknolojia inayokusaidia kusimamia biashara yako
              kwa urahisi, usahihi na ufanisi.
            </p>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

            <FeatureCard
              Icon={Package}
              title="Usimamizi wa Stoki"
              desc="Fuatilia bidhaa, idadi ya bidhaa na mabadiliko ya stoki."
            />

            <FeatureCard
              Icon={Receipt}
              title="Mauzo na Risiti"
              desc="Fanya mauzo kwa haraka na toa risiti za kidijitali."
            />

            <FeatureCard
              Icon={Users}
              title="Wateja na Madeni"
              desc="Simamia taarifa za wateja, historia ya manunuzi na madeni."
            />

            <FeatureCard
              Icon={TrendingUp}
              title="Faida na Ripoti"
              desc="Pata taarifa za mapato, matumizi na faida ya biashara."
            />

            <FeatureCard
              Icon={Wallet}
              title="Mishahara"
              desc="Fuatilia mishahara na malipo ya wafanyakazi."
            />

            <FeatureCard
              Icon={HandCoins}
              title="Zaka na Sadaka"
              desc="Simamia hesabu na kumbukumbu za michango."
            />

            <FeatureCard
              Icon={Building2}
              title="Maduka Mengi"
              desc="Simamia shughuli za matawi mbalimbali kwa pamoja."
            />

            <FeatureCard
              Icon={ShieldCheck}
              title="Usalama"
              desc="Udhibiti wa ruhusa na kumbukumbu za shughuli za mfumo."
            />

          </div>
        </div>
      </section>


      {/* ======================================================
          REGISTRATION & AUTH SECTION
      ====================================================== */}

      <section className="border-b border-slate-100 bg-gradient-to-br from-brand-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">

            {/* LEFT SIDE */}
            <div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-100 bg-white text-brand-700 text-[10px] sm:text-xs font-semibold mb-4">
                <ShieldCheck size={13} />
                Anza Kutumia Mfumo
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                Tayari Kuanza?
              </h2>

              <p className="text-slate-600 mt-4 text-sm sm:text-base leading-relaxed">
                Fungua akaunti yako na uanze kutumia huduma za
                SUNRISE GLASSES & ALUMINIUM PROFILES.
                Unaweza kujisajili kama mteja au muuzaji.
                Utapokea OTP kwa simu yako kuthibitisha akaunti.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row flex-wrap gap-3">

                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition"
                >
                  <UserPlus size={17} />
                  Jisajili Sasa
                  <ArrowRight size={15} />
                </Link>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-slate-700 rounded-xl text-sm font-semibold border border-slate-200 hover:border-brand-300 transition"
                >
                  <LogIn size={17} />
                  Ingia
                </Link>

              </div>

            </div>


            {/* RIGHT SIDE */}
            <div className="space-y-3">

              <AuthLink
                to="/register"
                Icon={UserPlus}
                title="Fungua Akaunti"
                desc="Jisajili kama mteja au muuzaji"
              />

              <AuthLink
                to="/login"
                Icon={LogIn}
                title="Ingia Kwenye Akaunti"
                desc="Tumia namba yako ya simu na nywila"
              />

              <AuthLink
                to="/forgot-password"
                Icon={KeyRound}
                title="Umesahau Nywila?"
                desc="Omba OTP ili kurejesha akaunti yako"
              />

              <AuthLink
                to="/reset-password"
                Icon={Lock}
                title="Weka Nywila Mpya"
                desc="Badilisha nywila baada ya kuthibitisha OTP"
              />

              <AuthLink
                to="/reset-complete"
                Icon={CheckCircle2}
                title="Reset Imekamilika"
                desc="Rudi kuingia baada ya kubadilisha nywila"
              />

            </div>

          </div>
        </div>
      </section>


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <Footer />

    </div>
  )
}


// ============================================================
// PORTAL CARD
// ============================================================

function PortalCard({
  to,
  Icon,
  title,
  desc,
  badge,
}: {
  to: string
  Icon: React.ElementType
  title: string
  desc: string
  badge: string
}) {
  return (
    <Link
      to={to}
      className="group bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 hover:border-brand-500 hover:shadow-lg transition-all"
    >

      <div className="flex items-start justify-between gap-2">

        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 grid place-items-center shrink-0">
          <Icon size={22} />
        </div>

        <span className="text-[10px] uppercase font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 shrink-0">
          {badge}
        </span>

      </div>

      <div className="font-bold text-base mt-4 text-slate-900">
        {title}
      </div>

      <div className="text-sm text-slate-500 mt-2 leading-relaxed">
        {desc}
      </div>

      <div className="mt-5 flex items-center text-sm text-brand-600 font-semibold">

        Fungua Portal

        <ChevronRight
          size={16}
          className="ml-1 transition group-hover:translate-x-1"
        />

      </div>

    </Link>
  )
}


// ============================================================
// FEATURE CARD
// ============================================================

function FeatureCard({
  Icon,
  title,
  desc,
}: {
  Icon: React.ElementType
  title: string
  desc: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand-400 hover:shadow-md transition-all">

      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 grid place-items-center">
        <Icon size={21} />
      </div>

      <div className="font-semibold text-sm mt-4 text-slate-900">
        {title}
      </div>

      <div className="text-xs text-slate-500 mt-2 leading-relaxed">
        {desc}
      </div>

    </div>
  )
}


// ============================================================
// AUTH LINK
// ============================================================

function AuthLink({
  to,
  Icon,
  title,
  desc,
}: {
  to: string
  Icon: React.ElementType
  title: string
  desc: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50/30 transition group"
    >

      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 grid place-items-center shrink-0">
        <Icon size={19} />
      </div>

      <div className="flex-1 min-w-0">

        <div className="text-sm font-semibold text-slate-900">
          {title}
        </div>

        <div className="text-xs text-slate-500 mt-0.5">
          {desc}
        </div>

      </div>

      <ChevronRight
        size={17}
        className="text-slate-400 shrink-0 transition group-hover:translate-x-1 group-hover:text-brand-600"
      />

    </Link>
  )
}
