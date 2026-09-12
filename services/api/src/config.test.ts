import { describe, expect, it } from "vitest";
import { ApiConfigError, loadConfig } from "./config.js";

describe("NEXUS API config", () => {
  it("uses secure local defaults", () => {
    expect(loadConfig({})).toEqual({
      environment: "development",
      host: "127.0.0.1",
      port: 3100,
      logLevel: "info",
      corsOrigins: [],
      bodyLimitBytes: 1_048_576,
      requestTimeoutMs: 30_000,
      rateLimitMax: 120,
      rateLimitWindowMs: 60_000,
      trustedProxies: [],
    });
  });

  it("uses silent logging by default in test", () => {
    expect(loadConfig({ NEXUS_API_ENV: "test" }).logLevel).toBe("silent");
  });

  it("accepts and normalizes explicit security configuration", () => {
    expect(loadConfig({
      NEXUS_API_ENV: "production",
      NEXUS_API_HOST: "0.0.0.0",
      NEXUS_API_PORT: "8080",
      NEXUS_API_LOG_LEVEL: "warn",
      NEXUS_API_CORS_ORIGINS: "https://nexus.innergex.example, https://ops.innergex.example",
      NEXUS_API_BODY_LIMIT_BYTES: "524288",
      NEXUS_API_REQUEST_TIMEOUT_MS: "45000",
      NEXUS_API_RATE_LIMIT_MAX: "200",
      NEXUS_API_RATE_LIMIT_WINDOW_MS: "60000",
      NEXUS_API_TRUST_PROXY: "127.0.0.1,10.20.0.0/16",
    })).toEqual({
      environment: "production",
      host: "0.0.0.0",
      port: 8080,
      logLevel: "warn",
      corsOrigins: ["https://nexus.innergex.example", "https://ops.innergex.example"],
      bodyLimitBytes: 524_288,
      requestTimeoutMs: 45_000,
      rateLimitMax: 200,
      rateLimitWindowMs: 60_000,
      trustedProxies: ["127.0.0.1", "10.20.0.0/16"],
    });
  });

  it.each(["0", "65536", "abc", "31.5"])("rejects invalid port %s", (port) => {
    expect(() => loadConfig({ NEXUS_API_PORT: port })).toThrow(ApiConfigError);
  });

  it("rejects unsupported environment and log level", () => {
    expect(() => loadConfig({ NEXUS_API_ENV: "staging" })).toThrow(ApiConfigError);
    expect(() => loadConfig({ NEXUS_API_LOG_LEVEL: "verbose" })).toThrow(ApiConfigError);
  });

  it("denies wildcard and malformed CORS origins", () => {
    expect(() => loadConfig({ NEXUS_API_CORS_ORIGINS: "*" })).toThrow(ApiConfigError);
    expect(() => loadConfig({ NEXUS_API_CORS_ORIGINS: "https://example.com/path" })).toThrow(ApiConfigError);
    expect(() => loadConfig({ NEXUS_API_CORS_ORIGINS: "not-a-url" })).toThrow(ApiConfigError);
  });

  it("requires https CORS origins in production", () => {
    expect(() => loadConfig({
      NEXUS_API_ENV: "production",
      NEXUS_API_CORS_ORIGINS: "http://nexus.innergex.example",
    })).toThrow("NEXUS_API_CORS_ORIGINS must use https in production");
  });

  it("never accepts trust-all proxy configuration", () => {
    expect(() => loadConfig({ NEXUS_API_TRUST_PROXY: "true" })).toThrow(ApiConfigError);
    expect(() => loadConfig({ NEXUS_API_TRUST_PROXY: "*" })).toThrow(ApiConfigError);
    expect(() => loadConfig({ NEXUS_API_TRUST_PROXY: "10.0.0.0/99" })).toThrow(ApiConfigError);
    expect(() => loadConfig({ NEXUS_API_TRUST_PROXY: "proxy.internal" })).toThrow(ApiConfigError);
  });

  it.each([
    ["NEXUS_API_BODY_LIMIT_BYTES", "100"],
    ["NEXUS_API_REQUEST_TIMEOUT_MS", "0"],
    ["NEXUS_API_RATE_LIMIT_MAX", "0"],
    ["NEXUS_API_RATE_LIMIT_WINDOW_MS", "100"],
  ])("rejects invalid security limit %s=%s", (name, value) => {
    expect(() => loadConfig({ [name]: value })).toThrow(ApiConfigError);
  });
});
