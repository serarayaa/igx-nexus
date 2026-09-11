export const apiEnvironments = ["development", "test", "production"] as const;
export type ApiEnvironment = (typeof apiEnvironments)[number];

export const apiLogLevels = ["trace", "debug", "info", "warn", "error", "fatal", "silent"] as const;
export type ApiLogLevel = (typeof apiLogLevels)[number];

export interface ApiConfig {
  readonly environment: ApiEnvironment;
  readonly host: string;
  readonly port: number;
  readonly logLevel: ApiLogLevel;
}

export class ApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigError";
  }
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3100;

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

function parsePort(rawValue: string): number {
  if (!/^\d+$/.test(rawValue)) {
    throw new ApiConfigError("NEXUS_API_PORT must be an integer between 1 and 65535");
  }

  const port = Number(rawValue);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new ApiConfigError("NEXUS_API_PORT must be an integer between 1 and 65535");
  }
  return port;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const apiEnvironment = parseEnum(
    environment.NEXUS_API_ENV?.trim() || "development",
    apiEnvironments,
    "NEXUS_API_ENV",
  );

  const host = environment.NEXUS_API_HOST?.trim() || DEFAULT_HOST;
  const port = parsePort(environment.NEXUS_API_PORT?.trim() || String(DEFAULT_PORT));
  const defaultLogLevel = apiEnvironment === "test" ? "silent" : "info";
  const logLevel = parseEnum(
    environment.NEXUS_API_LOG_LEVEL?.trim() || defaultLogLevel,
    apiLogLevels,
    "NEXUS_API_LOG_LEVEL",
  );

  return Object.freeze({ environment: apiEnvironment, host, port, logLevel });
}
