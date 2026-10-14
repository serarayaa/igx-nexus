import { validateSoftwareInventoryV2, type SoftwareInventoryV2 } from "@igx-nexus/types";

export type SoftwareErrorKind = "authentication" | "forbidden" | "not_found" | "unavailable" | "network" | "incompatible";
export class SoftwareRequestError extends Error {
  constructor(readonly kind: SoftwareErrorKind) { super("Software request unavailable"); this.name = "SoftwareRequestError"; }
}
export type SoftwareReader = (assetId: string, signal: AbortSignal) => Promise<unknown>;
export function parseSoftwareResponse(value: unknown, assetId: string): SoftwareInventoryV2 {
  if (validateSoftwareInventoryV2(value).some(issue => issue.severity === "error") || (value as SoftwareInventoryV2).assetId !== assetId) throw new SoftwareRequestError("incompatible");
  return value as SoftwareInventoryV2;
}
export const requestSoftware: SoftwareReader = async (assetId, signal) => {
  signal.throwIfAborted();
  let response: Response;
  try {
    response = await fetch(`/api/v2/technology/assets/${encodeURIComponent(assetId)}/software`, {
      method: "GET", headers: { accept: "application/json" }, credentials: "same-origin", cache: "no-store", signal,
    });
  } catch { signal.throwIfAborted(); throw new SoftwareRequestError("network"); }
  signal.throwIfAborted();
  if (!response.ok) throw new SoftwareRequestError(({ 401: "authentication", 403: "forbidden", 404: "not_found" } as const)[response.status as 401 | 403 | 404] ?? "unavailable");
  try { const value: unknown = await response.json(); signal.throwIfAborted(); return parseSoftwareResponse(value, assetId); }
  catch { signal.throwIfAborted(); throw new SoftwareRequestError("incompatible"); }
};
export const softwareErrorMessages: Record<SoftwareErrorKind, { title: string; detail: string; retry: boolean }> = {
  authentication: { title: "Autenticación requerida", detail: "Inicia una sesión NEXUS autorizada para consultar sistema y software.", retry: false },
  forbidden: { title: "Sin permiso para consultar software", detail: "Tu sesión no tiene autorización para esta consulta.", retry: false },
  not_found: { title: "Software del activo no accesible", detail: "El activo no se encontró dentro del alcance disponible.", retry: false },
  unavailable: { title: "Sistema y software temporalmente no disponibles", detail: "El servicio no completó la consulta; puede estar saturado o haber agotado su plazo. La identidad del activo sigue disponible.", retry: true },
  network: { title: "No se pudo conectar con NEXUS", detail: "Comprueba la conexión y vuelve a intentar.", retry: true },
  incompatible: { title: "Respuesta de software incompatible", detail: "No se mostrarán datos que no cumplan el contrato y la identidad del activo.", retry: false },
};
