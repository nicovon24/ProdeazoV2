import { BarChart3, ChevronRight, Shield, Trophy, UsersRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

const LOGO_SRC = '/logo-mundial-2026.png'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/fixtures', label: 'Mi Prode' },
]

const features = [
  { title: 'Gratis', description: 'Sin costo para participar', icon: Shield },
  { title: 'Grupos', description: 'Competi con tus amigos', icon: UsersRound },
  { title: 'Ranking', description: 'Suma puntos y subi en el ranking', icon: BarChart3 },
  { title: 'Premios', description: 'Grandes premios para los mejores', icon: Trophy },
]

// Calcular días restantes hasta el 11 de junio de 2026
const KICKOFF = new Date('2026-06-11T00:00:00')
const DAYS_TO_KICKOFF = Math.max(0, Math.ceil((KICKOFF.getTime() - Date.now()) / 86400000))

export function Landing() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-mainBg text-primary">
      {/* Círculo azul header */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-30 h-[7.5rem] w-[10rem] rounded-bl-[6rem] bg-brand-blue sm:h-[9rem] sm:w-[13rem] sm:rounded-bl-[8rem] md:h-[10rem] md:w-[15rem] md:rounded-bl-[9rem] lg:h-64 lg:w-80 lg:rounded-bl-[18rem] xl:h-72 xl:w-96 xl:rounded-bl-[22rem]"
        aria-hidden
      />

      <header className="relative z-40 shrink-0 border-b border-white/10 bg-transparent">
        <div className="mx-auto flex h-14 w-full items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
          <Link to="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-4">
            <span className="relative block h-10 w-14 shrink-0 sm:h-14 sm:w-24">
              <img
                src={LOGO_SRC}
                alt=""
                className="h-full w-full object-contain object-left"
              />
            </span>
            <span className="hidden min-w-0 flex-col justify-center leading-none min-[360px]:flex">
              <span className="text-xs font-bold uppercase tracking-tight text-primary sm:text-base">
                Prodeazo
              </span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-tight text-brand-green sm:mt-1 sm:text-xs">
                FIFA 2026™
              </span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-5 text-sm font-bold text-secondary sm:flex sm:gap-6 md:gap-8"
            aria-label="Principal"
          >
            {navLinks.map((link) => (
              <Link key={link.label} to={link.href} className="transition-colors hover:text-primary">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {user ? (
              <button
                onClick={() => navigate('/fixtures')}
                className="rounded-full bg-brand-green px-2.5 py-2 text-[11px] font-bold text-black transition-[filter] hover:brightness-95 sm:px-4 sm:text-sm"
              >
                Mi Prode
              </button>
            ) : (
              <>
                <a
                  href={`${API_URL}/api/auth/google`}
                  className="rounded-full border border-white/30 bg-black px-2.5 py-2 text-[11px] font-bold text-primary transition-colors hover:border-brand-green sm:px-4 sm:text-sm"
                >
                  <span className="hidden min-[381px]:inline">Iniciar sesión</span>
                  <span className="inline min-[381px]:hidden">Entrar</span>
                </a>
                <a
                  href={`${API_URL}/api/auth/google`}
                  className="rounded-full bg-brand-green px-2.5 py-2 text-[11px] font-bold text-black transition-[filter] hover:brightness-95 sm:px-4 sm:text-sm"
                >
                  Crear cuenta
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:grid lg:grid-rows-[1fr_auto]">
        <section className="relative isolate flex flex-1 flex-col border-b border-white/10 bg-black lg:min-h-0 lg:overflow-hidden">
          {/* Bloques decorativos desktop */}
          <div
            className="pointer-events-none absolute right-0 top-0 z-[1] hidden h-full min-h-[20rem] w-[min(50%,34rem)] lg:block xl:w-[min(50%,38rem)]"
            aria-hidden
          >
            <div className="absolute bottom-0 right-0 h-[min(44%,18rem)] w-[min(20rem,46%)] bg-brand-heroRed xl:w-[min(22rem,46%)]" />
            <div className="absolute bottom-[26%] right-0 h-[min(38%,16rem)] w-[min(20rem,46%)] bg-brand-heroYellow xl:w-[min(22rem,46%)]" />
            <div className="absolute bottom-0 right-[min(20rem,42%)] h-[min(65%,26rem)] w-[min(32rem,82%)] rounded-tl-[min(20rem,14vw)] bg-brand-heroGreen xl:right-[min(22rem,42%)] xl:h-[min(68%,28rem)] xl:w-[min(36rem,84%)]" />
          </div>

          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-3 py-5 sm:gap-8 sm:px-6 sm:py-7 md:gap-10 md:py-8 lg:h-full lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-5 lg:px-6 lg:py-5 xl:gap-7">
            <div className="relative z-10 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-green sm:text-sm md:text-base">
                Faltan
              </p>
              <h1 className="mt-2 text-[clamp(2.25rem,9vw,4.5rem)] font-bold leading-[0.92] text-primary sm:mt-3 sm:text-6xl md:text-7xl lg:text-[min(7rem,10vw)] xl:text-[min(8rem,9vw)]">
                <span className="block tabular-nums tracking-tight">{DAYS_TO_KICKOFF}</span>
                <span className="mt-2 block text-[clamp(1rem,3.8vw+0.35rem,2.25rem)] font-bold uppercase leading-tight text-primary sm:mt-4 sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  dias para el Mundial
                </span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary sm:mt-5 sm:text-base md:text-lg">
                Hace tu prode, competi con tus amigos y demostra quien sabe mas de futbol.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
                <a
                  href={user ? undefined : `${API_URL}/api/auth/google`}
                  onClick={user ? () => navigate('/fixtures') : undefined}
                  className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-green px-6 text-sm font-bold text-black transition-[filter] hover:brightness-95 sm:min-h-12 sm:w-auto sm:px-7 sm:text-base md:min-h-14 md:px-8 md:text-lg"
                >
                  Crear mi prode
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </a>
              </div>
            </div>

            <div className="relative z-10 flex min-h-[10.5rem] flex-1 items-center justify-center pb-3 sm:min-h-[13rem] sm:pb-4 md:min-h-[15rem] lg:min-h-0 lg:pb-0">
              {/* Bloques decorativos mobile */}
              <div className="pointer-events-none absolute bottom-4 right-1 h-28 w-28 bg-brand-heroGreen sm:bottom-6 sm:right-2 sm:h-36 sm:w-36 lg:hidden" aria-hidden />
              <div className="pointer-events-none absolute bottom-4 right-[6.5rem] h-28 w-28 bg-brand-heroYellow sm:bottom-6 sm:right-[8.5rem] sm:h-36 sm:w-36 lg:hidden" aria-hidden />
              <div className="pointer-events-none absolute bottom-4 right-1 h-8 w-28 translate-y-28 bg-brand-heroRed sm:bottom-6 sm:h-10 sm:w-36 sm:translate-y-36 lg:hidden" aria-hidden />

              <div className="relative flex w-full max-w-[min(100%,28rem)] flex-col items-center px-1 sm:px-2">
                <div className="relative aspect-square w-[min(100%,20rem)] sm:w-80 md:w-[22rem] lg:w-[min(26rem,46vw)] xl:w-[32rem]">
                  <img
                    src={LOGO_SRC}
                    alt="Prodeazo FIFA 2026"
                    className="h-full w-full object-contain drop-shadow-[0_0_55px_rgba(204,255,0,0.22)]"
                  />
                </div>
                <p className="-mt-0.5 text-center text-[clamp(1.75rem,7vw,3rem)] font-bold uppercase leading-none text-primary sm:text-5xl md:text-6xl xl:text-7xl">
                  Prodeazo
                </p>
                <p className="mt-2 text-center text-base font-bold uppercase leading-none text-brand-green sm:mt-3 sm:text-xl md:text-2xl xl:text-3xl">
                  FIFA 2026
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="shrink-0 bg-black pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 border-x border-white/10 px-3 sm:grid-cols-2 sm:px-4 md:px-6 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="flex min-h-[4.75rem] gap-3 border-b border-white/10 py-3.5 sm:min-h-[5.25rem] sm:gap-4 sm:py-4 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-white/10 sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-child(n+3)]:border-b-0 lg:min-h-[5.75rem] lg:border-b-0 lg:border-r lg:border-white/10 lg:px-5 lg:py-5 lg:last:border-r-0 xl:min-h-[6.25rem] xl:px-7 xl:py-6"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand-green/40 bg-black md:h-14 md:w-14">
                    <Icon className="h-6 w-6 text-brand-green md:h-7 md:w-7" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-wide text-primary md:text-base">
                      {feature.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-muted md:text-base md:leading-7">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
