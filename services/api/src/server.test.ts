import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import type { ApiConfig } from "./config.js";
import { installShutdownHandlers, type SignalRuntime } from "./server.js";

const testConfig: ApiConfig = {
  environment: "test",
  host: "127.0.0.1",
  port: 3100,
  logLevel: "silent",
};

describe("shutdown lifecycle", () => {
  it("registers SIGTERM and SIGINT and closes idempotently", async () => {
    const listeners = new Map<NodeJS.Signals, () => void>();
    const runtime: SignalRuntime = {
      exitCode: undefined,
      once(signal, listener) {
        listeners.set(signal, listener);
        return runtime;
      },
    };

    const app = await buildApp({ config: testConfig });
    const controller = installShutdownHandlers(app, runtime);

    expect([...listeners.keys()].sort()).toEqual(["SIGINT", "SIGTERM"]);
    await controller.shutdown("SIGTERM");
    await controller.shutdown("SIGINT");
    expect(app.server.listening).toBe(false);
    expect(runtime.exitCode).toBeUndefined();
  });
});
