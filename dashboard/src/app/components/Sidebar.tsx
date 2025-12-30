'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Database,
  Globe,
} from 'lucide-react'

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  active: string
  collapsed: boolean
}

export default function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isActive = (path: string) => {
    return pathname === path
      ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
  }

  return (
    <aside
      className={`
        relative h-screen flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Toggle Button (Floating on Border) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition shadow-sm"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand Header */}
      <div
        className={`flex items-center gap-3 p-6 border-b border-slate-800/50 ${
          isCollapsed ? 'justify-center' : ''
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-900/20">
          <Activity className="h-5 w-5 text-white" />
        </div>

        {!isCollapsed && (
          <div className="animate-in fade-in duration-200 overflow-hidden whitespace-nowrap">
            <h1 className="font-bold text-slate-100 tracking-tight">Orchestrator</h1>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              Control Plane
            </p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2 p-4">
        {!isCollapsed && (
          <div className="px-3 mb-2 text-xs font-semibold text-slate-600 uppercase tracking-wider animate-in fade-in">
            Main
          </div>
        )}

        <NavItem
          href="/"
          icon={<LayoutDashboard size={20} />}
          label="Run History"
          active={isActive('/')}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/crawler"
          icon={<Globe size={20} />}
          label="Crawl History"
          active={isActive('/crawler')}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/registry"
          icon={<Database size={20} />}
          label="Saved Cases"
          active={isActive('/registry')}
          collapsed={isCollapsed}
        />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/50">
        <div
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-colors hover:bg-slate-800/50 hover:text-slate-300 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Settings size={20} />
          {!isCollapsed && <span className="text-xs font-mono">v1.1.0 Stable</span>}
        </div>
      </div>
    </aside>
  )
}

// Helper Component for Cleaner JSX
function NavItem({ href, icon, label, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 group
        ${active}
        ${collapsed ? 'justify-center' : ''}
      `}
      title={collapsed ? label : undefined}
    >
      <div className="shrink-0">{icon}</div>

      {!collapsed && (
        <span className="font-medium text-sm whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
          {label}
        </span>
      )}
    </Link>
  )
}
