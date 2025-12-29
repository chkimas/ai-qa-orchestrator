'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Play, Settings, Activity } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
      ? 'bg-slate-800 text-white shadow-lg'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
  }

  return (
    <aside className="w-64 bg-slate-950 min-h-screen flex flex-col border-r border-slate-900 fixed left-0 top-0">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-900/50">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-blue-900/20 shadow-xl">
          <Activity className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-tight">Orchestrator</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
            Control Plane
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Main
        </div>

        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive(
            '/'
          )}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="font-medium text-sm">Run History</span>
        </Link>

        {/* Placeholder for future Saved Tests feature */}
        <Link
          href="/registry"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive(
            '/registry'
          )}`}
        >
          <Play className="w-4 h-4" />
          <span className="font-medium text-sm">Saved Cases</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-900/50">
        <div className="flex items-center gap-3 px-3 py-2 text-slate-500">
          <Settings className="w-4 h-4" />
          <span className="text-xs font-mono">v1.1.0 Stable</span>
        </div>
      </div>
    </aside>
  )
}
