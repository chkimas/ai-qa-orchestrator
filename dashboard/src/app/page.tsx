'use client'

import React, { useEffect, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import {
  Eye,
  Target,
  Cpu,
  ChevronRight,
  Activity,
  Globe,
  Code2,
  Microscope,
  Zap,
} from 'lucide-react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { ISourceOptions } from '@tsparticles/engine'
import { SignInButton, SignUpButton } from '@clerk/nextjs'

function ArgusMythicBackground() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async engine => {
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  const options: ISourceOptions = useMemo(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    return {
      fullScreen: { enable: false },
      detectRetina: true,
      fpsLimit: 60,
      background: { color: { value: 'transparent' } },
      particles: {
        number: { value: 52, density: { enable: true } },
        color: { value: 'rgba(59, 130, 246, 0.15)' },
        links: {
          enable: true,
          color: 'rgba(37,99,235,0.4)',
          distance: 160,
          opacity: 1,
          width: 1,
        },
        move: {
          enable: !reduceMotion,
          speed: 0.45,
          direction: 'none',
          outModes: { default: 'out' },
        },
        opacity: { value: 1 },
        size: { value: { min: 1, max: 2 } },
        shape: { type: 'circle' },
      },
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {ready ? (
        <Particles id="argus-particles" options={options} className="absolute inset-0" />
      ) : null}

      <div className="absolute left-1/2 top-[7.6%] -translate-x-1/2 -translate-y-1/2 w-[min(980px,92vw)] opacity-60">
        <svg viewBox="0 0 1000 420" className="w-full h-auto">
          <defs>
            <radialGradient id="iris" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
              <stop offset="55%" stopColor="rgba(59, 130, 246, 0.15)" stopOpacity="1" />
              <stop offset="100%" stopColor="#05070a" stopOpacity="0" />
            </radialGradient>

            <clipPath id="eyeClip">
              <path d="M80 210 C 210 90, 380 60, 500 60 C 620 60, 790 90, 920 210 C 790 330, 620 360, 500 360 C 380 360, 210 330, 80 210 Z" />
            </clipPath>
          </defs>

          <path
            d="M80 210 C 210 90, 380 60, 500 60 C 620 60, 790 90, 920 210 C 790 330, 620 360, 500 360 C 380 360, 210 330, 80 210 Z"
            fill="transparent"
            stroke="rgba(59, 130, 246, 0.15)"
            strokeWidth="2"
          />

          <g clipPath="url(#eyeClip)">
            <circle cx="500" cy="210" r="150" fill="url(#iris)" />
            <circle
              cx="500"
              cy="210"
              r="44"
              fill="#05070a"
              className="origin-center animate-[argus-scan_9s_ease-in-out_infinite]"
            />
            <circle
              cx="500"
              cy="210"
              r="10"
              fill="#ffffff"
              opacity="0.35"
              className="origin-center animate-[argus-scan_9s_ease-in-out_infinite]"
            />
            <rect
              x="0"
              y="0"
              width="1000"
              height="420"
              fill="#05070a"
              opacity="0.22"
              className="origin-center animate-[argus-blink_7.5s_ease-in-out_infinite]"
              style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
            />
          </g>
        </svg>
      </div>

      <style jsx>{`
        @keyframes argus-scan {
          0%,
          100% {
            transform: translateX(-38px);
          }
          50% {
            transform: translateX(38px);
          }
        }
        @keyframes argus-blink {
          0%,
          92%,
          100% {
            transform: scaleY(0);
            opacity: 0;
          }
          94% {
            transform: scaleY(1);
            opacity: 1;
          }
          96% {
            transform: scaleY(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default function LandingPage() {
  const { isSignedIn } = useUser()
  const [latency, setLatency] = useState<number>(0)
  const [isScrolled, setIsScrolled] = useState(false)

  // FIX: Using useMemo to resolve "cascading render" ESLint error for setNodeLocation
  const nodeLocation = useMemo(() => {
    if (typeof window === 'undefined') return 'NODE_SYNCING'
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (zone.includes('Asia')) return 'NODE_ASIA_PACIFIC'
    if (zone.includes('America')) return 'NODE_NORTH_AMERICA'
    if (zone.includes('Europe')) return 'NODE_EUROPE_WEST'
    return 'NODE_GLOBAL_UPLINK'
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.performance) {
        const perf = window.performance.timing
        const loadTime = perf.loadEventEnd - perf.navigationStart
        const measuredLatency = loadTime > 0 ? Math.abs(loadTime % 100) : 24
        setLatency(measuredLatency)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#05070a] selection:bg-blue-500/30 overflow-x-hidden relative">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-lg focus:bg-black/90 focus:px-3 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        Skip to content
      </a>

      <ArgusMythicBackground />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-circuit opacity-20 pointer-events-none"
      />

      <div
        aria-hidden="true"
        className="absolute top-0 left-[15%] w-px h-full bg-linear-to-b from-transparent via-blue-500/10 to-transparent"
      >
        <div className="w-full h-32 bg-blue-500 shadow-[0_0_20px_blue] animate-pulse-line motion-reduce:animate-none" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-50">
        <nav aria-label="Primary" className="h-16">
          <div
            aria-hidden="true"
            className={`absolute left-0 right-0 top-0 h-16 border-b transition-all duration-300 ${
              isScrolled
                ? 'opacity-100 border-white/10 bg-black/70 backdrop-blur-md'
                : 'opacity-0 border-transparent bg-transparent'
            }`}
          />

          <div className="relative max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/20">
                <Eye className="text-white w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="font-black tracking-tighter text-xl text-white leading-none">
                  ARGUS
                </span>
                <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">
                  Neural Watchman
                </span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              {!isSignedIn ? (
                <>
                  <SignInButton mode="modal">
                    <button className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors cursor-pointer">
                      Sign In
                    </button>
                  </SignInButton>

                  <SignUpButton mode="modal">
                    <button className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-500 transition-all border border-blue-400/20 cursor-pointer">
                      Sign Up
                    </button>
                  </SignUpButton>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 bg-white/5 text-white text-[10px] font-black uppercase rounded-lg hover:bg-white/10 transition-all border border-white/10 backdrop-blur-md"
                >
                  Return to Ops
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        <section className="pt-52 pb-24 px-6 relative" aria-labelledby="hero-title">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 mb-8">
              <Activity size={12} className="text-blue-500 animate-pulse" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Autonomous Perception Node // Active
              </span>
            </div>

            <h1
              id="hero-title"
              className="text-5xl md:text-[6.2rem] font-[1000] text-white tracking-[-0.04em] mb-10 leading-[0.85] drop-shadow-2xl"
            >
              <span className="block text-transparent bg-clip-text bg-linear-to-b from-blue-300 via-blue-600 to-blue-800 pb-2">
                <span className="text-5xl md:text-[5rem] block mr-4">
                  THE INTELLIGENCE<span className="text-blue-400/50">,</span>
                </span>
                <span className="block md:text-[6.2rem]">
                  NEVER SLEEPS<span className="text-blue-600/80">.</span>
                </span>
              </span>
            </h1>

            <p className="max-w-xl mx-auto text-slate-400 text-sm md:text-base mb-14 leading-relaxed font-medium italic">
              The era of brittle scripts is over. A vigilant guardian now surveys, interprets, and
              mends your digital realm as it unfolds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
              <Link
                href="/sign-up"
                className="group h-14 px-10 bg-blue-600 text-white font-black uppercase text-[11px] tracking-[0.15em] rounded-xl flex items-center gap-2 hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/30"
              >
                Start Deployment{' '}
                <ChevronRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </Link>

              <button
                type="button"
                onClick={scrollToFeatures}
                className="h-14 px-10 border border-white/10 text-slate-400 font-black uppercase text-[11px] tracking-[0.15em] rounded-xl hover:bg-white/5 hover:text-white transition-all backdrop-blur-sm"
              >
                System Modules
              </button>
            </div>

            <section aria-label="Neural terminal handshake">
              <div className="max-w-4xl mx-auto rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-xl shadow-2xl group">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                  <div className="flex gap-2" aria-hidden="true">
                    <div className="w-3 h-3 rounded-full bg-white/10 group-hover:bg-red-500/50 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-white/10 group-hover:bg-yellow-500/50 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-white/10 group-hover:bg-green-500/50 transition-colors" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    WATCHMAN_LINK // SYNAPTIC_SESSION
                  </span>
                </div>

                <div className="p-8 font-mono text-left space-y-4 bg-black/20 rounded-b-2xl text-xs md:text-sm">
                  <p className="text-blue-500">$ argus link --neural-sync</p>
                  <p className="text-slate-500 italic text-xs">
                    [STATUS] Establishing Synaptic Connection... OK
                  </p>
                  <p className="text-slate-400 flex gap-4">
                    <span>01</span> ↳ Perception Active. Scanning target DOM structure...
                  </p>
                  <p className="text-slate-400 flex gap-4">
                    <span>02</span> ↳ Extracting Neural Fingerprints... SUCCESS
                  </p>
                  <p className="text-yellow-500 flex gap-4">
                    <span>03</span> [WARN] Logic Drift detected in &quot;Checkout_Flow&quot;
                  </p>
                  <p className="text-blue-400 flex gap-4">
                    <span>04</span> [HEAL] Baseline Integrity Restored via AI Synthesis
                  </p>
                  <p className="text-green-500 font-bold mt-4 tracking-tight uppercase">
                    [READY] Operational Superiority Confirmed.
                  </p>
                  <div
                    aria-hidden="true"
                    className="h-5 w-2 bg-blue-600 animate-pulse inline-block"
                  />
                </div>
              </div>
            </section>
          </div>
        </section>

        <section
          id="features"
          className="max-w-7xl mx-auto px-6 pb-40 pt-24"
          aria-label="Argus Modules"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Target size={24} />}
              title="Kinetic Reasoning"
              desc="Don’t merely run scripts — execute with purpose. The AI reasons through business logic with decisive precision."
            />
            <FeatureCard
              icon={<Cpu size={24} />}
              title="Auto-Adaptive Synthesis"
              desc="The DOM evolves, and ARGUS evolves with it. Neural fingerprints detect and remap broken paths autonomously."
            />
            <FeatureCard
              icon={<Zap size={24} />}
              title="Cognitive Backbone"
              desc="Unite the intelligence of Gemini, Groq, Anthropic, Sonar and OpenAI through a singular, coherent neural backbone."
            />
            <FeatureCard
              icon={<Microscope size={24} />}
              title="Omniscient Logging"
              desc="Complete observability: every action, every decision, every visual state meticulously recorded in the Watchman’s Vault."
            />
            <FeatureCard
              icon={<Eye size={24} />}
              title="Neural Perception"
              desc="Argus doesn't just read code; it perceives the interface. Computer vision uncovers even the subtlest logic regressions."
            />
            <FeatureCard
              icon={<Code2 size={24} />}
              title="Autonomous Recon"
              desc="Deploy autonomous scouts to chart your application landscape. ARGUS comprehends architecture without human guidance."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-black/90 py-6 px-8 flex flex-col sm:flex-row justify-between items-center gap-6 sticky bottom-0 backdrop-blur-xl z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse"
            />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
              Status: Optimal
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse" />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                {nodeLocation} {'//'} ACTIVE
              </span>
            </div>
            <div
              className="flex items-center gap-2 border-l border-white/5 pl-6"
              aria-live="polite"
            >
              <Globe size={10} className="text-slate-700" aria-hidden="true" />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                Uplink: {latency > 0 ? `${latency}ms` : 'Syncing...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            © 2026 ARGUS_NEURAL_SYSTEMS
          </span>
          <div className="flex items-center gap-1" aria-hidden="true">
            <div className="h-1 w-12 bg-blue-600/30 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  const descId = useId()

  return (
    <article
      aria-describedby={descId}
      className="min-h-55 rounded-2xl border border-white/10 bg-white/2 hover:bg-white/4 hover:border-blue-500/40 transition-all duration-500 group p-10 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner shrink-0">
          <span aria-hidden="true">{icon}</span>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-white font-bold text-base mb-3 uppercase tracking-tight">{title}</h3>
        <p id={descId} className="text-slate-500 text-sm leading-relaxed font-medium">
          {desc}
        </p>
      </div>
    </article>
  )
}
