import { describe, expect, it, vi } from "vitest";
import { GlpiAuthenticationError, GlpiConfigurationError } from "./glpi.js";
import {
  createEnvironmentGlpiCredentialSource,
  createGlpiPasswordGrantAccessTokenProvider,
  type GlpiCredentialSource,
} from "./glpi-auth.js";

const credentials: GlpiCredentialSource = async () => Object.freeze({
  clientSecret: "client-secret-value",
  password: "service-password-value",
});

function tokenResponse(accessToken = "access-token", expiresIn = 3_600): Response {
  return new Response(JSON.stringify({ token_type: "Bearer", expires_in: expiresIn, access_token: accessToken }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("GLPI OAuth service identity", () => {
  it("uses Password Grant with exact api scope and keeps credentials out of the URL", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe("https://glpi.example/api.php/token");
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("error");
      expect(init?.headers).toEqual({
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      });

      const encodedBody = String(init?.body);
      const body = new URLSearchParams(encodedBody);
      expect(body.get("grant_type")).toBe("password");
      expect(body.get("scope")).toBe("api");
      expect(body.get("client_id")).toBe("nexus-client");
      expect(body.get("username")).toBe("svc-nexus");
      expect(body.get("client_secret")).toBe("client-secret-value");
      expect(body.get("password")).toBe("service-password-value");
      expect(String(input)).not.toContain("client-secret-value");
      expect(String(input)).not.toContain("service-password-value");
      return tokenResponse();
    }) as unknown as typeof fetch;

    const provider = createGlpiPasswordGrantAccessTokenProvider({
      baseUrl: "https://glpi.example",
      clientId: "nexus-client",
      username: "svc-nexus",
      credentialSource: credentials,
      fetchImpl,
    });

    await expect(provider()).resolves.toBe("access-token");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("caches the access token until the refresh skew is reached", async () => {
    let now = 0;
    let sequence = 0;
    const fetchImpl = vi.fn(async () => tokenResponse(`token-${++sequence}`, 120)) as unknown as typeof fetch;
    const provider = createGlpiPasswordGrantAccessTokenProvider({
      baseUrl: "https://glpi.example",
      clientId: "nexus-client",
      username: "svc-nexus",
      credentialSource: credentials,
      refreshSkewSeconds: 30,
      now: () => now,
      fetchImpl,
    });

    await expect(provider()).resolves.toBe("token-1");
    now = 89_000;
    await expect(provider()).resolves.toBe("token-1");
    now = 90_000;
    await expect(provider()).resolves.toBe("token-2");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("renews short-lived tokens no later than half their lifetime when configured skew is larger", async () => {
    let now = 0;
    let sequence = 0;
    const fetchImpl = vi.fn(async () => tokenResponse(`short-${++sequence}`, 10)) as unknown as typeof fetch;
    const provider = createGlpiPasswordGrantAccessTokenProvider({
      baseUrl: "https://glpi.example",
      clientId: "nexus-client",
      username: "svc-nexus",
      credentialSource: credentials,
      refreshSkewSeconds: 60,
      now: () => now,
      fetchImpl,
    });

    await expect(provider()).resolves.toBe("short-1");
    now = 4_999;
    await expect(provider()).resolves.toBe("short-1");
    now = 5_000;
    await expect(provider()).resolves.toBe("short-2");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent token acquisition", async () => {
    const fetchImpl = vi.fn(async () => tokenResponse("shared-token", 120)) as unknown as typeof fetch;
    const provider = createGlpiPasswordGrantAccessTokenProvider({
      baseUrl: "https://glpi.example",
      clientId: "nexus-client",
      username: "svc-nexus",
      credentialSource: credentials,
      fetchImpl,
    });

    const [first, second, third] = await Promise.all([provider(), provider(), provider()]);
    expect([first, second, third]).toEqual(["shared-token", "shared-token", "shared-token"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fails closed on invalid token payloads", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ token_type: "Bearer", expires_in: 3600 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    const provider = createGlpiPasswordGrantAccessTokenProvider({
      baseUrl: "https://glpi.example",
      clientId: "nexus-client",
      username: "svc-nexus",
      credentialSource: credentials,
      fetchImpl,
    });

    await expect(provider()).rejects.toBeInstanceOf(GlpiAuthenticationError);
  });

  it("does not copy upstream bodies or secret values into authentication errors", async () => {
    const fetchImpl = vi.fn(async () => new Response(
      "invalid client client-secret-value / service-password-value",
      { status: 401 },
    )) as unknown as typeof fetch;
    const provider = createGlpiPasswordGrantAccessTokenProvider({
      baseUrl: "https://glpi.example",
      clientId: "nexus-client",
      username: "svc-nexus",
      credentialSource: credentials,
      fetchImpl,
    });

    let thrown: unknown;
    try {
      await provider();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(GlpiAuthenticationError);
    expect(String(thrown)).not.toContain("client-secret-value");
    expect(String(thrown)).not.toContain("service-password-value");
    expect(String(thrown)).not.toContain("invalid client");
  });

  it("normalizes secret-source failures without leaking backend details", async () => {
    const credentialSource: GlpiCredentialSource = async () => {
      throw new Error("vault-path=innergex/prod/glpi secret=do-not-leak");
    };
    const fetchImpl = vi.fn(async () => tokenResponse()) as unknown as typeof fetch;
    const provider = createGlpiPasswordGrantAccessTokenProvider({
      baseUrl: "https://glpi.example",
      clientId: "nexus-client",
      username: "svc-nexus",
      credentialSource,
      fetchImpl,
    });

    let thrown: unknown;
    try {
      await provider();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(GlpiAuthenticationError);
    expect(String(thrown)).not.toContain("vault-path");
    expect(String(thrown)).not.toContain("do-not-leak");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("loads lab credentials from environment without adding them to public configuration", async () => {
    const source = createEnvironmentGlpiCredentialSource({
      NEXUS_GLPI_OAUTH_CLIENT_SECRET: "secret-from-env",
      NEXUS_GLPI_SERVICE_PASSWORD: "password-from-env",
    });

    await expect(source()).resolves.toEqual({
      clientSecret: "secret-from-env",
      password: "password-from-env",
    });
  });

  it("rejects missing environment secrets and insecure HTTP by default", () => {
    expect(() => createEnvironmentGlpiCredentialSource({})).toThrow(GlpiConfigurationError);
    expect(() => createGlpiPasswordGrantAccessTokenProvider({
      baseUrl: "http://glpi.example",
      clientId: "nexus-client",
      username: "svc-nexus",
      credentialSource: credentials,
    })).toThrow(GlpiConfigurationError);
  });
});
