export type AppRoute =
  | { readonly view: "dashboard" }
  | { readonly view: "assets" }
  | { readonly view: "asset"; readonly assetId: string };

const dashboardHashes = new Set([
  "",
  "#overview",
  "#quality",
  "#lifecycle",
  "#next-views",
]);

export function routeFromHash(hash: string): AppRoute | null {
  if (dashboardHashes.has(hash)) return { view: "dashboard" };
  if (hash === "#assets") return { view: "assets" };

  const prefix = "#assets/";
  if (!hash.startsWith(prefix)) return null;

  const encodedId = hash.slice(prefix.length);
  if (!encodedId || encodedId.includes("/")) return null;

  try {
    const assetId = decodeURIComponent(encodedId).trim();
    return assetId ? { view: "asset", assetId } : null;
  } catch {
    return null;
  }
}

export function assetHash(assetId: string): string {
  return `#assets/${encodeURIComponent(assetId)}`;
}
