import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { installShutdownHandlers, type SignalRuntime } from "./server.js";

const testConfig = loadConfig({ NEXUS_API_ENV: "test" });

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
