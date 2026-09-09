import { describe, expect, it } from "vitest";
import { demoSnapshot } from "./demo-provider";
import { demoRelationshipSnapshot, demoRelationships } from "./demo-relationship-provider";
import {
  buildRelationshipGraph,
  layoutRelationshipGraph,
  perspectiveFrom,
  relationshipSentence,
  relationshipEdgeEndpoints,
  relationshipsWithinDepth,
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

  it.each([
    { name: "horizontal izquierda a derecha", source: { id: "A", x: 10, y: 50 }, target: { id: "B", x: 90, y: 50 }, expected: { x1: 19, y1: 50, x2: 81, y2: 50 } },
    { name: "horizontal derecha a izquierda", source: { id: "A", x: 90, y: 50 }, target: { id: "B", x: 10, y: 50 }, expected: { x1: 81, y1: 50, x2: 19, y2: 50 } },
    { name: "vertical", source: { id: "A", x: 50, y: 10 }, target: { id: "B", x: 50, y: 90 }, expected: { x1: 50, y1: 18, x2: 50, y2: 82 } },
    { name: "diagonal", source: { id: "A", x: 20, y: 20 }, target: { id: "B", x: 80, y: 80 }, expected: { x1: 28, y1: 28, x2: 72, y2: 72 } },
  ])("recorta aristas en sus límites conceptuales: $name", ({ source, target, expected }) => {
    const edge = relationshipEdgeEndpoints(source, target);
    expect(edge).toEqual(expected);
    expect(edge).not.toEqual({ x1: source.x, y1: source.y, x2: target.x, y2: target.y });
    expect(edge.x1 >= 0 && edge.x1 <= 100 && edge.x2 >= 0 && edge.x2 <= 100).toBe(true);
    expect(edge.y1 >= 0 && edge.y1 <= 100 && edge.y2 >= 0 && edge.y2 <= 100).toBe(true);
  });

  it("rechaza posiciones coincidentes y límites conceptuales inválidos", () => {
    const position = { id: "A", x: 50, y: 50 };
    expect(() => relationshipEdgeEndpoints(position, position)).toThrow(RangeError);
    expect(() => relationshipEdgeEndpoints(position, { id: "B", x: 70, y: 50 }, 0, 8)).toThrow(RangeError);
  });

  it("conserva sólo relaciones completas dentro de la profundidad", () => {
    expect(relationshipsWithinDepth(demoRelationships, "DEMO-0002", 1).map(({ id }) => id)).toEqual(["DEMO-REL-001", "DEMO-REL-002"]);
    expect(relationshipsWithinDepth(demoRelationships, "DEMO-0002", 2).map(({ id }) => id)).toEqual(["DEMO-REL-001", "DEMO-REL-002", "DEMO-REL-003", "DEMO-REL-004", "DEMO-REL-006"]);
  });

  it("mantiene referencias incompletas adyacentes pero no arrastra relaciones posteriores", () => {
    const incomplete: readonly Relationship[] = [
      { ...demoRelationships[0]!, id: "R-A-MISSING", sourceId: "A", targetId: "MISSING" },
      { ...demoRelationships[0]!, id: "R-MISSING-C", sourceId: "MISSING", targetId: "C" },
    ];
    expect(relationshipsWithinDepth(incomplete, "A", 1).map(({ id }) => id)).toEqual(["R-A-MISSING"]);
  });

  it("no reintroduce aristas que contradicen la perspectiva recorrida", () => {
    const directed: readonly Relationship[] = [
      { ...demoRelationships[0]!, id: "X-TO-FOCUS", sourceId: "X", targetId: "FOCUS" },
      { ...demoRelationships[0]!, id: "FOCUS-TO-X", sourceId: "FOCUS", targetId: "X" },
    ];
    const downstream = buildRelationshipGraph(demoSnapshot, { ...demoRelationshipSnapshot, relationships: directed }, "FOCUS", { type: "depends_on", perspective: "downstream", depth: 1 });
    expect(downstream.relationships.map(({ id }) => id)).toEqual(["X-TO-FOCUS"]);

    const peerOnly: readonly Relationship[] = [
      { ...demoRelationships[2]!, id: "FOCUS-B", sourceId: "FOCUS", targetId: "B" },
      { ...demoRelationships[2]!, id: "FOCUS-C", sourceId: "FOCUS", targetId: "C" },
      { ...demoRelationships[0]!, id: "B-TO-C", sourceId: "B", targetId: "C" },
    ];
    const peers = buildRelationshipGraph(demoSnapshot, { ...demoRelationshipSnapshot, relationships: peerOnly }, "FOCUS", { type: "all", perspective: "peer", depth: 2 });
    expect(peers.relationships.map(({ id }) => id)).toEqual(["FOCUS-B", "FOCUS-C"]);
  });
});
