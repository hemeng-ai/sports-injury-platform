/**
 * 生产环境冒烟测试
 *
 * 用法:
 *   npx tsx scripts/smoke-test.mts                        # 默认 localhost:3000
 *   npx tsx scripts/smoke-test.mts https://你的域名.com     # 指定 URL
 *
 * 环境变量（可选，仅登录测试需要）:
 *   SMOKE_TEST_EMAIL     - 测试账号邮箱
 *   SMOKE_TEST_PASSWORD  - 测试账号密码
 */

const BASE_URL = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  PASS ${name}`);
    passed++;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  FAIL ${name}  ->  ${msg}`);
    failed++;
    failures.push(`${name}: ${msg}`);
  }
}

async function get(path: string, expectedStatus = 200) {
  const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
  if (res.status !== expectedStatus) {
    throw new Error(`expected ${expectedStatus}, got ${res.status}`);
  }
  return res;
}

async function post(path: string, body: unknown, expectedStatus: number) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status !== expectedStatus) {
    const text = await res.text();
    throw new Error(`expected ${expectedStatus}, got ${res.status}: ${text.slice(0, 100)}`);
  }
  return res;
}

// ==================== TEST START ====================

console.log(`\nSMOKE TEST -- ${BASE_URL}\n`);

// ---- Public pages ----
console.log("Public pages");
await check("GET /login -> 200", async () => {
  const res = await get("/login");
  const html = await res.text();
  if (!html.includes("login") && !html.includes("Sign in") && !html.includes("登录")) {
    throw new Error("page missing login form");
  }
});

await check("GET / -> 302 redirect to /login", () => get("/", 302));

// ---- Auth API ----
console.log("\nAuth API");
await check("POST /api/auth/login empty body -> 400", () =>
  post("/api/auth/login", {}, 400)
);

await check("POST /api/auth/login wrong password -> 401", () =>
  post("/api/auth/login", { email: "no@test.com", password: "wrongpassword123" }, 401)
);

await check("POST /api/auth/register empty body -> 400", () =>
  post("/api/auth/register", {}, 400)
);

// ---- Protected routes (unauthenticated) ----
console.log("\nProtected routes (unauthenticated)");
await check("GET /dashboard -> 302 redirect", () => get("/dashboard", 302));
await check("GET /files -> 302 redirect", () => get("/files", 302));
await check("GET /api/files -> 401 unauthorized", () => get("/api/files", 401));
await check("GET /api/indicators -> 401 unauthorized", () => get("/api/indicators", 401));

// ---- Login flow (if credentials configured) ----
const testEmail = process.env.SMOKE_TEST_EMAIL;
const testPassword = process.env.SMOKE_TEST_PASSWORD;

if (testEmail && testPassword) {
  console.log("\nLogin flow");

  let session: { access_token: string } | null = null;

  await check("POST /api/auth/login valid credentials -> 200", async () => {
    const res = await post(
      "/api/auth/login",
      { email: testEmail, password: testPassword },
      200
    );
    const body = await res.json();
    if (!body.session?.access_token) {
      throw new Error("no session token returned");
    }
    if (!body.user?.role) {
      throw new Error("no user role returned");
    }
    session = body.session;
  });

  if (session) {
    await check("GET /api/dashboard/stats -> 200", async () => {
      const res = await fetch(`${BASE_URL}/api/dashboard/stats`, {
        headers: {
          Cookie: `sb-access-token=${session!.access_token}`,
        },
      });
      if (res.status !== 200) throw new Error(`status ${res.status}`);
    });
  }
} else {
  console.log("\nLogin flow -- skipped (SMOKE_TEST_EMAIL not set)");
}

// ---- Static assets ----
console.log("\nStatic assets");
await check("GET /favicon.ico -> 200 or 404", async () => {
  const res = await fetch(`${BASE_URL}/favicon.ico`);
  if (res.status !== 200 && res.status !== 404) {
    throw new Error(`status ${res.status}`);
  }
});

// ==================== RESULTS ====================

console.log(`\n${"=".repeat(40)}`);
const total = passed + failed;
console.log(`  Passed: ${passed}/${total}  |  Failed: ${failed}/${total}`);
if (failed > 0) {
  console.log(`\n  Failures:`);
  failures.forEach((f) => console.log(`    - ${f}`));
}
console.log(`${"=".repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);