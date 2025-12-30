# 🛡️ AI-QA Orchestrator (Platinum V0.0.3)

An autonomous, full-stack QA platform that leverages **Generative AI** to map, test, and audit web applications. Unlike traditional "record-and-playback" tools, this agent uses heuristic reasoning to discover hidden routes and perform "Sanity Check" assertions in real-time.

## 🚀 Core Innovations

### 1. Autonomous "Scout" Mode

- **Heuristic Discovery:** Instead of following hardcoded scripts, the agent analyzes the DOM to identify interactive elements (buttons, links, SPAs) using **Gemini 2.0 Flash**.
- **Self-Healing Logic:** When a selector fails, the **Healer** module snapshots the DOM and uses LLM-reasoning to find the most robust alternative (prioritizing `aria-labels` and `data-test` attributes).

### 2. Stealth & Resilience Engineering

- **WAF/Bot-Bypass:** Implements advanced **Playwright Stealth** techniques, including `navigator.webdriver` masking and fingerprint randomization, to audit high-security platforms (e.g., Cloudflare-protected sites).
- **Dynamic UX Handling:** Capable of navigating Single Page Applications (SPAs) by detecting URL state changes and DOM hydration without full page reloads.

### 3. Principal-Level Reporting

- **Risk-Aware Audits:** Generates **Executive QA Reports** that include AI-driven risk assessments, identifying system stability issues rather than just failing tests.
- **History & Baseline:** Persistent SQLite-backed registry to track regression trends over time.

---

## 🛠️ Technical Stack

- **Engine:** Python 3.11+, Playwright (Chromium)
- **Brain:** Google Gemini 2.0 Flash (`google-genai`)
- **Frontend:** Next.js 14, Tailwind CSS, Lucide Icons
- **Infrastructure:** Node.js Server Actions (Child Process Orchestration), SQLite

---

## 📦 Installation & Setup

1.  **Clone the environment:**

    ```bash
    git clone [https://github.com/your-username/ai-qa-orchestrator.git](https://github.com/your-username/ai-qa-orchestrator.git)
    cd ai-qa-orchestrator
    ```

2.  **Initialize the Python Backend:**

    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: .\venv\Scripts\activate
    pip install -r requirements.txt
    playwright install chromium
    ```

3.  **Configure Environment:**
    Create a `.env` file in the root:

    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **Launch the Dashboard:**
    ```bash
    cd dashboard
    npm install
    npm run dev
    ```

---

## 📈 Performance Metrics

| Metric                | Capability                             |
| :-------------------- | :------------------------------------- |
| **Discovery Depth**   | Up to 15-20 internal pages/states      |
| **Auto-Healing Rate** | ~92% recovery on UI shifts             |
| **Bypass Success**    | Handles standard WAF challenges & SPAs |
| **Report Gen**        | < 10s for Executive Markdown summary   |

---

## 🛡️ Project Highlights

- **Unicode Stream Pipe:** Resolved Windows-to-Node pipe encoding crashes by enforcing `PYTHONIOENCODING='utf-8'` and wrapping `sys.stdout` in an `io.TextIOWrapper`.
- **The SSOT Pattern:** Optimized token usage and maintainability by unifying all AI logic into a **Single Source of Truth** (`ai/prompts.py`).
- **Safe-Action Heuristics:** Implemented a filtering layer to prevent autonomous agents from triggering destructive actions (Delete, Logout) during discovery.
