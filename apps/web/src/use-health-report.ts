import { useEffect, useState } from "react";
import type { InventoryProvider } from "./asset-model";
import type { RelationshipInventoryProvider } from "./relationship-model";
import { buildCmdbHealth } from "./health-engine";
import type { CmdbHealthReport } from "./health-model";

type HealthLoadState = { status: "loading" } | { status: "error" } | { status: "ready"; report: CmdbHealthReport };
export function useHealthReport(inventoryProvider: InventoryProvider, relationshipProvider: RelationshipInventoryProvider) {
  const [state, setState] = useState<HealthLoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.all([
      Promise.resolve().then(() => { controller.signal.throwIfAborted(); return inventoryProvider(controller.signal); }),
      Promise.resolve().then(() => { controller.signal.throwIfAborted(); return relationshipProvider(controller.signal); }),
    ]).then(([inventory, relationships]) => {
      if (!controller.signal.aborted) setState({ status: "ready", report: buildCmdbHealth(inventory, relationships) });
    }).catch(() => {
      if (!controller.signal.aborted) { setState({ status: "error" }); controller.abort(); }
    });
    return () => controller.abort();
  }, [inventoryProvider, relationshipProvider, attempt]);
  return { state, retry: () => setAttempt(value => value + 1) };
}
