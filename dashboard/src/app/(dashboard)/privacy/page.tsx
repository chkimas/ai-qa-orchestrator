import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | ARGUS Neural Watchman',
  description: 'How ARGUS secures your Neural DNA and API Vault data using AES-256 encryption.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 text-slate-300">
      <h1 className="text-4xl font-black text-white mb-8 tracking-tighter">PRIVACY PROTOCOL</h1>
      <p className="text-sm text-blue-500 mb-10 font-mono">EFFECTIVE DATE: JANUARY 2026</p>

      <div className="space-y-8 font-medium leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">
            1. Zero-Knowledge Encryption
          </h2>
          <p>
            We do not store your raw AI Provider keys. All sensitive credentials undergo{' '}
            <strong>AES-256-CBC</strong> encryption at the client-side before entering our
            persistence layer. Our systems never see your keys in plain text.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">
            2. Neural Telemetry
          </h2>
          <p>
            Execution logs and DOM fingerprints are stored solely to provide{' '}
            <strong>Self-Healing</strong> capabilities and the{' '}
            <strong>Predictive Risk Heatmap</strong>. This data is siloed per user and is never used
            for multi-tenant training.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">
            3. Data Sovereignty
          </h2>
          <p>
            Your data is hosted via Supabase and processed by Vercel. We do not sell your telemetry
            to third-party brokers. Metadata is only shared with your chosen AI provider
            (Gemini/Groq) to facilitate mission execution.
          </p>
        </section>
      </div>
    </div>
  )
}
