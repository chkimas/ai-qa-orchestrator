import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | ARGUS Neural Watchman',
  description: 'Legal terms and usage guidelines for the ARGUS AI-QA Orchestration platform.',
}

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 text-slate-300">
      <h1 className="text-4xl font-black text-white mb-8 tracking-tighter">TERMS OF SERVICE</h1>
      <p className="text-sm text-blue-500 mb-10 font-mono">LAST UPDATED: JANUARY 2026</p>

      <div className="space-y-8 font-medium leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">
            1. Operational Authority
          </h2>
          <p>
            ARGUS is a neural-agentic platform provided as-is. By deploying the
            &quot;Watchman,&quot; you acknowledge that the AI agent operates autonomously within the
            parameters of your instructions. We are not liable for unintended interactions on target
            URLs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">
            2. Ethical Auditing
          </h2>
          <p>
            Users are strictly permitted to deploy ARGUS only against applications they own or have
            explicit legal authorization to audit. Use of the system for malicious scraping,
            unauthorized penetration testing, or DDOS activities will result in immediate
            termination of the Neural Link.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">
            3. Security & Vault Responsibility
          </h2>
          <p>
            You maintain exclusive responsibility for your <strong>VAULT_MASTER_KEY</strong>. ARGUS
            utilizes zero-knowledge encryption; if the master key is lost, recovery of encrypted
            neural assets is mathematically impossible.
          </p>
        </section>
      </div>
    </div>
  )
}
