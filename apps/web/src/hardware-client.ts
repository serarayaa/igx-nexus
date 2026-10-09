import { validateHardwareInventoryV2, type HardwareInventoryV2 } from "@igx-nexus/types";

export type HardwareErrorKind = "authentication" | "forbidden" | "not_found" | "unavailable" | "network" | "incompatible";
export class HardwareRequestError extends Error {
  constructor(readonly kind: HardwareErrorKind) { super("Hardware request unavailable"); this.name = "HardwareRequestError"; }
}
export type HardwareReader = (assetId: string, signal: AbortSignal) => Promise<unknown>;
export function parseHardwareResponse(value: unknown, assetId: string): HardwareInventoryV2 {
  if (validateHardwareInventoryV2(value).some(issue => issue.severity === "error") || (value as HardwareInventoryV2).assetId !== assetId) throw new HardwareRequestError("incompatible");
  return value as HardwareInventoryV2;
}
/** Same-origin session conventions match the snapshot reader; no GLPI configuration in the browser. */
export const requestHardware: HardwareReader = async (assetId, signal) => {
  let response: Response;
  try {
    response = await fetch(`/api/v2/technology/assets/${encodeURIComponent(assetId)}/hardware`, {
      method: "GET", headers: { accept: "application/json" }, cache: "no-store", credentials: "same-origin", signal,
    });
  } catch {
    signal.throwIfAborted();
    throw new HardwareRequestError("network");
  }
  if (!response.ok) throw new HardwareRequestError(({ 401: "authentication", 403: "forbidden", 404: "not_found" } as const)[response.status as 401 | 403 | 404] ?? "unavailable");
  try { return await response.json(); } catch { signal.throwIfAborted(); throw new HardwareRequestError("incompatible"); }
};

export const hardwareErrorMessages: Record<HardwareErrorKind, { title: string; detail: string; retry: boolean }> = {
  authentication: { title: "Autenticación requerida", detail: "Inicia una sesión NEXUS autorizada para consultar hardware.", retry: false },
  forbidden: { title: "Sin permiso para consultar hardware", detail: "Tu sesión no tiene autorización para esta consulta.", retry: false },
  not_found: { title: "Hardware del activo no accesible", detail: "El activo no fue encontrado dentro del alcance disponible.", retry: false },
  unavailable: { title: "Hardware temporalmente no disponible", detail: "El servicio no pudo completar la consulta. La identidad del activo sigue disponible.", retry: true },
  network: { title: "No se pudo conectar con NEXUS", detail: "Comprueba la conexión y vuelve a intentar.", retry: true },
  incompatible: { title: "Respuesta de hardware incompatible", detail: "No se mostrarán datos que no cumplan el contrato del activo.", retry: false },
};
