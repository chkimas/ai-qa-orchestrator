# 👁️ ARGUS: The Intelligence That Never Sleeps

![Status: Production-Grade](https://img.shields.io/badge/Status-Production--Grade-blue?style=for-the-badge)
![Security: AES-256-CBC](https://img.shields.io/badge/Security-AES--256--CBC-green?style=for-the-badge)
![Intelligence: Multi--Model](https://img.shields.io/badge/Intelligence-Multi--Model-blueviolet?style=for-the-badge)

**ARGUS** is an autonomous, full-stack **Neural Watchman** designed for the modern web ecosystem. Moving beyond brittle, selector-based scripts, ARGUS utilizes a **Multi-Model Neural Core** to perceive, reason, and heal web automation in real-time.

---

## 🖼️ System Interface

### 🌌 The Watchman Landing

![Landing Page](https://i.ibb.co/qLcJVxSD/image.png)
_High-impact hero section featuring "The Intelligence, Never Sleeps" typography._

### 📊 Tactical Command (Dashboard)

![Dashboard](https://i.ibb.co/MxBKD2NP/image.png)
_Real-time mission monitoring with **Live Telemetry Streams** (via Supabase Realtime) and the Predictive Risk Heatmap._

### 🕷️ Autonomous Recon (Scout)

![Scout Recon](https://i.ibb.co/Df7BmB8s/image.png)
_Visualization of the autonomous spider mapping application routes and capturing UI state fingerprints._

---

## 🛡️ Tactical Mission Modules

- **🎯 Sniper Mode:** Natural language intent to deterministic execution. Features **Neural Healing** to re-map broken selectors autonomously using the chosen engine (Groq/Gemini/Claude).
- **👁️ Scout Mode:** Autonomous "Spider" that maps routes, captures UI state, and identifies "Brittle Zones" without human intervention.
- **🔥 Chaos Protocol:** Adversarial testing via AI-generated destructive payloads (XSS, SQLi, overflows) and stochastic UI interactions to find system breaking points.
- **🔄 Behavioral Replay:** Promote successful "Sniper" missions to the **Golden Path Registry** for continuous regression monitoring.

---

## 🧠 The Watchman Stack

| Layer                | Technology              | Provider (Free Tier) |
| :------------------- | :---------------------- | :------------------- |
| **Neural Core**      | Gemini, Groq, Llama 3.1 | Google / Groq Cloud  |
| **Orchestration**    | Python 3.11, FastAPI    | Hugging Face Spaces  |
| **Automation**       | Playwright (Chromium)   | Hugging Face Spaces  |
| **Intelligence Hub** | Next.js 16, TypeScript  | Vercel               |
| **Persistence**      | PostgreSQL, Realtime    | Supabase             |
| **Authentication**   | Middleware Security     | Clerk                |

---

## 🔒 Security: The Vault Pattern

ARGUS implements a strict **Zero-Knowledge Vault Handshake**. Your AI provider keys are encrypted at the browser level using **AES-256-CBC** before being stored.

1. **At Rest:** Keys exist only as encrypted blobs in Supabase.
2. **In Transit:** The worker receives the blob via a secure Base64-encoded payload.
3. **In Memory:** Only the Python Worker, armed with your unique `VAULT_MASTER_KEY`, decrypts the keys during the millisecond they are needed for API calls.

---

## ⚠️ Infrastructure Notes (Free Ecosystem)

This project is optimized for the **Free Tier** ecosystem:

- **Hugging Face:** Worker nodes utilize `gunicorn` with a 600s timeout to prevent Scout mission termination. Nodes may sleep; the first request triggers a ~30s cold start.
- **Supabase Realtime:** Telemetry logs use the `execution_logs` table. Streaming is instant and free up to 200 concurrent users.
- **Rate Limits:** System performance is tied to the RPM (Requests Per Minute) of your configured AI provider.

---

## 📜 License & Copyright

**Copyright © 2026 ARGUS NEURAL SYSTEMS.** All rights reserved.

This repository and its contents are **Proprietary Software**. Unauthorized copying, modification, or distribution is strictly prohibited.

---

_Designed for the Intelligence that Never Sleeps._
