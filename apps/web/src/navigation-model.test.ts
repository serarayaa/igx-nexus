import { describe, expect, it } from "vitest";
import { assetHash, routeFromHash } from "./navigation-model";

describe("routeFromHash", () => {
  it("reconoce las rutas del Dashboard", () => {
    for (const hash of ["", "#overview", "#quality", "#lifecycle", "#next-views"]) {
      expect(routeFromHash(hash)).toEqual({ view: "dashboard" });
    }
  });

  it("reconoce el Asset Explorer", () => {
    expect(routeFromHash("#assets")).toEqual({ view: "assets" });
  });

  it("reconoce un deep link de Asset 360", () => {
    expect(routeFromHash("#assets/DEMO-0002")).toEqual({
      view: "asset",
      assetId: "DEMO-0002",
    });
  });

  it("decodifica identificadores codificados en URL", () => {
    expect(routeFromHash("#assets/DEMO%200002")).toEqual({
      view: "asset",
      assetId: "DEMO 0002",
    });
  });

  it("rechaza rutas de activo vacías, anidadas o mal codificadas", () => {
    expect(routeFromHash("#assets/")).toBeNull();
    expect(routeFromHash("#assets/DEMO-0002/relations")).toBeNull();
    expect(routeFromHash("#assets/%E0%A4%A")).toBeNull();
  });

  it("no convierte hashes desconocidos en otra vista", () => {
    expect(routeFromHash("#desconocido")).toBeNull();
  });
});

describe("assetHash", () => {
  it("genera una URL hash estable y codificada para un activo", () => {
    expect(assetHash("DEMO-0002")).toBe("#assets/DEMO-0002");
    expect(assetHash("DEMO 0002")).toBe("#assets/DEMO%200002");
  });
});
