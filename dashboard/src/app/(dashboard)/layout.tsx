import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900/10 via-slate-950 to-slate-950">
        {children}
      </div>
    </div>
  )
}
