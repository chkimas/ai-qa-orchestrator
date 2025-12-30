import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/app/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI QA Orchestrator',
  description: 'Self-Healing Test Automation Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* 1. 'flex': Makes Sidebar and Content sit side-by-side
        2. 'h-screen': Ensures full height
        3. 'overflow-hidden': Prevents double scrollbars
      */}
      <body className={`${inter.className} bg-slate-950 flex h-screen overflow-hidden`}>
        {/* Sidebar is no longer fixed, it sits in the flex flow */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full relative overflow-y-auto">{children}</div>
      </body>
    </html>
  )
}
