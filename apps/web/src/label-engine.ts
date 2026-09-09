import type { Asset } from "./asset-model";
import { encodeQrMatrix, type QrCodeMatrix } from "./qr-code";
import { buildQrPayload, type QrEnvironment } from "./qr-locator";

export type LabelDpi = 203 | 300;
export type LabelProfileId = "25x15" | "30x20" | "40x25" | "50x25" | "50x30" | "60x40";

export interface LabelProfile {
  readonly id: LabelProfileId;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly label: string;
}

export interface LabelContentOptions {
  readonly branding: boolean;
  readonly nexusId: boolean;
  readonly name: boolean;
  readonly assetTag: boolean;
}

export interface LabelModel {
  readonly profile: LabelProfile;
  readonly dpi: LabelDpi;
  readonly locator: string;
  readonly payload: string;
  readonly qr: QrCodeMatrix;
  readonly quietZoneModules: 4;
  readonly modulePixels: number;
  readonly moduleMm: number;
  readonly qrPhysicalMm: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly visible: {
    readonly branding: boolean;
    readonly nexusId: string | null;
    readonly name: string | null;
    readonly assetTag: string | null;
  };
}

export interface LabelOutputRenderer {
  readonly kind: "svg";
  readonly mimeType: "image/svg+xml";
  readonly extension: "svg";
  render(model: LabelModel): string;
}

/** Contrato futuro: Zebra/Brother/EPL/ZPL/browser no deben contaminar el core. */
export interface PrintAdapter {
  readonly id: string;
  readonly label: string;
  print(model: LabelModel): Promise<void>;
}

export const LABEL_PROFILES: readonly LabelProfile[] = [
  { id: "25x15", widthMm: 25, heightMm: 15, label: "25 × 15 mm" },
  { id: "30x20", widthMm: 30, heightMm: 20, label: "30 × 20 mm" },
  { id: "40x25", widthMm: 40, heightMm: 25, label: "40 × 25 mm" },
  { id: "50x25", widthMm: 50, heightMm: 25, label: "50 × 25 mm" },
  { id: "50x30", widthMm: 50, heightMm: 30, label: "50 × 30 mm" },
  { id: "60x40", widthMm: 60, heightMm: 40, label: "60 × 40 mm" },
] as const;

export const DEFAULT_LABEL_PROFILE = LABEL_PROFILES.find((profile) => profile.id === "50x25")!;
export const DEFAULT_LABEL_OPTIONS: LabelContentOptions = { branding: true, nexusId: true, name: true, assetTag: false };
const QUIET_ZONE_MODULES = 4 as const;
const MM_PER_INCH = 25.4;

export function mmToPixels(mm: number, dpi: LabelDpi): number {
  if (!Number.isFinite(mm) || mm <= 0) throw new Error("Label dimension must be a positive number.");
  return Math.round(mm / MM_PER_INCH * dpi);
}

function safeText(value: string | null | undefined, maxLength: number): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  const chars = [...normalized];
  return chars.length <= maxLength ? normalized : `${chars.slice(0, Math.max(1, maxLength - 1)).join("")}…`;
}

export function buildLabelModel(
  asset: Asset,
  locator: string,
  environment: QrEnvironment,
  profile: LabelProfile = DEFAULT_LABEL_PROFILE,
  dpi: LabelDpi = 203,
  options: LabelContentOptions = DEFAULT_LABEL_OPTIONS,
): LabelModel {
  const payload = buildQrPayload(locator, environment);
  const qr = encodeQrMatrix(payload);
  const totalQrModules = qr.size + QUIET_ZONE_MODULES * 2;
  const maximumQrMm = Math.min(profile.heightMm - 2, profile.widthMm * 0.46);
  const maximumQrPixels = Math.floor(maximumQrMm / MM_PER_INCH * dpi);
  const modulePixels = Math.floor(maximumQrPixels / totalQrModules);
  if (modulePixels < 2) throw new Error(`Label profile ${profile.label} is too small for a robust QR at ${dpi} DPI.`);
  const moduleMm = modulePixels / dpi * MM_PER_INCH;
  const qrPhysicalMm = moduleMm * totalQrModules;
  const nameLimit = profile.widthMm <= 30 ? 14 : profile.widthMm <= 40 ? 22 : 30;

  return {
    profile,
    dpi,
    locator,
    payload,
    qr,
    quietZoneModules: QUIET_ZONE_MODULES,
    modulePixels,
    moduleMm,
    qrPhysicalMm,
    pixelWidth: mmToPixels(profile.widthMm, dpi),
    pixelHeight: mmToPixels(profile.heightMm, dpi),
    visible: {
      branding: options.branding,
      nexusId: options.nexusId ? safeText(asset.id, 20) : null,
      name: options.name ? safeText(asset.name, nameLimit) : null,
      assetTag: options.assetTag ? safeText(asset.assetTag, 20) : null,
    },
  };
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function n(value: number): string {
  return Number(value.toFixed(4)).toString();
}

export function renderLabelSvg(model: LabelModel): string {
  const { profile, qr, quietZoneModules, moduleMm, qrPhysicalMm } = model;
  const qrX = 1;
  const qrY = Math.max(1, (profile.heightMm - qrPhysicalMm) / 2);
  const matrixX = qrX + quietZoneModules * moduleMm;
  const matrixY = qrY + quietZoneModules * moduleMm;
  const textX = qrX + qrPhysicalMm + Math.max(1.2, profile.widthMm * 0.025);
  const baseFont = Math.max(1.4, Math.min(2.5, profile.heightMm * 0.085));
  const smallFont = Math.max(1.15, baseFont * 0.72);
  const lines: string[] = [];
  let y = Math.max(2.4, profile.heightMm * 0.20);

  if (model.visible.branding) {
    lines.push(`<text x="${n(textX)}" y="${n(y)}" font-size="${n(baseFont)}" font-weight="700">IGX NEXUS</text>`);
    y += baseFont * 1.15;
    lines.push(`<text x="${n(textX)}" y="${n(y)}" font-size="${n(smallFont)}">by Innergex</text>`);
    y += baseFont * 1.35;
  }
  if (model.visible.nexusId) {
    lines.push(`<text x="${n(textX)}" y="${n(y)}" font-size="${n(baseFont)}" font-weight="700" font-family="ui-monospace, monospace">${escapeXml(model.visible.nexusId)}</text>`);
    y += baseFont * 1.25;
  }
  if (model.visible.name && y < profile.heightMm - baseFont * 1.5) {
    lines.push(`<text x="${n(textX)}" y="${n(y)}" font-size="${n(smallFont)}">${escapeXml(model.visible.name)}</text>`);
    y += baseFont;
  }
  if (model.visible.assetTag && y < profile.heightMm - baseFont * 1.2) lines.push(`<text x="${n(textX)}" y="${n(y)}" font-size="${n(smallFont)}">Tag: ${escapeXml(model.visible.assetTag)}</text>`);

  const qrRects: string[] = [];
  for (let row = 0; row < qr.size; row += 1) {
    for (let column = 0; column < qr.size; column += 1) {
      if (!qr.modules[row]![column]) continue;
      qrRects.push(`<rect x="${n(matrixX + column * moduleMm)}" y="${n(matrixY + row * moduleMm)}" width="${n(moduleMm)}" height="${n(moduleMm)}"/>`);
    }
  }

  const footerY = profile.heightMm - Math.max(1.2, smallFont * 0.45);
  const accessibleName = `Etiqueta IGX NEXUS ${model.visible.nexusId ?? "activo"}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${profile.widthMm}mm" height="${profile.heightMm}mm" viewBox="0 0 ${profile.widthMm} ${profile.heightMm}" preserveAspectRatio="xMidYMid meet" data-label-profile="${profile.id}" data-dpi="${model.dpi}" data-quiet-zone="${quietZoneModules}" data-module-px="${model.modulePixels}" role="img" aria-label="${escapeXml(accessibleName)}">
  <title>${escapeXml(accessibleName)}</title>
  <rect width="${profile.widthMm}" height="${profile.heightMm}" fill="#fff"/>
  <rect x="${n(qrX)}" y="${n(qrY)}" width="${n(qrPhysicalMm)}" height="${n(qrPhysicalMm)}" fill="#fff"/>
  <g fill="#000" shape-rendering="crispEdges">${qrRects.join("")}</g>
  <g fill="#000" font-family="Arial, Helvetica, sans-serif">${lines.join("")}</g>
  <text x="${n(textX)}" y="${n(footerY)}" fill="#000" font-family="Arial, Helvetica, sans-serif" font-size="${n(smallFont)}">Activo tecnológico</text>
</svg>`;
}

export const svgLabelRenderer: LabelOutputRenderer = { kind: "svg", mimeType: "image/svg+xml", extension: "svg", render: renderLabelSvg };
