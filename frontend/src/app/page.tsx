"use client";

import { BarChart3, ChevronRight, Shield, Trophy, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const LOGO_SRC = '/logo-mundial-2026.svg'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/fixture', label: 'Mi Prode' },
]

const features = [
  { title: 'Gratis', description: 'Sin costo para participar', icon: Shield },
  { title: 'Grupos', description: 'Competí con tus amigos', icon: UsersRound },
  { title: 'Ranking', description: 'Sumá puntos y subí en el ranking', icon: BarChart3 },
  { title: 'Premios', description: 'Grandes premios para los mejores', icon: Trophy },
]

const KICKOFF = new Date('2026-06-11T00:00:00')
const DAYS_TO_KICKOFF = Math.max(0, Math.ceil((KICKOFF.getTime() - Date.now()) / 86400000))

export default function Landing() {
  const router = useRouter()
  const user = null // TODO: Migrate Zustand useAuthStore

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      {/* Círculo azul header */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-30 h-[7.5rem] w-[10rem] rounded-bl-[6rem] bg-gradient-to-br from-[#001AAC] to-[#000a5e] sm:h-[9rem] sm:w-[13rem] sm:rounded-bl-[8rem] md:h-[10rem] md:w-[15rem] md:rounded-bl-[9rem] lg:h-64 lg:w-80 lg:rounded-bl-[18rem] xl:h-72 xl:w-96 xl:rounded-bl-[22rem]"
        aria-hidden
      />

      <header className="relative z-40 shrink-0 border-b border-white/10 bg-transparent">
        <div className="mx-auto flex h-16 w-full items-center justify-between gap-2 px-3 sm:h-[4.5rem] sm:gap-4 sm:px-6">
          <Link href="/" className="flex min-w-0 shrink items-center gap-0 pl-2 sm:pl-4 md:pl-8">
            <span className="relative block h-10 w-11 shrink-0 -ml-2 sm:h-14 sm:w-16 sm:-ml-1">
              <img
                src={LOGO_SRC}
                alt=""
                className="h-full w-full object-contain object-left select-none"
              />
            </span>
            <span className="hidden min-w-0 flex-col justify-center leading-none min-[360px]:flex select-none">
              <span className="text-xs font-bold uppercase tracking-tight text-foreground sm:text-base">
                Prodeazo
              </span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-tight text-green-normal sm:mt-1 sm:text-xs">
                FIFA 2026™
              </span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-5 text-sm font-bold text-foreground/70 sm:flex sm:gap-6 md:gap-8"
            aria-label="Principal"
          >
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="transition-colors hover:text-foreground select-none">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {user ? (
              <button
                onClick={() => router.push('/fixture')}
                className="rounded-full bg-primary px-2.5 py-2 text-[11px] font-bold text-black transition-all duration-200 hover:brightness-95 hover:scale-105 active:scale-95 active:translate-y-0.5 sm:px-4 sm:text-sm select-none"
              >
                Mi Prode
              </button>
            ) : (
              <>
                <a
                  href={`${API_URL}/api/auth/google`}
                  className="rounded-full border border-white/30 bg-black px-2.5 py-2 text-[11px] font-bold text-foreground transition-all duration-200 hover:border-primary hover:brightness-110 active:scale-95 active:translate-y-0.5 sm:px-4 sm:text-sm select-none"
                >
                  <span className="hidden min-[381px]:inline">Iniciar sesión</span>
                  <span className="inline min-[381px]:hidden">Entrar</span>
                </a>
                <a
                  href={`${API_URL}/api/auth/google`}
                  className="rounded-full bg-primary px-2.5 py-2 text-[11px] font-bold text-black transition-all duration-200 hover:brightness-95 hover:scale-105 active:scale-95 active:translate-y-0.5 sm:px-4 sm:text-sm select-none"
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
            <div className="absolute bottom-0 right-0 grid h-[min(65%,26rem)] w-[min(26rem,70%)] grid-cols-[minmax(0,1fr)_minmax(7.5rem,34%)] xl:h-[min(68%,28rem)] xl:w-[min(30rem,70%)] xl:grid-cols-[minmax(0,1fr)_minmax(9rem,34%)]">
              <div className="h-full rounded-tl-[min(16rem,14vw)] bg-gradient-to-br from-[#033F2D] to-[#021f1c]" />
              <div className="grid h-full grid-rows-[38%_1fr]">
                <div className="bg-gradient-to-tl from-[#AFE805] via-[#c4ed2b] to-[#9bd606]" />
                <div className="bg-gradient-to-br from-[#D50204] to-[#8a0103]" />
              </div>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-3 py-5 sm:gap-8 sm:px-6 sm:py-7 md:gap-10 md:py-8 lg:h-full lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-5 lg:px-6 lg:py-5 xl:gap-7">
            <div className="relative z-10 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-wide text-green-normal sm:text-sm md:text-base">
                Faltan
              </p>
              <h1 className="mt-2 text-[clamp(2.25rem,9vw,4.5rem)] font-bold leading-[0.92] text-foreground sm:mt-3 sm:text-6xl md:text-7xl lg:text-[min(7rem,10vw)] xl:text-[min(8rem,9vw)]">
                <span className="block tabular-nums tracking-tight">{DAYS_TO_KICKOFF}</span>
                <span className="mt-2 block text-[clamp(1rem,3.8vw+0.35rem,2.25rem)] font-bold uppercase leading-tight text-foreground sm:mt-4 sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                  días para el Mundial
                </span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/70 text-pretty sm:mt-5 sm:text-base md:text-lg">
                Hacé tu prode, competí con tus amigos y demostrá quién sabe más de fútbol.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
                <a
                  href={user ? undefined : `${API_URL}/api/auth/google`}
                  onClick={user ? () => router.push('/fixture') : undefined}
                  className="group inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-black transition-all duration-200 hover:brightness-95 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(175,232,5,0.4)] active:scale-[0.98] active:translate-y-0.5 sm:min-h-12 sm:w-auto sm:px-7 sm:text-base md:min-h-14 md:px-8 md:text-lg select-none"
                >
                  Crear mi prode
                  <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1 sm:h-6 sm:w-6" aria-hidden />
                </a>
              </div>
            </div>

            <div className="relative z-10 flex min-h-[10.5rem] flex-1 items-center justify-center pb-3 sm:min-h-[13rem] sm:pb-4 md:min-h-[15rem] lg:min-h-0 lg:pb-0">
              <div className="relative flex w-full max-w-[min(100%,28rem)] flex-col items-center px-1 sm:px-2">
                <div className="relative aspect-square w-[min(100%,12rem)] sm:w-52 md:w-60 lg:w-[min(18rem,32vw)] xl:w-72">
                  <img
                    src={LOGO_SRC}
                    alt="Prodeazo FIFA 2026"
                    className="h-full w-full object-contain drop-shadow-[0_0_25px_rgba(175,232,5,0.5)]"
                  />
                </div>
                <p className="mt-2 text-center text-[clamp(1.75rem,7vw,3rem)] font-bold uppercase leading-none text-foreground sm:mt-3 sm:text-5xl md:text-6xl xl:text-7xl select-none">
                  Prodeazo
                </p>
                <p className="mt-2 text-center text-base font-bold uppercase leading-none text-green-normal sm:mt-3 sm:text-xl md:text-2xl xl:text-3xl select-none">
                  FIFA 2026
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="shrink-0 bg-black pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto grid max-w-7xl grid-cols-1 border-x border-white/10 sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className={`flex min-h-[5.5rem] gap-4 border-b border-white/10 px-3 py-5 sm:min-h-[6rem] sm:gap-4 sm:px-6 sm:py-6 lg:px-4 lg:py-7 xl:py-8 ${index !== features.length - 1 ? 'lg:border-r lg:border-r-white/10' : ''}`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-black shadow-[0_0_15px_rgba(175,232,5,0.15)] md:h-14 md:w-14">
                    <Icon className="h-6 w-6 text-primary md:h-7 md:w-7" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-wide text-foreground md:text-base">
                      {feature.title}
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-foreground/70 text-pretty md:text-sm md:leading-6">
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
