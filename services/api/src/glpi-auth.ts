import {
  GlpiAuthenticationError,
  GlpiConfigurationError,
  type GlpiAccessTokenProvider,
} from "./glpi.js";

export interface GlpiServiceCredentials {
  readonly clientSecret: string;
  readonly password: string;
}

export type GlpiCredentialSource = () => Promise<GlpiServiceCredentials>;

export interface GlpiPasswordGrantTokenProviderOptions {
  readonly baseUrl: string;
  readonly clientId: string;
  readonly username: string;
  readonly credentialSource: GlpiCredentialSource;
  readonly requestTimeoutMs?: number;
  readonly refreshSkewSeconds?: number;
  readonly allowInsecureHttp?: boolean;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_REFRESH_SKEW_SECONDS = 60;
const GLPI_API_SCOPE = "api";
const GLPI_PASSWORD_GRANT = "password";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateBoundedInteger(value: number, name: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new GlpiConfigurationError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function normalizePublicIdentifier(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized || /[\r\n\0]/.test(normalized)) {
    throw new GlpiConfigurationError(`${name} must be a non-empty single-line value`);
  }
  return normalized;
}

function normalizeSecret(value: string): string {
  if (!value || value.includes("\0")) throw new GlpiAuthenticationError();
  return value;
}

function normalizeGlpiRootUrl(rawBaseUrl: string, allowInsecureHttp: boolean): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawBaseUrl);
  } catch {
    throw new GlpiConfigurationError("GLPI baseUrl must be an absolute URL");
  }

  if (parsed.protocol !== "https:" && !(allowInsecureHttp && parsed.protocol === "http:")) {
    throw new GlpiConfigurationError("GLPI baseUrl must use https unless insecure HTTP is explicitly enabled for a lab");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new GlpiConfigurationError("GLPI baseUrl must not include credentials, query parameters or fragments");
  }
  if (parsed.pathname.toLowerCase().endsWith("/api.php") || parsed.pathname.toLowerCase().endsWith("/api.php/")) {
    throw new GlpiConfigurationError("GLPI baseUrl must point to the GLPI root, not api.php");
  }
  if (!parsed.pathname.endsWith("/")) parsed.pathname += "/";
  return parsed;
}

function parseAccessTokenResponse(payload: unknown): { readonly accessToken: string; readonly expiresInSeconds: number } {
  if (!isRecord(payload)) throw new GlpiAuthenticationError();

  const tokenType = typeof payload.token_type === "string" ? payload.token_type.trim().toLowerCase() : "";
  const accessToken = typeof payload.access_token === "string" ? payload.access_token.trim() : "";
  const expiresInSeconds = payload.expires_in;

  if (
    tokenType !== "bearer" ||
    !accessToken ||
    /[\r\n]/.test(accessToken) ||
    typeof expiresInSeconds !== "number" ||
    !Number.isSafeInteger(expiresInSeconds) ||
    expiresInSeconds <= 0
  ) {
    throw new GlpiAuthenticationError();
  }

  return Object.freeze({ accessToken, expiresInSeconds });
}

async function loadCredentials(source: GlpiCredentialSource): Promise<GlpiServiceCredentials> {
  try {
    const credentials = await source();
    return Object.freeze({
      clientSecret: normalizeSecret(credentials.clientSecret),
      password: normalizeSecret(credentials.password),
    });
  } catch (error) {
    if (error instanceof GlpiAuthenticationError) throw error;
    throw new GlpiAuthenticationError();
  }
}

export function createEnvironmentGlpiCredentialSource(
  environment: NodeJS.ProcessEnv = process.env,
): GlpiCredentialSource {
  const clientSecret = environment.NEXUS_GLPI_OAUTH_CLIENT_SECRET;
  const password = environment.NEXUS_GLPI_SERVICE_PASSWORD;

  if (!clientSecret) {
    throw new GlpiConfigurationError("NEXUS_GLPI_OAUTH_CLIENT_SECRET is required for GLPI live authentication");
  }
  if (!password) {
    throw new GlpiConfigurationError("NEXUS_GLPI_SERVICE_PASSWORD is required for GLPI live authentication");
  }

  const credentials = Object.freeze({
    clientSecret: normalizeSecret(clientSecret),
    password: normalizeSecret(password),
  });
  return async () => credentials;
}

export function createGlpiPasswordGrantAccessTokenProvider(
  options: GlpiPasswordGrantTokenProviderOptions,
): GlpiAccessTokenProvider {
  const allowInsecureHttp = options.allowInsecureHttp ?? false;
  const baseUrl = normalizeGlpiRootUrl(options.baseUrl, allowInsecureHttp);
  const tokenEndpoint = new URL("api.php/token", baseUrl);
  const clientId = normalizePublicIdentifier(options.clientId, "GLPI OAuth clientId");
  const username = normalizePublicIdentifier(options.username, "GLPI service username");
  const requestTimeoutMs = validateBoundedInteger(
    options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    "GLPI OAuth requestTimeoutMs",
    100,
    60_000,
  );
  const refreshSkewSeconds = validateBoundedInteger(
    options.refreshSkewSeconds ?? DEFAULT_REFRESH_SKEW_SECONDS,
    "GLPI OAuth refreshSkewSeconds",
    0,
    3_600,
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;

  let cachedToken: { readonly value: string; readonly refreshAt: number } | undefined;
  let inFlight: Promise<string> | undefined;

  async function acquireAccessToken(): Promise<string> {
    const credentials = await loadCredentials(options.credentialSource);
    const body = new URLSearchParams({
      grant_type: GLPI_PASSWORD_GRANT,
      client_id: clientId,
      client_secret: credentials.clientSecret,
      username,
      password: credentials.password,
      scope: GLPI_API_SCOPE,
    });

    let response: Response;
    try {
      response = await fetchImpl(tokenEndpoint, {
        method: "POST",
        headers: Object.freeze({
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        }),
        body,
        redirect: "error",
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch {
      throw new GlpiAuthenticationError();
    }

    if (!response.ok) throw new GlpiAuthenticationError();

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new GlpiAuthenticationError();
    }

    const token = parseAccessTokenResponse(payload);
    const lifetimeMs = token.expiresInSeconds * 1_000;
    const requestedSkewMs = refreshSkewSeconds * 1_000;
    const effectiveSkewMs = Math.min(requestedSkewMs, Math.floor(lifetimeMs / 2));
    cachedToken = Object.freeze({
      value: token.accessToken,
      refreshAt: now() + lifetimeMs - effectiveSkewMs,
    });
    return token.accessToken;
  }

  return async () => {
    const currentTime = now();
    if (cachedToken && currentTime < cachedToken.refreshAt) return cachedToken.value;
    if (inFlight) return inFlight;

    inFlight = acquireAccessToken();
    try {
      return await inFlight;
    } finally {
      inFlight = undefined;
    }
  };
}
