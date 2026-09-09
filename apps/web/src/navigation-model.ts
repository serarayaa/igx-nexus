export type AppRoute =
  | { readonly view: "dashboard" }
  | { readonly view: "assets" }
  | { readonly view: "health" }
  | { readonly view: "asset"; readonly assetId: string }
  | { readonly view: "relations"; readonly assetId: string }
  | { readonly view: "label"; readonly assetId: string }
  | { readonly view: "qr"; readonly locator: string };

const dashboardHashes = new Set([
  "",
  "#overview",
  "#quality",
  "#lifecycle",
  "#next-views",
]);

function decodeSegment(value: string): string | null {
  if (!value || value.includes("/")) return null;
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

export function routeFromHash(hash: string): AppRoute | null {
  if (dashboardHashes.has(hash)) return { view: "dashboard" };
  if (hash === "#health") return { view: "health" };
  if (hash === "#assets") return { view: "assets" };

  const qrPrefix = "#q/";
  if (hash.startsWith(qrPrefix)) {
    const locator = decodeSegment(hash.slice(qrPrefix.length));
    return locator ? { view: "qr", locator } : null;
  }

  const assetPrefix = "#assets/";
  if (!hash.startsWith(assetPrefix)) return null;
  const remainder = hash.slice(assetPrefix.length);
  const labelSuffix = "/label";
  if (remainder.endsWith(labelSuffix)) {
    const assetId = decodeSegment(remainder.slice(0, -labelSuffix.length));
    return assetId ? { view: "label", assetId } : null;
  }

  const relationsSuffix = "/relations";
  if (remainder.endsWith(relationsSuffix)) {
    const assetId = decodeSegment(remainder.slice(0, -relationsSuffix.length));
    return assetId ? { view: "relations", assetId } : null;
  }

  const assetId = decodeSegment(remainder);
  return assetId ? { view: "asset", assetId } : null;
}

export function assetHash(assetId: string): string {
  return `#assets/${encodeURIComponent(assetId)}`;
}

export function labelHash(assetId: string): string {
  return `${assetHash(assetId)}/label`;
}

export function relationsHash(assetId: string): string {
  return `${assetHash(assetId)}/relations`;
}

/** Ruta interna que simula el resolver para la demo; NO es el payload del QR físico. */
export function demoQrHash(locator: string): string {
  return `#q/${encodeURIComponent(locator)}`;
}
