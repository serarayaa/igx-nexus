import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "./config.js";
import { GlpiConfigurationError } from "./glpi.js";
import {
  createRuntimeTechnologyProvider,
  loadGlpiLiveRuntimeConfig,
} from "./glpi-runtime.js";

const liveEnvironment = Object.freeze({
  NEXUS_GLPI_BASE_URL: "https://glpi.example",
  NEXUS_GLPI_OAUTH_CLIENT_ID: "nexus-client",
  NEXUS_GLPI_SERVICE_USERNAME: "svc-nexus",
});

describe("GLPI live runtime composition", () => {
  it("keeps demo mode independent from GLPI configuration", () => {
    const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "demo" });
    expect(createRuntimeTechnologyProvider(config, { environment: {} })).toBeUndefined();
  });

  it("loads only non-secret GLPI runtime configuration", () => {
    expect(loadGlpiLiveRuntimeConfig({
      ...liveEnvironment,
      NEXUS_GLPI_OAUTH_CLIENT_SECRET: "must-not-appear",
      NEXUS_GLPI_SERVICE_PASSWORD: "must-not-appear-either",
      NEXUS_GLPI_REQUEST_TIMEOUT_MS: "15000",
      NEXUS_GLPI_TOKEN_REFRESH_SKEW_SECONDS: "45",
      NEXUS_GLPI_PAGE_SIZE: "50",
      NEXUS_GLPI_MAX_RECORDS: "5000",
    }, "test")).toEqual({
      baseUrl: "https://glpi.example",
      oauthClientId: "nexus-client",
      serviceUsername: "svc-nexus",
      allowInsecureHttp: false,
      requestTimeoutMs: 15_000,
      tokenRefreshSkewSeconds: 45,
      pageSize: 50,
      maxRecords: 5_000,
    });
  });

  it("fails closed when live configuration or environment secrets are missing", () => {
    expect(() => loadGlpiLiveRuntimeConfig({}, "test")).toThrow(GlpiConfigurationError);

    const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" });
    expect(() => createRuntimeTechnologyProvider(config, { environment: liveEnvironment })).toThrow(
      "NEXUS_GLPI_OAUTH_CLIENT_SECRET is required",
    );
  });

  it("never allows insecure GLPI HTTP in production", () => {
    expect(() => loadGlpiLiveRuntimeConfig({
      ...liveEnvironment,
      NEXUS_GLPI_ALLOW_INSECURE_HTTP: "true",
    }, "production")).toThrow("NEXUS_GLPI_ALLOW_INSECURE_HTTP must be false in production");
  });

  it("composes OAuth token acquisition, GLPI transport and the live TechnologyProvider", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === "https://glpi.example/api.php/token") {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({
          token_type: "Bearer",
          expires_in: 3600,
          access_token: "runtime-token",
        }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      expect(url).toContain("https://glpi.example/api.php/v2.3/Assets/Computer");
      expect(init?.method).toBe("GET");
      expect(init?.headers).toMatchObject({ authorization: "Bearer runtime-token" });
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" });
    const provider = createRuntimeTechnologyProvider(config, {
      environment: liveEnvironment,
      credentialSource: async () => Object.freeze({
        clientSecret: "client-secret",
        password: "service-password",
      }),
      fetchImpl,
      now: () => 0,
    });

    expect(provider?.descriptor.mode).toBe("live");
    await expect(provider?.checkAvailability?.()).resolves.toBe("ready");
    await expect(provider?.getSnapshot()).resolves.toMatchObject({ assets: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["NEXUS_GLPI_ALLOW_INSECURE_HTTP", "yes"],
    ["NEXUS_GLPI_REQUEST_TIMEOUT_MS", "0"],
    ["NEXUS_GLPI_TOKEN_REFRESH_SKEW_SECONDS", "3601"],
    ["NEXUS_GLPI_PAGE_SIZE", "0"],
    ["NEXUS_GLPI_MAX_RECORDS", "100001"],
  ])("rejects invalid GLPI runtime setting %s=%s", (name, value) => {
    expect(() => loadGlpiLiveRuntimeConfig({ ...liveEnvironment, [name]: value }, "test")).toThrow(
      GlpiConfigurationError,
    );
  });
});
