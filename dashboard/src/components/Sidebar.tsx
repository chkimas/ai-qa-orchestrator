'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs' // Added Clerk hooks
import {
  LayoutDashboard,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  Archive,
  Radar,
  ShieldAlert,
  Terminal,
} from 'lucide-react'
import { getRiskHeatmap, RiskItem } from '@/lib/actions'
import RiskHeatmap from './RiskHeatmap'

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  active: string
  collapsed: boolean
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser() // Get Clerk user data
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [heatmapData, setHeatmapData] = useState<RiskItem[]>([])

  useEffect(() => {
    async function loadHeatmap() {
      const data = await getRiskHeatmap()
      setHeatmapData(data)
    }
    loadHeatmap()
  }, [pathname])

  const getActiveStyles = (path: string) => {
    return pathname === path
      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
      : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
  }

  return (
    <aside
      className={`
        relative h-screen flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition-all shadow-xl"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Brand Section */}
      <div className={`flex items-center gap-3 p-6 mb-4 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40">
          <Zap className="h-5 w-5 text-white fill-white" />
        </div>

        {!isCollapsed && (
          <div className="animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
            <h1 className="font-black text-white tracking-tighter text-lg leading-none">
              VANGUARD
            </h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mt-1">
              AI-Orchestrator
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto custom-scrollbar">
        {!isCollapsed && (
          <div className="px-3 mb-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em]">
            Operations
          </div>
        )}

        <NavItem
          href="/"
          icon={<LayoutDashboard size={18} />}
          label="Mission Control"
          active={getActiveStyles('/')}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/crawler"
          icon={<Radar size={18} />}
          label="Recon Scout"
          active={getActiveStyles('/crawler')}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/registry"
          icon={<Archive size={18} />}
          label="Golden Library"
          active={getActiveStyles('/registry')}
          collapsed={isCollapsed}
        />

        {/* Added Settings Link */}
        <NavItem
          href="/settings"
          icon={<Settings size={18} />}
          label="System Config"
          active={getActiveStyles('/settings')}
          collapsed={isCollapsed}
        />

        {/* Intelligence Section */}
        {!isCollapsed && (
          <div className="mt-10 px-3 mb-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] flex items-center gap-2">
            <ShieldAlert size={12} className="text-red-500/70" /> Intelligence
          </div>
        )}

        {!isCollapsed && heatmapData.length > 0 && (
          <div className="px-1 animate-in slide-in-from-bottom-2 duration-500">
            <RiskHeatmap data={heatmapData} />
          </div>
        )}
      </nav>

      {/* Footer / Profile Section */}
      <div className="p-4 border-t border-slate-900 bg-slate-900/20">
        <div
          className={`flex items-center gap-3 rounded-xl px-2 py-2 mb-2 transition-colors ${
            isCollapsed ? 'justify-center' : 'bg-slate-900/40 border border-slate-800'
          }`}
        >
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-8 h-8 rounded-lg border border-slate-700 shadow-sm',
              },
            }}
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 animate-in fade-in duration-500">
              <span className="text-xs font-bold text-slate-200 truncate">
                {user?.username || user?.firstName || 'Operator'}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">
                Verified Node
              </span>
            </div>
          )}
        </div>

        <div
          className={`flex items-center gap-3 px-3 py-1 text-slate-600 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Terminal size={14} />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-[10px] font-mono leading-none">NODE_READY</span>
              <span className="text-[8px] mt-1 tracking-widest opacity-50 uppercase">
                v1.2.0-STABLE
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function NavItem({ href, icon, label, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200
        ${active}
        ${collapsed ? 'justify-center' : ''}
      `}
      title={collapsed ? label : undefined}
    >
      <div className="shrink-0">{icon}</div>

      {!collapsed && (
        <span className="font-semibold text-sm tracking-tight whitespace-nowrap">{label}</span>
      )}
    </Link>
  )
}
