import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import type { GlpiApiTransport } from "./glpi.js";

export class SoftwareBudgetError extends Error {}
export class SoftwareDeadlineError extends Error {}
export class SoftwareSaturationError extends Error {}
export interface SoftwareOperationLimits {
  readonly deadlineMs: number;
  readonly maxRequests: number;
  readonly maxRecords: number;
  readonly maxConcurrent: number;
}
// Initial lab defaults, to be validated against Live before production use.
export const defaultSoftwareOperationLimits: SoftwareOperationLimits = Object.freeze({
  deadlineMs: 5000, maxRequests: 64, maxRecords: 20000, maxConcurrent: 2,
});
type Operation = {
  end: number; clock: () => number; limits: SoftwareOperationLimits;
  requests: number; records: number; pending: Set<Promise<unknown>>;
  controller: AbortController; closed: boolean; exhausted: boolean;
};
const operations = new AsyncLocalStorage<Operation>();
// Shared across app/runtime compositions in this process; no queue or distributed claim.
let active = 0;
export const activeSoftwareOperations = () => active;
export function softwareCheckpoint(): void {
  const op = operations.getStore();
  if (op && (op.closed || op.clock() >= op.end || op.controller.signal.aborted)) {
    op.controller.abort();
    throw new SoftwareDeadlineError();
  }
}
export function softwareOperationSignal(): AbortSignal | undefined {
  softwareCheckpoint();
  return operations.getStore()?.controller.signal;
}
/** Collection readers use the actual limit in both their query and acquisition evidence. */
export function softwarePageLimit(requested: number): number {
  softwareCheckpoint();
  const op = operations.getStore();
  return op ? Math.min(requested, Math.max(1, op.limits.maxRecords - op.records)) : requested;
}
/** Count actual transport invocations, plus OAuth HTTP requests, under one context. */
async function track<T>(work: () => Promise<T>, records: boolean): Promise<T> {
  const op = operations.getStore();
  if (!op) return work();
  softwareCheckpoint();
  if (op.exhausted || op.requests >= op.limits.maxRequests) {
    op.exhausted = true;
    throw new SoftwareBudgetError();
  }
  op.requests++;
  // Keep the original promise registered until it settles, even if adapter timers win.
  const pending = Promise.resolve().then(() => { softwareCheckpoint(); return work(); });
  op.pending.add(pending);
  try {
    const result = await pending;
    // OAuth is a shared token acquisition: let already-started work finish for unrelated
    // Hardware/v1 waiters. Their token cache is not a finalized Software inventory result.
    if (records) softwareCheckpoint();
    if (records && Array.isArray(result)) {
      if (result.length > op.limits.maxRecords - op.records) {
        op.exhausted = true;
        throw new SoftwareBudgetError();
      }
      op.records += result.length;
    }
    return result;
  } finally { op.pending.delete(pending); }
}
export function guardSoftwareTransport(transport: GlpiApiTransport): GlpiApiTransport {
  return { get: (path, query, context) => {
    const op = operations.getStore();
    if (!op) return transport.get(path, query, context);
    // Limit each response to remaining capacity; a one-record probe can still prove exhaustion.
    const remaining = Math.max(1, op.limits.maxRecords - op.records);
    const boundedQuery = query && typeof query.limit === "number" ? { ...query, limit: Math.min(query.limit, remaining) } : query;
    return track(() => transport.get(path, boundedQuery, { signal: context?.signal ? AbortSignal.any([context.signal, op.controller.signal]) : op.controller.signal }), true);
  } };
}
export function guardSoftwareOAuthFetch(fetchImpl: typeof fetch): typeof fetch {
  return (input, init) => track(() => fetchImpl(input, init), false);
}

export async function runSoftwareOperation<T>(
  work: () => Promise<T>,
  limits: SoftwareOperationLimits = defaultSoftwareOperationLimits,
  clock: () => number = () => performance.now(),
): Promise<T> {
  for (const value of Object.values(limits)) if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid software operation limits");
  if (active >= limits.maxConcurrent) throw new SoftwareSaturationError();
  active++;
  const op: Operation = { end: clock() + limits.deadlineMs, clock, limits,
    requests: 0, records: 0, pending: new Set(), controller: new AbortController(), closed: false, exhausted: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const task = operations.run(op, async () => { softwareCheckpoint(); const result = await work(); softwareCheckpoint(); return result; });
  // Resource accounting outlives the HTTP response. Never release a slot merely because a timer won.
  const drain = async () => {
    await task.catch(() => undefined);
    while (op.pending.size) await Promise.allSettled([...op.pending]);
    active--;
  };
  void drain();
  try {
    const result = await Promise.race([task, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { op.closed = true; op.controller.abort(); reject(new SoftwareDeadlineError()); }, Math.max(0, op.end - clock()));
    })]);
    // A per-call adapter timeout may finish task while the raw transport still consumes resources.
    if (op.pending.size) throw new SoftwareDeadlineError();
    return result;
  } finally { clearTimeout(timer); op.closed = true; op.controller.abort(); }
}
