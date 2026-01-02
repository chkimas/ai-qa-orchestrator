'use client'

import { useEffect, useMemo, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { ISourceOptions } from '@tsparticles/engine'

export function PCBParticles() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async engine => {
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  const options: ISourceOptions = useMemo(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    return {
      fullScreen: { enable: false },
      detectRetina: true,
      fpsLimit: 60,
      background: { color: { value: 'transparent' } },

      particles: {
        number: { value: 46, density: { enable: true } },

        // Use only your existing values:
        color: { value: 'rgba(59, 130, 246, 0.15)' },

        links: {
          enable: true,
          // Use only your existing value:
          color: 'rgba(37,99,235,0.4)',
          distance: 150,
          opacity: 1,
          width: 1,
        },

        move: {
          enable: !reduceMotion,
          speed: 0.6,
          direction: 'none',
          outModes: { default: 'out' },
        },

        opacity: { value: 1 },
        size: { value: { min: 1, max: 2 } },
        shape: { type: 'circle' },
      },
    }
  }, [])

  if (!ready) return null

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <Particles id="pcb-particles" options={options} className="absolute inset-0" />
    </div>
  )
}
