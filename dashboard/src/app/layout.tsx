import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/app/components/Sidebar' // <--- Import

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI QA Orchestrator',
  description: 'Self-Healing Test Automation',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen flex`}>
        {/* Sidebar Fixed to Left */}
        <Sidebar />

        {/* Main Content Area (Pushed right by 16rem/64px) */}
        <div className="flex-1 ml-64">{children}</div>
      </body>
    </html>
  )
}
