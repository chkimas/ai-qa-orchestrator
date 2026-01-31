# 👁️ ARGUS: The Intelligence That Never Sleeps

![Status: Production-Grade](https://img.shields.io/badge/Status-Production--Grade-blue?style=for-the-badge)
![Security: AES-256-CBC](https://img.shields.io/badge/Security-AES--256--CBC-green?style=for-the-badge)
![Intelligence: Multi--Model](https://img.shields.io/badge/Intelligence-Multi--Model-blueviolet?style=for-the-badge)
![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-yellowgreen?style=for-the-badge)

**ARGUS** is an autonomous, full-stack **Neural Watchman** designed for the modern web ecosystem. Moving beyond brittle, selector-based scripts, ARGUS utilizes a **Multi-Model Neural Core** to perceive, reason, and heal web automation in real-time.

---

## 🖼️ System Interface

### 🌌 The Watchman Landing

![Landing Page](https://i.ibb.co/qLcJVxSD/image.png)
_High-impact hero section featuring "The Intelligence That Never Sleeps" typography._

### 📊 Tactical Command (Sniper)

![Dashboard](https://i.ibb.co/MxBKD2NP/image.png)
_Real-time mission monitoring with **Live Telemetry Streams** (via Supabase Realtime) and the **Predictive Risk Heatmap**._

### 🕷️ Autonomous Recon (Scout)

![Scout Recon](https://i.ibb.co/Df7BmB8s/image.png)
_Visualization of the autonomous spider mapping application routes and capturing UI state fingerprints._

---

## 🛡️ Tactical Mission Modules

### 🎯 Sniper Mode

Natural language intent to deterministic execution. Features **Neural Healing** to autonomously re-map broken selectors using your chosen AI engine (Groq/Gemini/Claude/OpenAI).

**Key Features:**

- Risk-aware test planning from historical failure patterns
- AI-powered selector healing with visual audit trail
- Screenshot capture (before/during/after healing)
- Promotes successful runs to Golden Path Registry

### 👁️ Scout Mode

Autonomous "Spider" that maps routes, captures UI state, and identifies **Brittle Zones** without human intervention.

**Capabilities:**

- Discovers up to 20 pages per mission
- Generates predictive stability heatmaps
- Produces tactical audit PDFs with neural insights
- Auto-login detection for authenticated routes

### 🔥 Chaos Protocol _(Coming Soon)_

Adversarial testing via AI-generated destructive payloads (XSS, SQLi, overflows) and stochastic UI interactions to find system breaking points.

### 🔄 Behavioral Replay

Promote successful "Sniper" missions to the **Golden Path Registry** for continuous regression monitoring.

---

## 📸 High-Fidelity Evidence Pipeline

ARGUS documents every mission with **forensic precision**:

- **Visual Trace**: Screenshots captured before, during, and after every action
- **Healing Audit**: Documents "Broken State" → "Healed State" transitions
- **Binary Storage**: Direct upload to Supabase Storage as raw PNG bytes
- **Auto-Purge**: Scheduled Postgres Cron Job removes binaries older than 7 days

---

## 🧠 The Watchman Stack

| Layer                | Technology                                | Provider                           |
| :------------------- | :---------------------------------------- | :--------------------------------- |
| **Neural Core**      | Gemini 2.0, Claude 3.5, Llama 3.3, GPT-4o | Google / Anthropic / Groq / OpenAI |
| **Orchestration**    | Python 3.11, FastAPI (Uvicorn)            | Hugging Face Spaces                |
| **Automation**       | Playwright (Stealth Chromium)             | Python Worker                      |
| **Intelligence Hub** | Next.js 16 (Turbopack), Tailwind 4        | Vercel                             |
| **Persistence**      | PostgreSQL, Realtime, Storage             | Supabase                           |
| **Authentication**   | Middleware Security                       | Clerk                              |

---

## 🔒 Security: The Vault Pattern

ARGUS implements a strict **Zero-Knowledge Vault Handshake**. Your AI provider keys are encrypted at the browser level using **AES-256-CBC** before storage.

1. **At Rest:** Keys exist only as encrypted blobs in Supabase
2. **In Transit:** Worker receives encrypted payload via secure Base64 encoding
3. **In Memory:** Python Worker decrypts keys only during API calls using your `VAULT_MASTER_KEY`

---

## ⚙️ Monorepo Architecture

Structured as a **PNPM Workspace** for unified dependency management:

```
ai-qa-orchestrator/
├── pnpm-workspace.yaml    # Workspace configuration
├── package.json           # Root workspace scripts
├── ai/                    # Neural Logic & PDF Reporting
│   ├── analyzer.py        # Risk scoring & heatmap generation
│   ├── crawler.py         # Autonomous Scout spider
│   ├── healer.py          # AI-powered selector healing
│   ├── planner.py         # Risk-aware test plan generation
│   ├── provider.py        # Multi-model AI gateway
│   ├── reporter.py        # Tactical PDF report generation
│   └── vault.py           # AES-256 encryption/decryption
├── automation/            # Playwright Execution Core
│   └── core/
│       └── runner.py      # Test execution with screenshots
├── data/                  # Supabase Bridge
│   └── supabase_client.py # Database ops & binary uploads
├── configs/               # System Configuration
│   └── settings.py        # Centralized settings
└── dashboard/             # Next.js 16 Command Center
    ├── src/
    │   ├── app/           # App Router pages
    │   ├── components/    # React components
    │   ├── lib/           # Supabase client & utilities
    │   └── types/         # TypeScript definitions
    └── supabase/
        └── migrations/    # Database schema & RLS policies
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PNPM 9+
- Supabase Project with Storage buckets: `screenshots`, `reports`

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/ai-qa-orchestrator.git
cd ai-qa-orchestrator

# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies (workspace)
pnpm install

# Set up environment variables
cp .env.example .env
cp dashboard/.env.local.example dashboard/.env.local

# Run database migrations
cd dashboard
supabase db push

# Start the worker (Python backend)
cd ..
python worker_api.py

# Start the dashboard (Next.js frontend)
pnpm dev
```

### Environment Variables

**Root `.env` (Python Worker):**

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
VAULT_MASTER_KEY=your_32_byte_base64_key
```

**`dashboard/.env.local` (Next.js):**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
WEBHOOK_SECRET=your_clerk_webhook_secret
```

---

## 📊 Key Features

### 🎯 Risk-Aware Test Planning

- Historical failure analysis guides selector strategy
- Brittle pages receive semantic selector recommendations
- Stability scores calculated from execution telemetry

### 🩹 Neural Self-Healing

- AI analyzes DOM snapshots when selectors fail
- Generates alternative selectors with reasoning
- Visual audit trail shows before/after states

### 📈 Predictive Heatmaps

- Real-time risk scoring for all monitored pages
- Color-coded stability indicators (🟢 🟡 🔴)
- Actionable recommendations for each risk level

### 📄 Tactical Audit Reports

- Professional PDF with branded header/footer (Argus Neural Watchman)
- Executive metrics dashboard (4-card KPI grid)
- AI-generated insights and critical findings
- Complete execution trace with visual evidence
- Stability scoring and risk heatmap integration

---

## ⚠️ Infrastructure Notes (Free Ecosystem)

This project is optimized for the **Free Tier** ecosystem:

- **Hugging Face Spaces**: Worker nodes use `gunicorn` with 600s timeout. First request triggers ~30s cold start after sleep.
- **Supabase Realtime**: Telemetry streaming via `execution_logs` table. Free up to 200 concurrent users.
- **Storage Auto-Purge**: Postgres Cron Job removes screenshots older than 7 days to maintain zero-cost footprint.
- **Rate Limits**: Performance tied to your AI provider's RPM (Requests Per Minute) limits.

### Recommended Free Tier Providers

- **Groq**: 14,400 RPM for llama-3.1-8b-instant
- **Google AI Studio**: 15 RPM for gemini-2.0-flash-exp
- **Anthropic**: 5 RPM for claude-3-5-haiku (trial tier)

---

## 🔧 Tech Stack Highlights

- **ReportLab**: Custom PDF generation with tactical branding
- **Playwright**: Stealth browser automation with anti-detection
- **Next.js 16**: App Router with Turbopack for instant dev refresh
- **Supabase Realtime**: Live log streaming via PostgreSQL LISTEN/NOTIFY
- **Row-Level Security**: User-scoped data isolation with Clerk integration

---

## 📜 License

**Apache License 2.0**

Copyright © 2026 Christian Kim P. Asilo

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

### Commercial Support

For enterprise deployment, custom integrations, or priority support, contact: **asilochkimas@gmail.com**

---

_Designed for the Intelligence That Never Sleeps._ 👁️⚡
