import type { ApiConfig, ApiEnvironment } from "./config.js";
import {
  createEnvironmentGlpiCredentialSource,
  createGlpiPasswordGrantAccessTokenProvider,
  type GlpiCredentialSource,
} from "./glpi-auth.js";
import { createGlpiLiveTechnologyProvider } from "./glpi-provider.js";
import { createGlpiFetchTransport, GlpiConfigurationError } from "./glpi.js";
import type { TechnologyProvider } from "./provider.js";
import { createGlpiHardwareAdapter, type GlpiHardwareAdapter } from "./glpi-hardware.js";
import { createGlpiSoftwareAdapter } from "./glpi-software.js";
import type { GlpiSoftwareAdapter } from "./software-routes.js";
import { defaultSoftwareOperationLimits, guardSoftwareTransport, guardSoftwareOAuthFetch, type SoftwareOperationLimits } from "./software-operation.js";

export interface GlpiLiveRuntimeConfig {
  readonly sourceInstanceId: string;
  readonly baseUrl: string;
  readonly oauthClientId: string;
  readonly serviceUsername: string;
  readonly allowInsecureHttp: boolean;
  readonly requestTimeoutMs: number;
  readonly tokenRefreshSkewSeconds: number;
  readonly pageSize: number;
  readonly maxRecords: number;
}

export interface RuntimeTechnologyProviderOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly credentialSource?: GlpiCredentialSource;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_TOKEN_REFRESH_SKEW_SECONDS = 60;
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_RECORDS = 10_000;

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value || /[\r\n\0]/.test(value)) {
    throw new GlpiConfigurationError(`${name} is required for GLPI live mode`);
  }
  return value;
}

function parseBoolean(rawValue: string | undefined, name: string, fallback: boolean): boolean {
  if (rawValue === undefined || !rawValue.trim()) return fallback;
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new GlpiConfigurationError(`${name} must be true or false`);
}

function parseBoundedInteger(
  rawValue: string | undefined,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const normalized = rawValue?.trim() || String(fallback);
  if (!/^\d+$/.test(normalized)) {
    throw new GlpiConfigurationError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  const value = Number(normalized);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new GlpiConfigurationError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

export function loadGlpiLiveRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
  apiEnvironment: ApiEnvironment = "development",
): GlpiLiveRuntimeConfig {
  const allowInsecureHttp = parseBoolean(
    environment.NEXUS_GLPI_ALLOW_INSECURE_HTTP,
    "NEXUS_GLPI_ALLOW_INSECURE_HTTP",
    false,
  );
  if (apiEnvironment === "production" && allowInsecureHttp) {
    throw new GlpiConfigurationError("NEXUS_GLPI_ALLOW_INSECURE_HTTP must be false in production");
  }

  return Object.freeze({
    sourceInstanceId: requireValue(environment, "NEXUS_GLPI_INSTANCE_ID"),
    baseUrl: requireValue(environment, "NEXUS_GLPI_BASE_URL"),
    oauthClientId: requireValue(environment, "NEXUS_GLPI_OAUTH_CLIENT_ID"),
    serviceUsername: requireValue(environment, "NEXUS_GLPI_SERVICE_USERNAME"),
    allowInsecureHttp,
    requestTimeoutMs: parseBoundedInteger(
      environment.NEXUS_GLPI_REQUEST_TIMEOUT_MS,
      "NEXUS_GLPI_REQUEST_TIMEOUT_MS",
      DEFAULT_REQUEST_TIMEOUT_MS,
      100,
      60_000,
    ),
    tokenRefreshSkewSeconds: parseBoundedInteger(
      environment.NEXUS_GLPI_TOKEN_REFRESH_SKEW_SECONDS,
      "NEXUS_GLPI_TOKEN_REFRESH_SKEW_SECONDS",
      DEFAULT_TOKEN_REFRESH_SKEW_SECONDS,
      0,
      3_600,
    ),
    pageSize: parseBoundedInteger(
      environment.NEXUS_GLPI_PAGE_SIZE,
      "NEXUS_GLPI_PAGE_SIZE",
      DEFAULT_PAGE_SIZE,
      1,
      1_000,
    ),
    maxRecords: parseBoundedInteger(
      environment.NEXUS_GLPI_MAX_RECORDS,
      "NEXUS_GLPI_MAX_RECORDS",
      DEFAULT_MAX_RECORDS,
      1,
      100_000,
    ),
  });
}

export function createRuntimeTechnologyProvider(
  config: ApiConfig,
  options: RuntimeTechnologyProviderOptions = {},
): TechnologyProvider | undefined {
  return createRuntimeTechnologyServices(config, options)?.technologyProvider;
}

/** Snapshot, Hardware and Software share one server-selected GLPI transport and instance. */
export function createRuntimeTechnologyServices(
  config: ApiConfig,
  options: RuntimeTechnologyProviderOptions = {},
): { readonly technologyProvider: TechnologyProvider; readonly hardwareAdapter: GlpiHardwareAdapter; readonly softwareAdapter: GlpiSoftwareAdapter; readonly softwareOperationLimits: SoftwareOperationLimits } | undefined {
  if (config.providerMode !== "live") return undefined;

  const environment = options.environment ?? process.env;
  const glpiConfig = loadGlpiLiveRuntimeConfig(environment, config.environment);
  const credentialSource = options.credentialSource ?? createEnvironmentGlpiCredentialSource(environment);
  const sharedFetch = options.fetchImpl;
  const defaults = defaultSoftwareOperationLimits;
  const softwareOperationLimits: SoftwareOperationLimits = Object.freeze({
    deadlineMs: parseBoundedInteger(environment.NEXUS_SOFTWARE_DEADLINE_MS, "NEXUS_SOFTWARE_DEADLINE_MS", defaults.deadlineMs, 1, 60000),
    maxRequests: parseBoundedInteger(environment.NEXUS_SOFTWARE_MAX_REQUESTS, "NEXUS_SOFTWARE_MAX_REQUESTS", defaults.maxRequests, 1, 2000),
    maxRecords: parseBoundedInteger(environment.NEXUS_SOFTWARE_MAX_RECORDS, "NEXUS_SOFTWARE_MAX_RECORDS", defaults.maxRecords, 1, 100000),
    maxConcurrent: parseBoundedInteger(environment.NEXUS_SOFTWARE_MAX_CONCURRENT, "NEXUS_SOFTWARE_MAX_CONCURRENT", defaults.maxConcurrent, 1, 16),
  });

  const accessTokenProvider = createGlpiPasswordGrantAccessTokenProvider({
    baseUrl: glpiConfig.baseUrl,
    clientId: glpiConfig.oauthClientId,
    username: glpiConfig.serviceUsername,
    credentialSource,
    requestTimeoutMs: glpiConfig.requestTimeoutMs,
    refreshSkewSeconds: glpiConfig.tokenRefreshSkewSeconds,
    allowInsecureHttp: glpiConfig.allowInsecureHttp,
    fetchImpl: guardSoftwareOAuthFetch(sharedFetch ?? fetch),
    ...(options.now === undefined ? {} : { now: options.now }),
  });

  const transport = guardSoftwareTransport(createGlpiFetchTransport({
    baseUrl: glpiConfig.baseUrl,
    accessTokenProvider,
    requestTimeoutMs: glpiConfig.requestTimeoutMs,
    allowInsecureHttp: glpiConfig.allowInsecureHttp,
    ...(sharedFetch === undefined ? {} : { fetchImpl: sharedFetch }),
  }));

  const readerOptions = {
    transport,
    sourceInstanceId: glpiConfig.sourceInstanceId,
    pageSize: glpiConfig.pageSize,
    maxRecords: glpiConfig.maxRecords,
    ...(options.now === undefined ? {} : { now: () => new Date(options.now!()) }),
  };
  return {
    technologyProvider: createGlpiLiveTechnologyProvider(readerOptions),
    hardwareAdapter: createGlpiHardwareAdapter(readerOptions),
    softwareAdapter: createGlpiSoftwareAdapter({ ...readerOptions, requestTimeoutMs: glpiConfig.requestTimeoutMs }),
    softwareOperationLimits,
  };
}
