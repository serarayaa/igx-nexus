import { describe, expect, it } from "vitest";
import { assetHash, assetSectionHash, defaultTechnologyMapState, demoQrHash, labelHash, relationsHash, routeFromHash } from "./navigation-model";

describe("routeFromHash", () => {
  it("reconoce las rutas del Dashboard", () => {
    for (const hash of ["", "#overview", "#quality", "#next-views"]) expect(routeFromHash(hash)).toEqual({ view: "dashboard" });
  });

  it("reconoce el Asset Explorer", () => {
    expect(routeFromHash("#assets")).toEqual({ view: "assets" });
  });

  it("reconoce deep links de Asset 360, sus secciones y acciones", () => {
    expect(routeFromHash(assetSectionHash("canonical/id", "hardware"))).toEqual({ view: "asset", assetId: "canonical/id", section: "hardware" });
    expect(routeFromHash("#assets/DEMO-0002")).toEqual({ view: "asset", assetId: "DEMO-0002", section: "summary" });
    expect(routeFromHash("#assets/DEMO-0002?section=inventory")).toEqual({ view: "asset", assetId: "DEMO-0002", section: "inventory" });
    expect(routeFromHash("#assets/DEMO-0002?section=evidence")).toEqual({ view: "asset", assetId: "DEMO-0002", section: "evidence" });
    expect(routeFromHash("#assets/DEMO-0002?section=relationships")).toEqual({ view: "asset", assetId: "DEMO-0002", section: "relationships" });
    expect(routeFromHash("#assets/DEMO-0002?section=invalid")).toEqual({ view: "asset", assetId: "DEMO-0002", section: "summary" });
    expect(routeFromHash("#assets/DEMO-0002/label")).toEqual({ view: "label", assetId: "DEMO-0002" });
    expect(routeFromHash("#assets/DEMO-0002/relations")).toEqual({ view: "relations", assetId: "DEMO-0002", mapState: defaultTechnologyMapState });
    expect(routeFromHash("#assets/DEMO-0002/relations?depth=1&type=uses&perspective=upstream&selected=DEMO-0005")).toEqual({ view: "relations", assetId: "DEMO-0002", mapState: { depth: 1, type: "uses", perspective: "upstream", selectedId: "DEMO-0005" } });
    expect(routeFromHash("#assets/DEMO-0002/relations?depth=9&type=nope&perspective=nope")).toEqual({ view: "relations", assetId: "DEMO-0002", mapState: defaultTechnologyMapState });
  });

  it("reconoce el simulador interno de resolución QR", () => {
    expect(routeFromHash("#q/demo-0123456789abcdef")).toEqual({ view: "qr", locator: "demo-0123456789abcdef" });
  });

  it("decodifica identificadores codificados en URL", () => {
    expect(routeFromHash("#assets/DEMO%200002")).toEqual({ view: "asset", assetId: "DEMO 0002", section: "summary" });
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
    expect(assetSectionHash("DEMO 0002", "summary")).toBe("#assets/DEMO%200002");
    expect(assetSectionHash("DEMO 0002", "inventory")).toBe("#assets/DEMO%200002?section=inventory");
    expect(labelHash("DEMO 0002")).toBe("#assets/DEMO%200002/label");
    expect(relationsHash("DEMO 0002")).toBe("#assets/DEMO%200002/relations");
    expect(relationsHash("DEMO 0002", { depth: 1, type: "uses", perspective: "downstream", selectedId: "DEMO 0005" })).toBe("#assets/DEMO%200002/relations?depth=1&type=uses&perspective=downstream&selected=DEMO+0005");
    expect(demoQrHash("demo locator")).toBe("#q/demo%20locator");
  });
});

it("reconoce Health como ruta propia", () => { expect(routeFromHash("#health")).toEqual({ view: "health" }); });
it("reconoce Lifecycle & Investment como ruta propia", () => { expect(routeFromHash("#lifecycle")).toEqual({ view: "lifecycle" }); });
