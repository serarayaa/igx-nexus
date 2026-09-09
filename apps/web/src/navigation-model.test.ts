import { describe, expect, it } from "vitest";
import { assetHash, demoQrHash, labelHash, relationsHash, routeFromHash } from "./navigation-model";

describe("routeFromHash", () => {
  it("reconoce las rutas del Dashboard", () => {
    for (const hash of ["", "#overview", "#quality", "#lifecycle", "#next-views"]) expect(routeFromHash(hash)).toEqual({ view: "dashboard" });
  });

  it("reconoce el Asset Explorer", () => {
    expect(routeFromHash("#assets")).toEqual({ view: "assets" });
  });

  it("reconoce deep links de Asset 360 y diseñador de etiquetas", () => {
    expect(routeFromHash("#assets/DEMO-0002")).toEqual({ view: "asset", assetId: "DEMO-0002" });
    expect(routeFromHash("#assets/DEMO-0002/label")).toEqual({ view: "label", assetId: "DEMO-0002" });
    expect(routeFromHash("#assets/DEMO-0002/relations")).toEqual({ view: "relations", assetId: "DEMO-0002" });
  });

  it("reconoce el simulador interno de resolución QR", () => {
    expect(routeFromHash("#q/demo-0123456789abcdef")).toEqual({ view: "qr", locator: "demo-0123456789abcdef" });
  });

  it("decodifica identificadores codificados en URL", () => {
    expect(routeFromHash("#assets/DEMO%200002")).toEqual({ view: "asset", assetId: "DEMO 0002" });
    expect(routeFromHash("#assets/DEMO%200002/label")).toEqual({ view: "label", assetId: "DEMO 0002" });
  });

  it("rechaza rutas vacías, anidadas o mal codificadas", () => {
    expect(routeFromHash("#assets/")).toBeNull();
    expect(routeFromHash("#assets/DEMO-0002/relations/extra")).toBeNull();
    expect(routeFromHash("#assets/DEMO-0002/label/extra")).toBeNull();
    expect(routeFromHash("#assets/%E0%A4%A")).toBeNull();
    expect(routeFromHash("#q/")).toBeNull();
  });

  it("no convierte hashes desconocidos en otra vista", () => {
    expect(routeFromHash("#desconocido")).toBeNull();
  });
});

describe("route builders", () => {
  it("genera rutas estables y codificadas", () => {
    expect(assetHash("DEMO-0002")).toBe("#assets/DEMO-0002");
    expect(assetHash("DEMO 0002")).toBe("#assets/DEMO%200002");
    expect(labelHash("DEMO 0002")).toBe("#assets/DEMO%200002/label");
    expect(relationsHash("DEMO 0002")).toBe("#assets/DEMO%200002/relations");
    expect(demoQrHash("demo locator")).toBe("#q/demo%20locator");
  });
});
