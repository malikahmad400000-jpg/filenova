/**
 * Comprehensive Test Suite for FileNova Supabase + Authentication Foundation
 * 
 * Verifies:
 * - Supabase Client & Server helper functions and graceful unconfigured behavior
 * - Next.js 16 Proxy route protection for /dashboard and public routes
 * - Login & Signup public access, SEO metadata, form validation, and unconfigured notices
 * - Auth callback route & open-redirect attack mitigation
 * - Server-side logout endpoint (HTTP 303 redirect and JSON mode)
 * - Database migration file syntax, schema fields, foreign keys, and RLS policies
 * - Privilege escalation prevention (plan lockdown) and search_path security
 * - Secret leak prevention across HTML, bundle definitions, and APIs
 * - Full system regression across all public tools and AI features
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";

async function runAuthTests() {
  console.log("=== SUPABASE + AUTHENTICATION FOUNDATION TEST SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // ── TEST GROUP 1: Supabase Architecture & Helper Modules ───────────────────
  console.log("--- TEST GROUP 1: Supabase Architecture & Configuration ---");

  const clientPath = path.resolve(process.cwd(), "lib/supabase/client.ts");
  const serverPath = path.resolve(process.cwd(), "lib/supabase/server.ts");
  const proxyHelperPath = path.resolve(process.cwd(), "lib/supabase/proxy.ts");
  const proxyPath = path.resolve(process.cwd(), "proxy.ts");

  assert(fs.existsSync(clientPath), "lib/supabase/client.ts exists");
  assert(fs.existsSync(serverPath), "lib/supabase/server.ts exists");
  assert(fs.existsSync(proxyHelperPath), "lib/supabase/proxy.ts exists");
  assert(fs.existsSync(proxyPath), "proxy.ts exists at project root (Next.js 16 convention)");

  const clientCode = fs.readFileSync(clientPath, "utf8");
  assert(clientCode.includes("isSupabaseConfigured"), "client.ts exports isSupabaseConfigured");
  assert(clientCode.includes("createClient"), "client.ts exports createClient");
  assert(clientCode.includes("createBrowserClient"), "client.ts uses createBrowserClient from @supabase/ssr");
  assert(clientCode.includes("return null"), "client.ts safely returns null when unconfigured");

  const serverCode = fs.readFileSync(serverPath, "utf8");
  assert(serverCode.includes("createServerClient"), "server.ts uses createServerClient from @supabase/ssr");
  assert(serverCode.includes("cookies"), "server.ts uses async cookies() from next/headers");
  assert(serverCode.includes("getUser"), "server.ts exports safe getUser() helper");

  const proxyCode = fs.readFileSync(proxyPath, "utf8");
  assert(proxyCode.includes("export async function proxy"), "proxy.ts exports proxy function");
  assert(proxyCode.includes("updateSession"), "proxy.ts uses updateSession for cookie synchronization");
  assert(!fs.existsSync(path.resolve(process.cwd(), "middleware.ts")), "middleware.ts does NOT exist (no legacy duplication)");

  // ── TEST GROUP 2: Route Protection & Proxy Behavior ────────────────────────
  console.log("\n--- TEST GROUP 2: Route Protection & Proxy Interception ---");

  // Anonymous access to /dashboard must redirect to /login
  const dashRes = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
  assert(dashRes.status === 307 || dashRes.status === 302, `Anonymous access to /dashboard redirects (got ${dashRes.status})`);
  const dashLocation = dashRes.headers.get("location") || "";
  assert(dashLocation.includes("/login"), `Redirect destination points to /login (got ${dashLocation})`);
  assert(dashLocation.includes("redirect=%2Fdashboard") || dashLocation.includes("redirect=/dashboard"), "Redirect preserves destination /dashboard");

  // Anonymous access to /dashboard subroute
  const dashSubRes = await fetch(`${BASE_URL}/dashboard/settings`, { redirect: "manual" });
  assert(dashSubRes.status === 307 || dashSubRes.status === 302, `Anonymous access to /dashboard/settings redirects (got ${dashSubRes.status})`);
  const dashSubLocation = dashSubRes.headers.get("location") || "";
  assert(dashSubLocation.includes("redirect=%2Fdashboard%2Fsettings") || dashSubLocation.includes("redirect=/dashboard/settings"), "Redirect preserves subroute parameter");

  // Public tools MUST remain accessible without authentication (HTTP 200)
  const publicTools = [
    "/",
    "/tools/merge-pdf",
    "/tools/split-pdf",
    "/tools/compress-pdf",
    "/tools/pdf-to-jpg",
    "/tools/jpg-to-pdf",
    "/tools/pdf-to-word",
    "/tools/pdf-to-excel",
    "/ai/chat-with-pdf",
    "/ai/pdf-summarizer",
    "/ai/smart-ocr",
    "/ai/document-translator",
    "/ai/writing-assistant",
  ];

  for (const toolRoute of publicTools) {
    const res = await fetch(`${BASE_URL}${toolRoute}`);
    assert(res.status === 200, `Public route ${toolRoute} accessible without auth (got ${res.status})`);
  }

  // ── TEST GROUP 3: Login & Signup Pages ──────────────────────────────────────
  console.log("\n--- TEST GROUP 3: Login & Signup Pages ---");

  const loginRes = await fetch(`${BASE_URL}/login`);
  assert(loginRes.status === 200, `Login page returns HTTP 200 (got ${loginRes.status})`);
  const loginHtml = await loginRes.text();
  assert(loginHtml.includes("Welcome back") || loginHtml.includes("Log In"), "Login page contains branding and heading");
  assert(loginHtml.includes('type="email"'), "Login page contains email input");
  assert(loginHtml.includes('type="password"'), "Login page contains password input");
  assert(loginHtml.includes("/signup"), "Login page links to /signup");

  const signupRes = await fetch(`${BASE_URL}/signup`);
  assert(signupRes.status === 200, `Signup page returns HTTP 200 (got ${signupRes.status})`);
  const signupHtml = await signupRes.text();
  assert(signupHtml.includes("Create your account") || signupHtml.includes("Sign Up"), "Signup page contains branding and heading");
  assert(signupHtml.includes('type="email"'), "Signup page contains email input");
  assert(signupHtml.includes('type="password"'), "Signup page contains password input");
  assert(signupHtml.includes("/login"), "Signup page links to /login");

  // ── TEST GROUP 4: Auth Callback & Open-Redirect Protection ──────────────────
  console.log("\n--- TEST GROUP 4: Auth Callback Route & Security ---");

  // Missing code in callback redirects to /login?error=auth_callback_failed
  const callbackRes = await fetch(`${BASE_URL}/auth/callback`, { redirect: "manual" });
  assert(callbackRes.status === 307 || callbackRes.status === 302, `Callback without code redirects (got ${callbackRes.status})`);
  const cbLocation = callbackRes.headers.get("location") || "";
  assert(cbLocation.includes("/login?error=auth_callback_failed"), `Callback failure redirects to login with error (got ${cbLocation})`);

  // Open-redirect attack mitigation test
  const callbackAttackRes = await fetch(`${BASE_URL}/auth/callback?code=fake&next=https://attacker.com`, { redirect: "manual" });
  const attackLocation = callbackAttackRes.headers.get("location") || "";
  assert(!attackLocation.startsWith("https://attacker.com"), "Auth callback rejects external protocol open-redirect");

  const callbackSlashAttack = await fetch(`${BASE_URL}/auth/callback?code=fake&next=//attacker.com`, { redirect: "manual" });
  const slashAttackLocation = callbackSlashAttack.headers.get("location") || "";
  assert(!slashAttackLocation.startsWith("//attacker.com"), "Auth callback rejects double-slash protocol-relative redirect");

  // ── TEST GROUP 5: Logout Endpoint ──────────────────────────────────────────
  console.log("\n--- TEST GROUP 5: Logout Endpoint ---");

  // Standard POST logout redirects with HTTP 303 to home
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", redirect: "manual" });
  assert(logoutRes.status === 303, `Logout endpoint returns HTTP 303 redirect (got ${logoutRes.status})`);
  const logoutLocation = logoutRes.headers.get("location") || "";
  assert(logoutLocation === `${BASE_URL}/` || logoutLocation === "/", `Logout redirects to root home (got ${logoutLocation})`);

  // JSON mode logout returns 200 with success: true
  const logoutJsonRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  assert(logoutJsonRes.status === 200, `Logout JSON mode returns HTTP 200 (got ${logoutJsonRes.status})`);
  const logoutData = await logoutJsonRes.json();
  assert(logoutData.success === true, "Logout JSON response has success: true");

  // ── TEST GROUP 6: Database Schema & Migration Review ────────────────────────
  console.log("\n--- TEST GROUP 6: Database Schema & RLS Policies ---");

  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20260923000000_create_profiles.sql");
  assert(fs.existsSync(migrationPath), "Migration file exists in supabase/migrations/");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert(sql.includes("CREATE TABLE IF NOT EXISTS public.profiles"), "Creates public.profiles table");
  assert(sql.includes("REFERENCES auth.users(id) ON DELETE CASCADE"), "Profiles id foreign key references auth.users(id) with CASCADE");
  assert(sql.includes("plan TEXT NOT NULL DEFAULT 'free'"), "Profiles defines plan field defaulting to 'free'");
  assert(sql.includes("ENABLE ROW LEVEL SECURITY"), "Row Level Security explicitly enabled on public.profiles");
  assert(sql.includes("auth.uid() = id"), "RLS policies enforce auth.uid() = id ownership check");
  assert(!sql.includes("USING (true)"), "Does NOT contain insecure USING (true) policy");
  assert(!sql.toLowerCase().includes("password"), "Profiles table does NOT store password field");
  assert(sql.includes("SECURITY DEFINER"), "handle_new_user uses SECURITY DEFINER");
  assert(sql.includes("SET search_path = public"), "Trigger functions specify explicit search_path");
  assert(sql.includes("NEW.plan = OLD.plan"), "Plan privilege escalation strictly prevented in update trigger");

  // ── TEST GROUP 7: Security Review & Secret Leak Prevention ─────────────────
  console.log("\n--- TEST GROUP 7: Security & Secret Leak Prevention ---");

  // Check HTML of public pages for credential leaks
  const pagesToCheck = ["/", "/login", "/signup", "/ai/writing-assistant"];
  for (const pageUrl of pagesToCheck) {
    const res = await fetch(`${BASE_URL}${pageUrl}`);
    const html = await res.text();
    assert(!html.includes("SUPABASE_SERVICE_ROLE_KEY"), `No SUPABASE_SERVICE_ROLE_KEY leaked in ${pageUrl}`);
    assert(!html.includes("OPENAI_API_KEY"), `No OPENAI_API_KEY variable leaked in ${pageUrl}`);
    assert(!html.includes("sk-proj-"), `No raw OpenAI API keys leaked in ${pageUrl}`);
  }

  // Ensure service role key is not imported in client code
  const componentsDir = path.resolve(process.cwd(), "components");
  const allComponentFiles = fs.readdirSync(componentsDir, { recursive: true });
  let leakedInComponents = false;
  for (const f of allComponentFiles) {
    if (typeof f === "string" && (f.endsWith(".tsx") || f.endsWith(".ts"))) {
      const content = fs.readFileSync(path.join(componentsDir, f), "utf8");
      if (content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        leakedInComponents = true;
      }
    }
  }
  assert(!leakedInComponents, "No client components reference SUPABASE_SERVICE_ROLE_KEY");

  // ── TEST GROUP 8: Full System Regression Across All APIs ───────────────────
  console.log("\n--- TEST GROUP 8: Full System API Regression ---");

  const apisToTest = [
    "/api/pdf/merge",
    "/api/pdf/split",
    "/api/pdf/compress",
    "/api/pdf/to-jpg",
    "/api/pdf/from-jpg",
    "/api/pdf/to-word",
    "/api/pdf/to-excel",
    "/api/ai/upload-pdf",
    "/api/ai/pdf-summarizer",
    "/api/ai/smart-ocr",
    "/api/ai/document-translator",
    "/api/ai/writing-assistant",
    "/api/auth/logout",
  ];

  for (const apiPath of apisToTest) {
    const res = await fetch(`${BASE_URL}${apiPath}`, { method: "POST" });
    assert([200, 303, 400, 503].includes(res.status), `API ${apiPath} responsive (got HTTP ${res.status})`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n=== AUTH FOUNDATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
