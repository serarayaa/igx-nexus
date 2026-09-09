import { describe, expect, it } from "vitest";
import { demoSnapshot } from "./demo-provider";
import { buildLabelModel, DEFAULT_LABEL_OPTIONS, LABEL_PROFILES, mmToPixels, renderLabelSvg } from "./label-engine";
import { encodeQrMatrix } from "./qr-code";
import { buildQrPayload, DEMO_QR_ENVIRONMENT, demoLocatorForAsset, isValidQrLocator, locatorRecordForDemoAsset, parseQrLocator, resolveDemoLocator } from "./qr-locator";

const asset = demoSnapshot.assets[1]!;

describe("QR locator demo", () => {
  it("deriva un locator determinista, opaco y separado del Asset.id", () => {
    const locator = demoLocatorForAsset(asset.id);
    expect(locator).toBe(demoLocatorForAsset(asset.id));
    expect(locator).not.toContain(asset.id.toLowerCase());
    expect(locator.startsWith("demo-")).toBe(true);
    expect(isValidQrLocator(locator)).toBe(true);
    expect(locatorRecordForDemoAsset(asset)).toEqual({ locator, assetId: asset.id, status: "active" });
  });

  it("mantiene locators únicos en todo el dataset demo", () => {
    const locators = demoSnapshot.assets.map((candidate) => demoLocatorForAsset(candidate.id));
    expect(new Set(locators).size).toBe(demoSnapshot.assets.length);
  });

  it("mantiene identidad física aunque cambien campos dinámicos del activo", () => {
    const changed = { ...asset, owner: "Otro responsable", location: "Otra ubicación", hostname: "otro-host", ipAddress: "192.0.2.250", lifecycle: "repair" as const };
    expect(demoLocatorForAsset(changed.id)).toBe(demoLocatorForAsset(asset.id));
  });

  it("valida y resuelve fixtures sin enumerar por Asset.id", () => {
    const locator = demoLocatorForAsset(asset.id);
    expect(parseQrLocator(` ${locator.toUpperCase()} `)).toBe(locator);
    expect(resolveDemoLocator(locator, demoSnapshot.assets)).toBe(asset.id);
    expect(resolveDemoLocator("demo-no-existe-123456789", demoSnapshot.assets)).toBeNull();
    expect(() => parseQrLocator("../../DEMO-0002")).toThrow();
  });

  it("construye un payload HTTPS demo sin datos del activo", () => {
    const payload = buildQrPayload(demoLocatorForAsset(asset.id), DEMO_QR_ENVIRONMENT);
    expect(payload).toMatch(/^https:\/\/nexus-demo\.invalid\/q\/demo-[a-z0-9]+$/);
    for (const value of [asset.id, asset.name, asset.serial, asset.hostname, asset.ipAddress, asset.owner, asset.location, asset.assetTag, asset.manufacturer, asset.model]) {
      if (value) expect(payload).not.toContain(value);
    }
  });
});

describe("QR encoder", () => {
  it("genera un QR Model 2 Version 5 / M de 37 módulos", () => {
    const qr = encodeQrMatrix(buildQrPayload(demoLocatorForAsset(asset.id), DEMO_QR_ENVIRONMENT));
    expect(qr.version).toBe(5);
    expect(qr.errorCorrection).toBe("M");
    expect(qr.mask).toBe(0);
    expect(qr.modules).toHaveLength(37);
    expect(qr.modules.every((row) => row.length === 37)).toBe(true);
    expect(qr.modules[0]!.slice(0, 7)).toEqual([true, true, true, true, true, true, true]);
    expect(qr.modules[1]!.slice(0, 7)).toEqual([true, false, false, false, false, false, true]);
    expect(qr.modules[3]!.slice(0, 7)).toEqual([true, false, true, true, true, false, true]);
  });

  it("rechaza payloads fuera de la capacidad deliberada del perfil", () => {
    expect(() => encodeQrMatrix("x".repeat(85))).toThrow(/84 UTF-8 bytes/);
  });
});

describe("Label Engine", () => {
  it("convierte dimensiones físicas a pixels para 203 y 300 DPI", () => {
    expect(mmToPixels(50, 203)).toBe(400);
    expect(mmToPixels(25, 203)).toBe(200);
    expect(mmToPixels(50, 300)).toBe(591);
    expect(mmToPixels(25, 300)).toBe(295);
  });

  it("renderiza todos los perfiles con módulos enteros y quiet zone de 4", () => {
    const locator = demoLocatorForAsset(asset.id);
    for (const dpi of [203, 300] as const) {
      for (const profile of LABEL_PROFILES) {
        const model = buildLabelModel(asset, locator, DEMO_QR_ENVIRONMENT, profile, dpi, DEFAULT_LABEL_OPTIONS);
        expect(model.quietZoneModules).toBe(4);
        expect(Number.isInteger(model.modulePixels)).toBe(true);
        expect(model.modulePixels).toBeGreaterThanOrEqual(2);
        expect(model.qrPhysicalMm).toBeLessThan(profile.heightMm);
        const svg = renderLabelSvg(model);
        expect(svg).toContain(`width="${profile.widthMm}mm"`);
        expect(svg).toContain(`height="${profile.heightMm}mm"`);
        expect(svg).toContain(`data-dpi="${dpi}"`);
        expect(svg).toContain('data-quiet-zone="4"');
        expect(svg).toContain(`data-module-px="${model.modulePixels}"`);
        expect(svg).toContain('shape-rendering="crispEdges"');
      }
    }
  });

  it("genera SVG monocromático estable e independiente del tema", () => {
    const model = buildLabelModel(asset, demoLocatorForAsset(asset.id), DEMO_QR_ENVIRONMENT);
    const first = renderLabelSvg(model);
    const second = renderLabelSvg(model);
    expect(first).toBe(second);
    expect(first).toContain('fill="#fff"');
    expect(first).toContain('fill="#000"');
    expect(first).not.toContain("var(--");
    expect(first).not.toContain(asset.serial!);
    expect(first).not.toContain(asset.ipAddress!);
    expect(first).not.toContain(asset.owner!);
    expect(first).not.toContain(asset.location!);
  });

  it("escapa y trunca contenido visible largo sin romper el SVG", () => {
    const longAsset = { ...asset, name: `<Equipo & laboratorio ${"muy ".repeat(20)}largo>` };
    const model = buildLabelModel(longAsset, demoLocatorForAsset(asset.id), DEMO_QR_ENVIRONMENT);
    const svg = renderLabelSvg(model);
    expect(svg).toContain("&lt;Equipo &amp; laboratorio");
    expect(svg).toContain("…");
    expect(svg).not.toContain("<Equipo & laboratorio");
  });
});
