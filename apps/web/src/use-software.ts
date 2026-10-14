import { useEffect, useState } from "react";
import type { SoftwareInventoryV2 } from "@igx-nexus/types";
import { SoftwareRequestError, parseSoftwareResponse, requestSoftware, type SoftwareErrorKind, type SoftwareReader } from "./software-client";
type SoftwareState = { status: "loading" } | { status: "ready"; inventory: SoftwareInventoryV2 } | { status: "error"; kind: SoftwareErrorKind };
export function useSoftware(assetId: string, reader: SoftwareReader = requestSoftware) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ assetId: string; reader: SoftwareReader; attempt: number; state: SoftwareState }>({ assetId, reader, attempt, state: { status: "loading" } });
  useEffect(() => {
    const controller = new AbortController();
    const update = (state: SoftwareState) => { if (!controller.signal.aborted) setResult({ assetId, reader, attempt, state }); };
    update({ status: "loading" });
    Promise.resolve().then(() => { controller.signal.throwIfAborted(); return reader(assetId, controller.signal); })
      .then(value => { controller.signal.throwIfAborted(); return parseSoftwareResponse(value, assetId); })
      .then(inventory => update({ status: "ready", inventory }))
      .catch(error => update({ status: "error", kind: error instanceof SoftwareRequestError ? error.kind : "network" }));
    return () => controller.abort();
  }, [assetId, reader, attempt]);
  const state: SoftwareState = result.assetId === assetId && result.reader === reader && result.attempt === attempt ? result.state : { status: "loading" };
  return { state, retry: () => setAttempt(value => value + 1) };
}
