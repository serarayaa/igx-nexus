import { useMemo, useSyncExternalStore } from "react";
import { normalizeInvestigationState, parseInvestigationHash, serializeInvestigationHash, type InvestigationState } from "./navigation-state";

const eventName = "nexus:navigation";
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
    window.removeEventListener(eventName, callback);
  };
}
export function writeInvestigationState(state: InvestigationState, history: "push" | "replace" = "push") {
  const hash = serializeInvestigationHash(normalizeInvestigationState(state));
  if (hash === window.location.hash) return;
  // Preserve unrelated history metadata. URL is the sole durable state owner.
  if (history === "replace") window.history.replaceState(window.history.state, "", hash);
  else window.history.pushState(window.history.state, "", hash);
  window.dispatchEvent(new Event(eventName));
}
export function useInvestigationNavigation() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "#assets");
  const parsed = useMemo(() => parseInvestigationHash(hash), [hash]);
  return { ...parsed, update: writeInvestigationState };
}
