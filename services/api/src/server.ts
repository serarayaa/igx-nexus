import { pathToFileURL } from "node:url";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { loadConfig, type ApiConfig } from "./config.js";
import {
  createRuntimeTechnologyProvider,
  type RuntimeTechnologyProviderOptions,
} from "./glpi-runtime.js";

export interface SignalRuntime {
  exitCode: NodeJS.Process["exitCode"];
  once(signal: NodeJS.Signals, listener: () => void): unknown;
}

export interface ShutdownController {
  shutdown(signal: NodeJS.Signals): Promise<void>;
}

export function installShutdownHandlers(
  app: FastifyInstance,
  runtime: SignalRuntime = process,
): ShutdownController {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, "shutdown requested");

    try {
      await app.close();
    } catch (error) {
      runtime.exitCode = 1;
      app.log.error({ err: error, signal }, "shutdown failed");
    }
  };

  runtime.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  runtime.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  return { shutdown };
}

export async function startServer(
  config: ApiConfig = loadConfig(),
  runtimeOptions: RuntimeTechnologyProviderOptions = {},
): Promise<FastifyInstance> {
  const technologyProvider = createRuntimeTechnologyProvider(config, runtimeOptions);
  const app = await buildApp({
    config,
    ...(technologyProvider === undefined ? {} : { technologyProvider }),
  });
  installShutdownHandlers(app);
  await app.listen({ host: config.host, port: config.port });
  return app;
}

async function main(): Promise<void> {
  try {
    await startServer();
  } catch (error) {
    console.error("NEXUS API failed to start", error);
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (entrypoint === import.meta.url) {
  void main();
}
