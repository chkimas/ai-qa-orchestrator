import Link from 'next/link'
import { Terminal, ShieldAlert } from 'lucide-react'

export const metadata = {
  title: '404 | Signal Lost',
  robots: 'noindex, nofollow',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      {/* Visual Glitch Element */}
      <div className="relative mb-8">
        <ShieldAlert size={80} className="text-red-500/20 animate-pulse" />
        <Terminal className="absolute inset-0 m-auto text-blue-500" size={32} />
      </div>

      <h1 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase italic">
        Neural Path: <span className="text-red-500">Not Found</span>
      </h1>

      <p className="max-w-md text-slate-400 font-mono text-sm leading-relaxed mb-10">
        The requested coordinate does not exist within the ARGUS mission parameters. The Watchman
        cannot bridge to a ghost route.
      </p>

      <Link
        href="/dashboard"
        className="px-8 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-blue-500 transition-all border border-blue-400/20"
      >
        Return to Command
      </Link>
    </div>
  )
}
