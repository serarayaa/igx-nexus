import {
  createGlpiTechnologyProvider,
  parseGlpiComputerRecord,
  type GlpiTechnologyProviderOptions,
} from "./glpi.js";
import type { TechnologyProvider } from "./provider.js";

const COMPUTER_COLLECTION_PATH = "Assets/Computer";

/**
 * Compone el adapter GLPI como TechnologyProvider Live con un probe read-only y
 * acotado. El probe valida conectividad/auth y forma mínima del payload sin
 * descargar el inventario completo ni propagar detalles del upstream.
 */
export function createGlpiLiveTechnologyProvider(options: GlpiTechnologyProviderOptions): TechnologyProvider {
  const snapshotProvider = createGlpiTechnologyProvider(options);

  return Object.freeze({
    descriptor: snapshotProvider.descriptor,
    getSnapshot: () => snapshotProvider.getSnapshot(),
    async checkAvailability() {
      try {
        const payload = await options.transport.get(COMPUTER_COLLECTION_PATH, { start: 0, limit: 1 });
        if (!Array.isArray(payload) || payload.length > 1) return "unavailable";
        for (const record of payload) parseGlpiComputerRecord(record);
        return "ready";
      } catch {
        return "unavailable";
      }
    },
  });
}
