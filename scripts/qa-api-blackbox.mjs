import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const LAB_TOKEN = "igx-nexus-ci-only-bearer-token-0001";

async function reserveFreePort() {
  const server = createServer();
  server.unref();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const port = address.port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

function redact(value) {
  return value.replaceAll(LAB_TOKEN, "[REDACTED]");
}

async function waitForHttp(url, child, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`NEXUS API exited before becoming ready (code ${child.exitCode}).`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(750) });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`NEXUS API did not become reachable: ${String(lastError)}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  const graceful = once(child, "exit");
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("NEXUS API did not stop after SIGTERM")), 3_000);
  });

  try {
    await Promise.race([graceful, timeout]);
  } catch (error) {
    child.kill("SIGKILL");
    await once(child, "exit").catch(() => {});
    throw error;
  }
}

const port = await reserveFreePort();
const origin = `http://${HOST}:${port}`;
let stderr = "";

const child = spawn(
  process.execPath,
  ["--enable-source-maps", "services/api/dist/server.js"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXUS_API_ENV: "test",
      NEXUS_PROVIDER_MODE: "demo",
      NEXUS_API_HOST: HOST,
      NEXUS_API_PORT: String(port),
      NEXUS_API_LOG_LEVEL: "silent",
      NEXUS_LAB_AUTH_TOKEN: LAB_TOKEN,
    },
    stdio: ["ignore", "ignore", "pipe"],
  },
);
child.stderr.setEncoding("utf8");
child.stderr.on("data", chunk => {
  stderr += chunk;
});

try {
  const health = await waitForHttp(`${origin}/health`, child);
  assert.equal(health.status, 200);
  assert.deepEqual(
    await health.json(),
    {
      status: "ok",
      service: "nexus-api",
      apiVersion: "v1",
      technologySchemaVersion: "0.2",
      providerMode: "demo",
      providerAvailability: "ready",
    },
  );

  const ready = await fetch(`${origin}/ready`, { signal: AbortSignal.timeout(2_000) });
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).status, "ready");

  const unauthenticated = await fetch(
    `${origin}/api/v1/technology/snapshot`,
    { signal: AbortSignal.timeout(2_000) },
  );
  assert.equal(unauthenticated.status, 401);
  const unauthenticatedBody = await unauthenticated.text();
  assert(!unauthenticatedBody.includes("DEMO-0001"));

  const authenticated = await fetch(
    `${origin}/api/v1/technology/snapshot`,
    {
      headers: { authorization: `Bearer ${LAB_TOKEN}` },
      signal: AbortSignal.timeout(5_000),
    },
  );
  assert.equal(authenticated.status, 200);
  const snapshot = await authenticated.json();
  assert.equal(snapshot.schemaVersion, "0.2");
  assert.equal(snapshot.assets.length, 240);
  assert.equal(snapshot.assets[0]?.id, "DEMO-0001");
  assert(Array.isArray(snapshot.relationships));
  assert(Array.isArray(snapshot.observations));
} catch (error) {
  const diagnostic = redact(stderr.trim());
  if (diagnostic) console.error(diagnostic);
  throw error;
} finally {
  await stopChild(child);
}

console.log("NEXUS API black-box HTTP gate: PASS");
