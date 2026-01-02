import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://argus-qa-orchestrator.vercel.app'
  ),

  title: {
    default: 'ARGUS | Neural Watchman',
    template: '%s | ARGUS',
  },
  description:
    'Autonomous AI-QA Orchestrator. Self-healing web automation, neural perception testing, and autonomous site reconnaissance.',
  keywords: [
    'AI QA Testing',
    'Autonomous Web Agent',
    'Self-healing Test Automation',
    'Neural Perception Testing',
    'ARGUS Neural Watchman',
    'AI-driven QA Orchestrator',
  ],
  openGraph: {
    title: 'ARGUS | Neural Watchman',
    description: 'The era of brittle scripts is over. Deploy the intelligence that never sleeps.',
    url: 'https://argus-qa-orchestrator.vercel.app',
    siteName: 'ARGUS Systems',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#2563eb', // Blue-600
          colorBackground: '#020617', // Slate-950 (Perfect for Argus background)
          colorText: '#f8fafc', // Slate-50
          colorInputBackground: '#0f172a', // Slate-900
          colorInputText: '#f8fafc',
        },
        elements: {
          // Hides "Powered by Clerk"
          footer: 'hidden',
          // Customizing the modal card to match your "StepCard" design
          card: 'bg-slate-950 border border-slate-800 shadow-[0_0_50px_-12px_rgba(37,99,235,0.2)]',
          headerTitle: 'text-white tracking-tighter uppercase font-black',
          headerSubtitle: 'text-slate-400 text-xs',
          socialButtonsBlockButton:
            'bg-slate-900 border-slate-800 hover:bg-slate-800 transition-all',
          formButtonPrimary:
            'bg-blue-600 hover:bg-blue-500 text-[10px] uppercase font-black tracking-widest',
        },
      }}
    >
      <html lang="en">
        <body className="bg-[#020617] text-white">{children}</body>
      </html>
    </ClerkProvider>
  )
}
