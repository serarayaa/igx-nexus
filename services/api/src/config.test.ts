import { describe, expect, it } from "vitest";
import { ApiConfigError, loadConfig } from "./config.js";

describe("NEXUS API config", () => {
  it("uses loopback-safe local defaults", () => {
    expect(loadConfig({})).toEqual({
      environment: "development",
      host: "127.0.0.1",
      port: 3100,
      logLevel: "info",
    });
  });

  it("uses silent logging by default in test", () => {
    expect(loadConfig({ NEXUS_API_ENV: "test" }).logLevel).toBe("silent");
  });

  it("accepts explicit environment configuration", () => {
    expect(loadConfig({
      NEXUS_API_ENV: "production",
      NEXUS_API_HOST: "0.0.0.0",
      NEXUS_API_PORT: "8080",
      NEXUS_API_LOG_LEVEL: "warn",
    })).toEqual({
      environment: "production",
      host: "0.0.0.0",
      port: 8080,
      logLevel: "warn",
    });
  });

  it.each(["0", "65536", "abc", "31.5"])("rejects invalid port %s", (port) => {
    expect(() => loadConfig({ NEXUS_API_PORT: port })).toThrow(ApiConfigError);
  });

  it("rejects unsupported environment and log level", () => {
    expect(() => loadConfig({ NEXUS_API_ENV: "staging" })).toThrow(ApiConfigError);
    expect(() => loadConfig({ NEXUS_API_LOG_LEVEL: "verbose" })).toThrow(ApiConfigError);
  });
});
