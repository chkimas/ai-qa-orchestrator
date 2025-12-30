# 🛡️ AI-QA Orchestrator (Titan V1.2.0)

An autonomous, full-stack QA "Control Plane" that leverages **Generative AI** to map, test, and audit web applications. Unlike traditional tools, this platform functions as a **Reasoning Agent** capable of self-healing, chaos engineering, and predictive risk analysis.

---

## 🚀 Advanced Operational Modes

### 1. 🎯 Sniper Mode (Intent-to-Code)

Translate human business intent into deterministic execution plans.

- **Self-Healing Fingerprints:** Uses "Element DNA" (Tag + Attributes + Visual Coordinates) to maintain 92% uptime even when IDs/Classes change.
- **Heuristic Repair:** Automatically triggers LLM-reasoning to re-map selectors during runtime failures.

### 2. 🕷️ Scout Mode (Autonomous Recon)

Autonomous "Spider" that maps application routes and captures UI state.

- **Stealth Stack:** Bypasses WAF/Bot-detection (Cloudflare/hCaptcha) using JS-masking and fingerprint randomization.
- **DNA Capture:** Automatically snapshots the "Visual DNA" of critical elements for future healing.

### 3. 🔥 Chaos Monkey (Adversarial Testing)

Intentionally attempts to break the application to find edge cases.

- **Destructive Payloads:** Automatically generates SQL injection, XSS, and massive character overflows.
- **Stress Testing:** Executes rapid-fire interactions and boundary-logic attacks to verify system resilience.

### 4. 🔄 Behavioral Replay (Shift-Right)

Ingests real-world user session logs to prioritize regression testing.

- **Log Ingestion:** Converts URL paths from production logs into high-priority automated "Sniper" runs.

---

## 🧠 Predictive Intelligence (Phase 3)

The platform includes a **Predictive Risk Heatmap** that analyzes historical execution data to identify "Brittle Zones."

- **Risk Weighting:** Calculates fragility based on a weighted average of `FAILURES` vs. `HEALING` events.
- **Complexity Mapping:** Weighs risk against DOM complexity (interactive element density).
- **Stability Forecasting:** Provides executive-level insight into whether a build is "Stable," "Brittle," or "Critical."

---

## 🛠️ Technical Stack

- **Engine:** Python 3.11+, Playwright (Chromium)
- **Brain:** Google Gemini 2.0 Flash / Groq (Llama-3.3-70B)
- **Frontend:** Next.js 16+, Tailwind CSS, Lucide Icons, TypeScript
- **Infrastructure:** Node.js Server Actions (Child Process Orchestration)
- **Persistence:** SQLite with Write-Ahead Logging (WAL) for concurrent AI/Web access.

---

## 📦 Installation & Setup

1. **Clone & Setup:**

   ```bash
   git clone [https://github.com/your-username/ai-qa-orchestrator.git](https://github.com/your-username/ai-qa-orchestrator.git)
   cd ai-qa-orchestrator
   ```

2. **Backend (Python):**

   ```bash
   python -m venv venv
   source venv/bin/activate # Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   playwright install chromium
   ```

3. **Frontend (Next.js):**

   ```bash
   cd dashboard
   npm install
   npm run dev
   ```

4. **Configure Environment:**
   Create a `.env` file in the root:
   ```env
   GEMINI_API_KEY=your_key_here
   AI_PROVIDER=gemini # or groq
   ```

---

## 📈 Performance Metrics

| Metric                | Capability                                  |
| :-------------------- | :------------------------------------------ |
| **Discovery Depth**   | Up to 20 internal pages/states              |
| **Auto-Healing Rate** | ~92% recovery on UI shifts                  |
| **Bypass Success**    | Handles standard WAF challenges & SPAs      |
| **Risk Scoring**      | Predictive mapping based on Heal/Fail ratio |

---

## 🛡️ Engineering Highlights

- **Fault-Tolerant JSON Parsing:** Implemented a non-greedy regex "Heuristic Repair" parser in `planner.py` to handle messy AI-generated Chaos payloads.
- **Shift-Right Integration:** Integrated a `BehavioralIngestor` to close the loop between user behavior and automated audits.
- **The SSOT Pattern:** Optimized token usage and maintainability by unifying all AI logic into a **Single Source of Truth** (`ai/prompts.py`).
- **Unicode Stream Pipe:** Resolved Windows-to-Node pipe encoding crashes by enforcing `PYTHONIOENCODING='utf-8'` and wrapping `sys.stdout` in an `io.TextIOWrapper`.

---
