import { describe, expect, it } from "vitest";
import { demoSnapshot } from "./demo-provider";
import { demoRelationshipSnapshot, demoRelationships } from "./demo-relationship-provider";
import {
  buildRelationshipGraph,
  layoutRelationshipGraph,
  perspectiveFrom,
  relationshipSentence,
  validateRelationship,
  type Relationship,
} from "./relationship-model";

describe("relationship domain", () => {
  it("valida dirección, endpoints y autorrelaciones", () => {
    expect(demoRelationships.flatMap(validateRelationship)).toEqual([]);
    const invalid: Relationship = { ...demoRelationships[0]!, id: "", targetId: "DEMO-0002", direction: "bidirectional" };
    expect(validateRelationship(invalid)).toEqual([
      "relationship.id is required",
      "self relationships are not supported",
      "depends_on must be directed",
    ]);
  });

  it("interpreta upstream, downstream y conexiones simétricas desde el foco", () => {
    expect(perspectiveFrom(demoRelationships[0]!, "DEMO-0002")).toBe("upstream");
    expect(perspectiveFrom(demoRelationships[0]!, "DEMO-0003")).toBe("downstream");
    expect(perspectiveFrom(demoRelationships[2]!, "DEMO-0003")).toBe("peer");
    expect(perspectiveFrom(demoRelationships[0]!, "DEMO-0099")).toBeNull();
  });

  it("filtra por dirección, tipo y profundidad sin perder determinismo", () => {
    const depthOne = buildRelationshipGraph(demoSnapshot, demoRelationshipSnapshot, "DEMO-0002", { type: "all", perspective: "all", depth: 1 });
    expect(depthOne.nodeIds).toEqual(["DEMO-0002", "DEMO-0003", "DEMO-0005"]);
    expect(depthOne.relationships.map((relationship) => relationship.id)).toEqual(["DEMO-REL-001", "DEMO-REL-002"]);

    const depthTwo = buildRelationshipGraph(demoSnapshot, demoRelationshipSnapshot, "DEMO-0002", { type: "all", perspective: "all", depth: 2 });
    expect(depthTwo.nodeIds).toEqual(["DEMO-0002", "DEMO-0003", "DEMO-0005", "DEMO-0006", "DEMO-0008", "DEMO-0012"]);

    const upstream = buildRelationshipGraph(demoSnapshot, demoRelationshipSnapshot, "DEMO-0002", { type: "depends_on", perspective: "upstream", depth: 2 });
    expect(upstream.nodeIds).toEqual(["DEMO-0002", "DEMO-0003"]);
    const downstream = buildRelationshipGraph(demoSnapshot, demoRelationshipSnapshot, "DEMO-0003", { type: "depends_on", perspective: "downstream", depth: 1 });
    expect(downstream.nodeIds).toEqual(["DEMO-0003", "DEMO-0002", "DEMO-0008"]);
  });

  it("expone referencias incompletas sin inventar un activo", () => {
    const incomplete: Relationship = { ...demoRelationships[0]!, id: "DEMO-REL-X", targetId: "DEMO-MISSING" };
    const graph = buildRelationshipGraph(demoSnapshot, { ...demoRelationshipSnapshot, relationships: [incomplete] }, "DEMO-0002", { type: "all", perspective: "all", depth: 1 });
    expect(graph.unresolvedIds).toEqual(["DEMO-MISSING"]);
    expect(relationshipSentence(incomplete, graph.assets)).toContain("CI no disponible DEMO-MISSING");
  });

  it("calcula coordenadas estables, acotadas y con foco central", () => {
    const first = layoutRelationshipGraph(["DEMO-0003", "DEMO-0002", "DEMO-0005"], "DEMO-0002");
    const second = layoutRelationshipGraph(["DEMO-0005", "DEMO-0003", "DEMO-0002"], "DEMO-0002");
    expect(first).toEqual(second);
    expect(first[0]).toEqual({ id: "DEMO-0002", x: 50, y: 50 });
    expect(first.every(({ x, y }) => x >= 0 && x <= 100 && y >= 0 && y <= 100)).toBe(true);
  });
});
