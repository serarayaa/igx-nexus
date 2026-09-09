import { describe, expect, it } from "vitest";
import { demoRelationshipProvider, demoRelationships } from "./demo-relationship-provider";

const relationshipIds = async (assetId: string, depth: 1 | 2) => {
  const snapshot = await demoRelationshipProvider({ assetId, depth }, new AbortController().signal);
  return snapshot.relationships.map(({ id }) => id);
};

describe("demoRelationshipProvider", () => {
  it("limita DEMO-0002 a relaciones completas de profundidad 1", async () => {
    expect(await relationshipIds("DEMO-0002", 1)).toEqual(["DEMO-REL-001", "DEMO-REL-002"]);
  });

  it("incluye el segundo nivel permitido sin arrastrar el tercero", async () => {
    expect(await relationshipIds("DEMO-0002", 2)).toEqual([
      "DEMO-REL-001", "DEMO-REL-002", "DEMO-REL-003", "DEMO-REL-004", "DEMO-REL-006",
    ]);
  });

  it("acota correctamente un nodo intermedio con relaciones dirigidas y bidireccionales", async () => {
    expect(await relationshipIds("DEMO-0003", 1)).toEqual([
      "DEMO-REL-001", "DEMO-REL-003", "DEMO-REL-004", "DEMO-REL-006",
    ]);
    expect(await relationshipIds("DEMO-0003", 2)).toEqual([
      "DEMO-REL-001", "DEMO-REL-002", "DEMO-REL-003", "DEMO-REL-004", "DEMO-REL-005", "DEMO-REL-006",
    ]);
  });

  it("devuelve una selección vacía para un activo sin relaciones", async () => {
    expect(await relationshipIds("DEMO-0240", 2)).toEqual([]);
  });

  it("respeta AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(demoRelationshipProvider({ assetId: "DEMO-0002", depth: 1 }, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("mantiene selección y orden deterministas", async () => {
    const first = await relationshipIds("DEMO-0003", 2);
    expect(first).toEqual(await relationshipIds("DEMO-0003", 2));
    expect(new Set(first).size).toBe(first.length);
    expect(new Set(demoRelationships.map(({ id }) => id)).size).toBe(demoRelationships.length);
  });
});
