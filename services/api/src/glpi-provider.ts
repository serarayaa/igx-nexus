import {
  createGlpiTechnologyProvider,
  parseGlpiComputerRecord,
  type GlpiTechnologyProviderOptions,
} from "./glpi.js";
import type { ProviderAvailability, TechnologyProvider } from "./provider.js";

const COMPUTER_COLLECTION_PATH = "Assets/Computer";
const READINESS_CACHE_TTL_MS = 5_000;

/**
 * Compone el adapter GLPI como TechnologyProvider Live con un probe read-only y
 * acotado. El probe valida conectividad/auth y forma mínima del payload sin
 * descargar el inventario completo ni propagar detalles del upstream.
 */
export function createGlpiLiveTechnologyProvider(options: GlpiTechnologyProviderOptions): TechnologyProvider {
  const snapshotProvider = createGlpiTechnologyProvider(options);
  let cachedAvailability: { readonly value: ProviderAvailability; readonly expiresAt: number } | undefined;
  let inFlightProbe: Promise<ProviderAvailability> | undefined;

  async function probeAvailability(): Promise<ProviderAvailability> {
    const now = Date.now();
    if (cachedAvailability && now < cachedAvailability.expiresAt) return cachedAvailability.value;
    if (inFlightProbe) return inFlightProbe;

    inFlightProbe = (async () => {
      try {
        const payload = await options.transport.get(COMPUTER_COLLECTION_PATH, { start: 0, limit: 1 });
        if (!Array.isArray(payload) || payload.length > 1) return "unavailable";
        for (const record of payload) parseGlpiComputerRecord(record);
        return "ready";
      } catch {
        return "unavailable";
      }
    })();

    try {
      const value = await inFlightProbe;
      cachedAvailability = Object.freeze({ value, expiresAt: Date.now() + READINESS_CACHE_TTL_MS });
      return value;
    } finally {
      inFlightProbe = undefined;
    }
  }

  return Object.freeze({
    descriptor: snapshotProvider.descriptor,
    getSnapshot: () => snapshotProvider.getSnapshot(),
    checkAvailability: probeAvailability,
  });
}
