import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | ARGUS Neural Watchman",
  description:
    "Legal terms and usage guidelines for the ARGUS AI-QA Orchestration platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="max-w-4xl mx-auto py-20 px-6">
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-slate-800">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-blue-500 font-mono uppercase tracking-wider">
            Last Updated: January 9, 2026
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            ARGUS_NEURAL_WATCHMAN_v1.2.0_STABLE
          </p>
        </div>

        <div className="space-y-12 leading-relaxed">
          {/* 1. Acceptance of Terms */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-400">
              By accessing or using ARGUS Neural Watchman (&quot;the
              Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, you may not use the Service.
              These terms constitute a legally binding agreement between you and
              ARGUS.
            </p>
          </section>

          {/* 2. Operational Authority */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              2. Operational Authority & AI Autonomy
            </h2>
            <p className="text-slate-400 mb-3">
              ARGUS is a neural-agentic platform provided{" "}
              <span className="text-white font-bold">AS-IS</span>. By deploying
              the &quot;Watchman,&quot; you acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
              <li>
                The AI agent operates autonomously within the parameters of your
                instructions
              </li>
              <li>
                Browser automation may produce unexpected behaviors on target
                systems
              </li>
              <li>
                We are not liable for unintended interactions, data
                modifications, or system impacts on target URLs
              </li>
              <li>
                You are solely responsible for all actions performed by deployed
                agents
              </li>
            </ul>
          </section>

          {/* 3. Ethical Use & Authorization */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              3. Ethical Auditing & Authorization
            </h2>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400 font-bold text-sm uppercase tracking-wide mb-2">
                Critical Compliance Requirement
              </p>
              <p className="text-slate-300 text-sm">
                Users are <strong>strictly permitted</strong> to deploy ARGUS
                only against applications they own or have explicit legal
                authorization to audit.
              </p>
            </div>
            <p className="text-slate-400 mb-3">
              The following activities are{" "}
              <span className="text-red-500 font-bold">PROHIBITED</span>:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
              <li>Unauthorized penetration testing or security auditing</li>
              <li>Malicious web scraping or data harvesting</li>
              <li>Distributed Denial of Service (DDoS) attacks</li>
              <li>
                Credential stuffing or brute-force authentication attempts
              </li>
              <li>
                Bypassing rate limits or terms of service of third-party
                platforms
              </li>
              <li>
                Testing against government, financial, or healthcare systems
                without proper authorization
              </li>
            </ul>
            <p className="text-yellow-500 text-sm mt-4 font-mono">
              Violation will result in immediate termination of service and may
              be reported to authorities.
            </p>
          </section>

          {/* 4. Security & Vault */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              4. Security & Vault Responsibility
            </h2>
            <p className="text-slate-400 mb-3">
              You maintain <strong>exclusive responsibility</strong> for your{" "}
              <span className="font-mono text-blue-400">VAULT_MASTER_KEY</span>.
              ARGUS utilizes zero-knowledge encryption architecture:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
              <li>API keys are encrypted client-side before transmission</li>
              <li>
                We cannot access, decrypt, or recover your stored credentials
              </li>
              <li>
                If the master key is lost, recovery of encrypted neural assets
                is <strong>mathematically impossible</strong>
              </li>
              <li>
                You are responsible for safeguarding your API keys and
                preventing unauthorized access
              </li>
            </ul>
          </section>

          {/* 5. AI Provider Usage */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              5. Third-Party AI Provider Usage
            </h2>
            <p className="text-slate-400 mb-3">
              ARGUS integrates with third-party AI providers (OpenAI, Google,
              Anthropic, Groq, Perplexity). You acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
              <li>
                You must comply with each provider&apos;s terms of service
              </li>
              <li>API usage costs are your sole responsibility</li>
              <li>
                Provider outages or rate limits may impact service availability
              </li>
              <li>
                Test execution data may be processed by provider infrastructure
                per their policies
              </li>
            </ul>
          </section>

          {/* 6. Data & Privacy */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              6. Data Collection & Privacy
            </h2>
            <p className="text-slate-400 mb-3">
              ARGUS stores execution logs, test configurations, and anonymized
              usage analytics. We do not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
              <li>Access decrypted API keys or credentials</li>
              <li>Store sensitive data from target websites</li>
              <li>Share user data with third parties without consent</li>
            </ul>
            <p className="text-slate-400 mt-3">
              Execution logs may contain URLs, selectors, and test metadata for
              debugging purposes.
            </p>
          </section>

          {/* 7. Service Availability */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              7. Service Availability & Support
            </h2>
            <p className="text-slate-400 mb-3">
              ARGUS is provided without uptime guarantees. We reserve the right
              to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
              <li>Perform maintenance or upgrades without notice</li>
              <li>Modify or discontinue features</li>
              <li>Impose usage limits or quotas</li>
              <li>Terminate accounts violating these terms</li>
            </ul>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              8. Limitation of Liability
            </h2>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-slate-300 text-sm mb-2">
                ARGUS IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY
                KIND. WE ARE NOT LIABLE FOR:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4 text-sm">
                <li>Damages caused by AI agent actions</li>
                <li>Data loss or system disruptions on target sites</li>
                <li>Third-party API failures or costs</li>
                <li>Loss of business, revenue, or data</li>
              </ul>
              <p className="text-slate-500 text-xs mt-3 font-mono">
                YOUR SOLE REMEDY IS DISCONTINUATION OF THE SERVICE.
              </p>
            </div>
          </section>

          {/* 9. Modifications */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              9. Modifications to Terms
            </h2>
            <p className="text-slate-400">
              We reserve the right to modify these terms at any time. Continued
              use of ARGUS after changes constitutes acceptance. Check this page
              regularly for updates.
            </p>
          </section>

          {/* 10. Governing Law */}
          <section>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              10. Governing Law
            </h2>
            <p className="text-slate-400">
              These terms are governed by applicable international laws.
              Disputes shall be resolved through binding arbitration.
            </p>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">
              Contact & Compliance
            </h2>
            <p className="text-slate-400 mb-2">
              For questions regarding these terms or to report violations:
            </p>
            <p className="text-blue-500 font-mono text-sm">
              legal@argus-watchman.ai
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-900 text-center">
          <p className="text-xs text-slate-600 font-mono uppercase tracking-widest">
            ARGUS Neural Watchman © 2026 • All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
