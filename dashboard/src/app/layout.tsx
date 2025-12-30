import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'VANGUARD | AI-QA Orchestrator',
  description: 'Self-Healing Cloud-Hybrid Test Automation Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-slate-950 text-slate-50 antialiased overflow-hidden">
          <div className="flex h-screen w-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900/20 via-slate-950 to-slate-950">
              {children}
            </div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}
