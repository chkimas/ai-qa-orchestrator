"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Archive,
  Radar,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { getRiskHeatmap, RiskItem } from "@/lib/actions";
import RiskHeatmap from "./RiskHeatmap";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [heatmapData, setHeatmapData] = useState<RiskItem[]>([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(true);

  useEffect(() => {
    async function loadHeatmap() {
      try {
        setIsLoadingHeatmap(true);
        const data = await getRiskHeatmap();
        setHeatmapData(data);
      } catch (error) {
        console.error("Failed to load heatmap:", error);
        setHeatmapData([]);
      } finally {
        setIsLoadingHeatmap(false);
      }
    }
    loadHeatmap();
  }, [pathname]);

  const getActiveStyles = (path: string) => {
    return pathname === path
      ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]"
      : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent";
  };

  return (
    <aside
      className={`relative h-screen flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition-all shadow-xl"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div
        className={`flex items-center gap-3 p-6 mb-4 ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-900/40 border border-blue-400/20">
          <Eye className="h-5 w-5 text-white" />
        </div>

        {!isCollapsed && (
          <div className="animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
            <h1 className="font-black text-white tracking-tighter text-xl leading-none">
              ARGUS
            </h1>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.3em] mt-1">
              Neural Watchman
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
          href="/dashboard"
          icon={<LayoutDashboard size={18} />}
          label="Mission Control"
          active={getActiveStyles("/dashboard")}
          collapsed={isCollapsed}
        />
        <NavItem
          href="/crawler"
          icon={<Radar size={18} />}
          label="Recon Scout"
          active={getActiveStyles("/crawler")}
          collapsed={isCollapsed}
        />
        <NavItem
          href="/registry"
          icon={<Archive size={18} />}
          label="Golden Library"
          active={getActiveStyles("/registry")}
          collapsed={isCollapsed}
        />
        <NavItem
          href="/settings"
          icon={<Settings size={18} />}
          label="System Config"
          active={getActiveStyles("/settings")}
          collapsed={isCollapsed}
        />

        {!isCollapsed && (
          <div className="mt-10 px-3 mb-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] flex items-center gap-2">
            <ShieldAlert size={12} className="text-red-500/70" /> Logic
            Stability
          </div>
        )}

        {!isCollapsed && !isLoadingHeatmap && heatmapData.length > 0 && (
          <div className="px-1 animate-in slide-in-from-bottom-2 duration-500">
            <RiskHeatmap data={heatmapData} />
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-900 bg-slate-900/20">
        <div
          className={`flex items-center gap-3 rounded-xl px-2 py-2 mb-2 transition-colors ${
            isCollapsed
              ? "justify-center"
              : "bg-slate-900/40 border border-slate-800"
          }`}
        >
          <UserButton afterSignOutUrl="/" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-200 truncate">
                {user?.fullName || "Operator"}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">
                Verified Node
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: string;
  collapsed: boolean;
}

function NavItem({ href, icon, label, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${active} ${
        collapsed ? "justify-center" : ""
      }`}
      title={collapsed ? label : undefined}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && (
        <span className="font-semibold text-sm tracking-tight whitespace-nowrap">
          {label}
        </span>
      )}
    </Link>
  );
}
