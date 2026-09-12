import { isIP } from "node:net";

export const apiEnvironments = ["development", "test", "production"] as const;
export type ApiEnvironment = (typeof apiEnvironments)[number];

export const apiLogLevels = ["trace", "debug", "info", "warn", "error", "fatal", "silent"] as const;
export type ApiLogLevel = (typeof apiLogLevels)[number];

export interface ApiConfig {
  readonly environment: ApiEnvironment;
  readonly host: string;
  readonly port: number;
  readonly logLevel: ApiLogLevel;
  readonly corsOrigins: readonly string[];
  readonly bodyLimitBytes: number;
  readonly requestTimeoutMs: number;
  readonly rateLimitMax: number;
  readonly rateLimitWindowMs: number;
  readonly trustedProxies: readonly string[];
}

export class ApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigError";
  }
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3100;
const DEFAULT_BODY_LIMIT_BYTES = 1_048_576;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT_MAX = 120;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

function parseEnum<const T extends readonly string[]>(
  rawValue: string,
  allowed: T,
  variableName: string,
): T[number] {
  if (!allowed.includes(rawValue as T[number])) {
    throw new ApiConfigError(`${variableName} must be one of: ${allowed.join(", ")}`);
  }
  return rawValue as T[number];
}

function parseBoundedInteger(
  rawValue: string,
  variableName: string,
  minimum: number,
  maximum: number,
): number {
  if (!/^\d+$/.test(rawValue)) {
    throw new ApiConfigError(`${variableName} must be an integer between ${minimum} and ${maximum}`);
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new ApiConfigError(`${variableName} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function parseCsv(rawValue: string | undefined): string[] {
  if (!rawValue?.trim()) return [];
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseCorsOrigins(rawValue: string | undefined, environment: ApiEnvironment): readonly string[] {
  const origins = parseCsv(rawValue).map((origin) => {
    if (origin === "*") {
      throw new ApiConfigError("NEXUS_API_CORS_ORIGINS must not contain wildcard origins");
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new ApiConfigError(`NEXUS_API_CORS_ORIGINS contains an invalid origin: ${origin}`);
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.origin === "null"
    ) {
      throw new ApiConfigError(`NEXUS_API_CORS_ORIGINS contains an invalid origin: ${origin}`);
    }

    if (environment === "production" && parsed.protocol !== "https:") {
      throw new ApiConfigError("NEXUS_API_CORS_ORIGINS must use https in production");
    }

    return parsed.origin;
  });

  return Object.freeze([...new Set(origins)]);
}

function isValidIpOrCidr(value: string): boolean {
  const [address, prefix, ...rest] = value.split("/");
  if (!address || rest.length > 0) return false;

  const family = isIP(address);
  if (family === 0) return false;
  if (prefix === undefined) return true;
  if (!/^\d+$/.test(prefix)) return false;

  const numericPrefix = Number(prefix);
  const maximum = family === 4 ? 32 : 128;
  return numericPrefix >= 0 && numericPrefix <= maximum;
}

function parseTrustedProxies(rawValue: string | undefined): readonly string[] {
  const proxies = parseCsv(rawValue);
  for (const proxy of proxies) {
    if (proxy === "*" || proxy.toLowerCase() === "true" || !isValidIpOrCidr(proxy)) {
      throw new ApiConfigError(
        "NEXUS_API_TRUST_PROXY must contain only explicit IP/CIDR entries; trust-all is forbidden",
      );
    }
  }
  return Object.freeze([...new Set(proxies)]);
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const apiEnvironment = parseEnum(
    environment.NEXUS_API_ENV?.trim() || "development",
    apiEnvironments,
    "NEXUS_API_ENV",
  );

  const host = environment.NEXUS_API_HOST?.trim() || DEFAULT_HOST;
  const port = parseBoundedInteger(
    environment.NEXUS_API_PORT?.trim() || String(DEFAULT_PORT),
    "NEXUS_API_PORT",
    1,
    65_535,
  );
  const defaultLogLevel = apiEnvironment === "test" ? "silent" : "info";
  const logLevel = parseEnum(
    environment.NEXUS_API_LOG_LEVEL?.trim() || defaultLogLevel,
    apiLogLevels,
    "NEXUS_API_LOG_LEVEL",
  );

  const corsOrigins = parseCorsOrigins(environment.NEXUS_API_CORS_ORIGINS, apiEnvironment);
  const bodyLimitBytes = parseBoundedInteger(
    environment.NEXUS_API_BODY_LIMIT_BYTES?.trim() || String(DEFAULT_BODY_LIMIT_BYTES),
    "NEXUS_API_BODY_LIMIT_BYTES",
    1_024,
    10_485_760,
  );
  const requestTimeoutMs = parseBoundedInteger(
    environment.NEXUS_API_REQUEST_TIMEOUT_MS?.trim() || String(DEFAULT_REQUEST_TIMEOUT_MS),
    "NEXUS_API_REQUEST_TIMEOUT_MS",
    1_000,
    300_000,
  );
  const rateLimitMax = parseBoundedInteger(
    environment.NEXUS_API_RATE_LIMIT_MAX?.trim() || String(DEFAULT_RATE_LIMIT_MAX),
    "NEXUS_API_RATE_LIMIT_MAX",
    1,
    100_000,
  );
  const rateLimitWindowMs = parseBoundedInteger(
    environment.NEXUS_API_RATE_LIMIT_WINDOW_MS?.trim() || String(DEFAULT_RATE_LIMIT_WINDOW_MS),
    "NEXUS_API_RATE_LIMIT_WINDOW_MS",
    1_000,
    3_600_000,
  );
  const trustedProxies = parseTrustedProxies(environment.NEXUS_API_TRUST_PROXY);

  return Object.freeze({
    environment: apiEnvironment,
    host,
    port,
    logLevel,
    corsOrigins,
    bodyLimitBytes,
    requestTimeoutMs,
    rateLimitMax,
    rateLimitWindowMs,
    trustedProxies,
  });
}
