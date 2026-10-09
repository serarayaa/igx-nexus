import { useEffect, useState } from "react";
import type { HardwareInventoryV2 } from "@igx-nexus/types";
import { HardwareRequestError, parseHardwareResponse, requestHardware, type HardwareErrorKind, type HardwareReader } from "./hardware-client";

type HardwareState = { status: "loading" } | { status: "ready"; inventory: HardwareInventoryV2 } | { status: "error"; kind: HardwareErrorKind };
export function useHardware(assetId: string, reader: HardwareReader = requestHardware) {
  const [state, setState] = useState<HardwareState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.resolve().then(() => { controller.signal.throwIfAborted(); return reader(assetId, controller.signal); })
      .then(value => parseHardwareResponse(value, assetId))
      .then(inventory => { if (!controller.signal.aborted) setState({ status: "ready", inventory }); })
      .catch(error => { if (!controller.signal.aborted) setState({ status: "error", kind: error instanceof HardwareRequestError ? error.kind : "network" }); });
    return () => controller.abort();
  }, [assetId, reader, attempt]);
  return { state, retry: () => setAttempt(value => value + 1) };
}
