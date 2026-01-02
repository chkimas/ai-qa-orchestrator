import { Terminal } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 bg-blue-600/20 rounded-full animate-ping" />
        <div className="absolute w-16 h-16 bg-blue-500/10 rounded-full animate-pulse border border-blue-500/30" />

        <div className="relative z-10 p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl shadow-blue-500/10">
          <Terminal size={32} className="text-blue-500" />
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">
          Establishing Neural Link
        </span>
        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="w-full h-1/2 bg-linear-to-b from-transparent via-blue-500/5 to-transparent absolute -top-full animate-[scan_3s_linear_infinite]" />
      </div>
    </div>
  )
}
