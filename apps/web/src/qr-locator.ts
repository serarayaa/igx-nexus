import type { Asset } from "./asset-model";

export type QrLocatorStatus = "active" | "revoked";

export interface QrLocatorRecord {
  readonly locator: string;
  readonly assetId: string;
  readonly status: QrLocatorStatus;
}

export interface QrEnvironment {
  readonly mode: "demo" | "production";
  readonly baseUrl: string;
}

/**
 * Dominio reservado por RFC para ejemplos. No representa infraestructura de Innergex
 * ni pretende resolver en Internet. La base productiva se definirá en despliegue.
 */
export const DEMO_QR_ENVIRONMENT: QrEnvironment = {
  mode: "demo",
  baseUrl: "https://nexus-demo.invalid",
};

const LOCATOR_PATTERN = /^[a-z0-9][a-z0-9_-]{14,62}$/;
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const DEMO_SEEDS = [0x13579bdf, 0x2468ace0, 0x9e3779b9] as const;

function fnv1a32(value: string, seed: number): number {
  let hash = (FNV_OFFSET ^ seed) >>> 0;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Fixture determinista para la demo. Parece opaco respecto del Asset.id, pero NO es
 * criptografía ni un mecanismo de autorización y nunca debe migrarse como locator
 * productivo. En producción la NEXUS API deberá emitir y persistir locators aleatorios.
 */
export function demoLocatorForAsset(assetId: string): string {
  const normalized = assetId.trim();
  if (!normalized) throw new Error("Asset id is required to derive a demo locator.");
  const body = DEMO_SEEDS.map((seed) => fnv1a32(normalized, seed).toString(36).padStart(7, "0")).join("");
  return `demo-${body}`;
}

export function isValidQrLocator(locator: string): boolean {
  return LOCATOR_PATTERN.test(locator);
}

export function parseQrLocator(locator: string): string {
  const normalized = locator.trim().toLowerCase();
  if (!isValidQrLocator(normalized)) throw new Error("Invalid QR locator.");
  return normalized;
}

export function locatorRecordForDemoAsset(asset: Pick<Asset, "id">): QrLocatorRecord {
  return { locator: demoLocatorForAsset(asset.id), assetId: asset.id, status: "active" };
}

export function buildQrPayload(locator: string, environment: QrEnvironment): string {
  const normalizedLocator = parseQrLocator(locator);
  const base = new URL(environment.baseUrl);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    throw new Error("QR base URL must be an HTTPS origin without credentials, query or fragment.");
  }
  const root = base.toString().replace(/\/$/, "");
  return `${root}/q/${encodeURIComponent(normalizedLocator)}`;
}

export function resolveDemoLocator(locator: string, assets: readonly Pick<Asset, "id">[]): string | null {
  let normalized: string;
  try {
    normalized = parseQrLocator(locator);
  } catch {
    return null;
  }
  const asset = assets.find((candidate) => demoLocatorForAsset(candidate.id) === normalized);
  return asset?.id ?? null;
}
