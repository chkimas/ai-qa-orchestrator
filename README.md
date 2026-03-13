# ARGUS

Autonomous web automation system that maps application routes, executes browser tasks, captures execution evidence, and stores telemetry using a Python worker, Playwright automation, and a Next.js dashboard.

## Screenshot

![Landing](https://i.ibb.co/qLcJVxSD/image.png)

## Tech Stack

**Automation Worker**

- Python
- FastAPI (ASGI server)
- Uvicorn
- Playwright (Chromium automation)
- ReportLab (PDF generation)

**Dashboard**

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Turbopack

**Data Layer**

- Supabase
- PostgreSQL
- Supabase Realtime
- Supabase Storage

**Authentication**

- Clerk

**AI Providers (pluggable gateway)**

- OpenAI
- Anthropic
- Google Gemini
- Groq (Llama models)
- Sonar (Perplexity)

External libraries and documentation:

- FastAPI — https://fastapi.tiangolo.com
- Uvicorn — https://www.uvicorn.org
- Playwright — https://playwright.dev
- ReportLab — https://www.reportlab.com
- Next.js — https://nextjs.org
- Tailwind CSS — https://tailwindcss.com
- Supabase — https://supabase.com
- Clerk — https://clerk.com
- PostgreSQL — https://www.postgresql.org

---

# Architecture / Directory Structure

```
ai-qa-orchestrator/
├── ai/
├── automation/
│   └── core/
├── data/
├── configs/
├── dashboard/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   └── supabase/
│       └── migrations/

```

### ai/

AI-related logic for route analysis, selector healing, and report generation.

- `analyzer.py` — computes page stability scores and risk metrics.
- `crawler.py` — automated spider that discovers routes and captures DOM snapshots.
- `healer.py` — generates alternative selectors when automation fails.
- `planner.py` — produces execution plans from input tasks.
- `provider.py` — abstraction layer for AI providers.
- `reporter.py` — PDF report generation using ReportLab.
- `vault.py` — encryption utilities used for key handling.

### automation/core/

Browser automation runtime built on Playwright.

- `runner.py` executes scripted browser tasks and captures screenshots during execution.

Playwright documentation:  
https://playwright.dev/docs/intro

### data/

Supabase integration layer.

- `supabase_client.py` performs database operations and uploads binary files to Supabase Storage.

Supabase Storage documentation:  
https://supabase.com/docs/guides/storage

### configs/

Centralized configuration used by the worker runtime.

- `settings.py` loads environment variables and runtime parameters.

### dashboard/

Next.js application that provides the interface for launching automation tasks and monitoring execution telemetry.

#### dashboard/src/app/

App Router pages and layouts.

Next.js App Router documentation:  
https://nextjs.org/docs/app

#### dashboard/src/components/

React components used by the dashboard UI.

#### dashboard/src/lib/

Supabase client configuration and utility functions.

#### dashboard/src/types/

Shared TypeScript types used by the frontend.

#### dashboard/supabase/migrations/

SQL schema and Row Level Security policies.

PostgreSQL RLS documentation:  
https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

# Implementation Techniques

### Playwright Browser Automation

The automation engine executes browser actions and collects screenshots during each step of execution.

Documentation:  
https://playwright.dev/docs/intro

### Supabase Realtime Streaming

Execution telemetry is streamed to the dashboard using Supabase Realtime, which is built on PostgreSQL `LISTEN/NOTIFY`.

Documentation:  
https://supabase.com/docs/guides/realtime

### PostgreSQL Row Level Security

Database tables use Row Level Security policies to restrict records to the authenticated user.

Documentation:  
https://www.postgresql.org/docs/current/ddl-rowsecurity.html

### AES Encryption for Secret Storage

Encryption utilities in `ai/vault.py` encrypt provider keys before persistence.

Python cryptography reference:  
https://cryptography.io/en/latest/

### Automated Route Discovery

The crawler module traverses application routes and records discovered pages with associated metadata.

### Screenshot Evidence Pipeline

Automation runs capture browser screenshots and upload binary files to Supabase Storage.

Storage documentation:  
https://supabase.com/docs/guides/storage

### PDF Report Generation

Execution results and metrics are formatted into reports using ReportLab.

ReportLab documentation:  
https://www.reportlab.com/documentation/

---

# Setup

```

git clone [https://github.com/yourusername/ai-qa-orchestrator.git](https://github.com/yourusername/ai-qa-orchestrator.git)
cd ai-qa-orchestrator
pip install -r requirements.txt
pnpm install

```

Start the Python worker:

```

python worker_api.py

```

Start the dashboard:

```

cd dashboard
pnpm dev

```

---

# Environment Variables

Root `.env`:

```

SUPABASE_URL
SUPABASE_KEY
VAULT_MASTER_KEY

```

`dashboard/.env.local`:

```

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
WEBHOOK_SECRET

```

---

# Deployment Notes

Worker services can run on any Python ASGI host compatible with Uvicorn.

The dashboard can be deployed to platforms supporting Next.js App Router builds.

Database schema must be applied using the SQL migrations located in:

```

dashboard/supabase/migrations/
```

Supabase Storage buckets must exist for screenshot and report uploads.
