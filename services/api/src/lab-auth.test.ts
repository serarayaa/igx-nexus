import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";
import {
  createLabAuthenticationProvider,
  LabAuthenticationConfigurationError,
} from "./lab-auth.js";

describe("Live Lab bearer authentication", () => {
  it("is disabled when no lab token is configured", () => {
    const config = loadConfig({ NEXUS_API_ENV: "test" });
    expect(createLabAuthenticationProvider(config, {})).toBeUndefined();
  });

  it("refuses lab auth in production", () => {
    const config = loadConfig({ NEXUS_API_ENV: "production", NEXUS_PROVIDER_MODE: "live" });
    expect(() => createLabAuthenticationProvider(config, {
      NEXUS_LAB_AUTH_TOKEN: "a".repeat(32),
    })).toThrow(LabAuthenticationConfigurationError);
  });

  it("refuses lab auth when the API is exposed beyond loopback", () => {
    const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_API_HOST: "0.0.0.0" });
    expect(() => createLabAuthenticationProvider(config, {
      NEXUS_LAB_AUTH_TOKEN: "a".repeat(32),
    })).toThrow(/loopback/);
  });

  it("requires a sufficiently long random token", () => {
    const config = loadConfig({ NEXUS_API_ENV: "test" });
    expect(() => createLabAuthenticationProvider(config, {
      NEXUS_LAB_AUTH_TOKEN: "short-token",
    })).toThrow(/32 characters/);
  });
});
