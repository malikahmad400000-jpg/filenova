# FileNova — Production Deployment Guide

This document specifies the hosting prerequisites, configuration requirements, environment variables, and verification procedures for deploying FileNova into a production environment.

---

## 1. System Prerequisites & Runtime Requirements

* **Node.js**: `v20.x` or `v22.x` (LTS recommended; tested on Node.js 20+)
* **Package Manager**: `npm` (v10+)
* **Framework**: Next.js 16.3.6 (Turbopack, App Router)
* **Architecture**: `linux-x64` or `linux-arm64` (Standard hosting containers / VMs)
* **Target Memory**: Minimum 1024 MB RAM recommended (to support concurrent PDF rendering via `pdfjs-dist` and image manipulation via `@napi-rs/canvas` / `sharp`)
* **Execution Timeout**: Minimum 30s recommended (for multi-page OCR and AI generation requests)

---

## 2. Production Installation & Build Commands

### Standard Node.js Host
```bash
# 1. Install dependencies
npm ci

# 2. Type check
npx tsc --noEmit

# 3. Lint check
npx eslint . --max-warnings 0

# 4. Production build
npx next build

# 5. Start production server
npm start
```

### Docker Container Deployment
```bash
# 1. Build the production container
docker build -t filenova:latest .

# 2. Run the container with environment variables
docker run -d \
  -p 3000:3000 \
  --name filenova-prod \
  -e NEXT_PUBLIC_APP_URL="https://your-domain.com" \
  -e NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key" \
  -e GEMINI_API_KEY="your-gemini-key" \
  filenova:latest

# 3. Verify health status
curl -f http://localhost:3000/api/health
# Expected response: {"status":"ok"}
```

---

## 3. Environment Variables Reference

Configure the following environment variables in your hosting dashboard (e.g., Vercel, Railway, Render, Docker, AWS):

### A. Application URL Configuration
| Variable Name | Client/Server | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public (Client & Server) | **Yes** | The canonical production URL of your app, e.g., `https://filenova.com`. Used for metadata, OpenGraph, sitemap, robots, and auth redirects. |

### B. Supabase Authentication & Database
| Variable Name | Client/Server | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client & Server) | **Yes** | The project URL from Supabase dashboard (e.g., `https://xyz.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client & Server) | **Yes** | The anonymous client API key from Supabase dashboard (Settings → API). |

### C. AI Provider Configuration (Server-Side Only)
| Variable Name | Client/Server | Required | Description |
|---|---|---|---|
| `AI_PROVIDER` | Server-Side Only | Optional | Explicit provider choice: `"gemini"` (recommended) or `"openai"`. Defaults to auto-detection. |
| `GEMINI_API_KEY` | Server-Side Only | Conditional | Google Gemini API Key. Required if using Gemini. **Never prefix with NEXT_PUBLIC_**. |
| `GEMINI_MODEL` | Server-Side Only | Optional | Gemini model name. Defaults to `gemini-2.5-flash`. |
| `OPENAI_API_KEY` | Server-Side Only | Conditional | OpenAI API Key. Required if using OpenAI as primary provider. **Never prefix with NEXT_PUBLIC_**. |
| `OPENAI_MODEL` | Server-Side Only | Optional | OpenAI model name. Defaults to `gpt-4o-mini`. |

---

## 4. Supabase Production Settings

In your **Supabase Dashboard** (`https://supabase.com/dashboard`):

1. **Authentication → URL Configuration**:
   * **Site URL**: Set to your production base URL: `https://your-domain.com`
   * **Redirect URLs**: Add the following allowed callback patterns:
     * `https://your-domain.com/auth/callback`
     * `https://your-domain.com/**`
2. **Email Provider**:
   * Configure custom SMTP or ensure Supabase built-in transactional email limits meet your expected signup volume.
   * Customize email templates for "Confirm your signup" to match FileNova branding.
3. **Database & Row Level Security (RLS)**:
   * Verify that user tables or profiles adhere to RLS policies.
   * FileNova processes all user document files **in-memory** without retaining files on disk or permanent database storage.

---

---

## 5. Hosting Platform Compatibility Analysis

| Hosting Platform | Native Binaries & Glibc | Upload Payload Limits | Max Timeout Limits | In-Memory Document Store Support |
|---|---|---|---|---|
| **Docker / Self-Hosted Container** | **Full**: Uses `node:20-bookworm-slim` with standard glibc; 100% native compatibility. | **Full**: Set by reverse proxy (e.g. Nginx `client_max_body_size 25M`). | **Full**: No platform timeouts; full control. | **Full**: Persistent per running container. |
| **Railway** | **Full**: Deploys via the included `Dockerfile` with native glibc. | **Full**: Default reverse proxy allows 25 MB+ payloads directly. | **Full**: Supports long-running HTTP requests (minutes). | **Full**: Process memory remains resident across requests. |
| **Render (Web Service)** | **Full**: Deploys standard Docker containers or native Node.js environments. | **Full**: Standard 25 MB+ request body support. | **Full**: 100-second default HTTP request timeout. | **Full**: Process memory remains resident across requests. |
| **Fly.io** | **Full**: Runs Docker image as Firecracker microVM with dedicated RAM. | **Full**: Set via `fly.toml` or reverse proxy; supports large uploads. | **Full**: Configurable timeouts; suitable for OCR and AI pipelines. | **Full**: Process memory remains resident in VM. |
| **AWS App Runner / ECS** | **Full**: Runs production Docker container directly. | **Full**: Configurable via ALB/NLB; supports large uploads. | **Full**: ALB idle timeout configurable up to 4000s. | **Full**: Single container or sticky sessions on task instances. |
| **Vercel (Serverless)** | **Partial**: Native binaries require serverless bundling configuration via `serverExternalPackages`. | **Constrained**: Enforces strict **4.5 MB request body limit** on Serverless Functions. Direct 25 MB multipart uploads will be rejected unless routed to external blob storage. | **Constrained**: Maximum execution duration is 15s (Hobby) or 60s (Pro). Long OCR/AI jobs on multi-page files may time out on free tier. | **Ephemeral**: In-memory `documentStore` is destroyed across cold starts and isolated per lambda invocation. |

---

## 6. File & PDF Processing Hosting Constraints

* **Native Binaries (`@napi-rs/canvas`, `sharp`)**:
  * In [next.config.ts](next.config.ts), `serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"]` is configured so native Node.js binaries resolve without bundling corruption.
  * When deploying via Docker, `node:20-bookworm-slim` provides standard glibc libraries (`libc6`) for canvas and sharp.
* **Request Body Payload Limit**:
  * FileNova allows document uploads up to 25 MB (or 10 MB for OCR images).
  * Containerized hosting platforms (Docker, Railway, Render, Fly.io, AWS) support 25 MB payloads directly.
* **Ephemeral In-Memory Document Store**:
  * `InMemoryDocumentStore` holds document chunks in process memory with a 2-hour TTL eviction for multi-turn sessions (Chat with PDF, Document Q&A).
  * A containerized deployment keeps this store alive in process memory for the duration of the container. If running multiple container instances behind a load balancer, enable sticky sessions (session affinity).

---

## 6. Production Security Checklist

* [x] **No Leaked Secrets**: `GEMINI_API_KEY` and `OPENAI_API_KEY` are isolated server-side.
* [x] **Security Headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` active on all routes via `next.config.ts`.
* [x] **MIME & Magic Bytes**: Binary magic signatures `%PDF-`, `FF D8 FF`, and `89 50 4E 47` are validated before processing.
* [x] **Prompt Injection Defense**: Boundary tagging and contextual barriers are applied to all AI queries.
* [x] **Protected Routes**: Middleware / proxy guards `/dashboard` and redirects unauthenticated users to `/login`.
* [x] **Robots / Crawlers**: `/robots.txt` disallows `/api/`, `/dashboard`, and `/auth/` routes while allowing public tool pages.

---

## 7. Production Smoke-Test Checklist

After deploying to production, verify the following:

1. **Homepage**: Visit `https://your-domain.com/` — ensure HTTP 200, hero renders, all 14 tool cards display.
2. **SEO**: Visit `https://your-domain.com/sitemap.xml` and `https://your-domain.com/robots.txt` — verify both generate correctly.
3. **Authentication**:
   * Navigate to `/signup`, register a new account.
   * Verify verification email delivery and callback redirect to `/dashboard`.
   * Log out and log back in via `/login`.
4. **Core PDF Tools**:
   * Test `/tools/merge-pdf` with two small PDF documents.
   * Test `/tools/compress-pdf` and verify downloaded file integrity.
5. **AI Tools**:
   * Test `/ai/chat-with-pdf` with a sample PDF; ask a question and verify source page citations.
   * Test `/ai/invoice-extractor` with a sample invoice; verify parsed totals, vendor, and line items.
   * Test `/ai/document-qa` with a document; ask a question and verify response grounding.
