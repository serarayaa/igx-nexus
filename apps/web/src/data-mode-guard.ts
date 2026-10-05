import type { AssetDataMode } from "./asset-model";

type Provider<TSnapshot> = (signal: AbortSignal) => Promise<TSnapshot>;

const rejectedLiveProvider: Provider<unknown> = async () => {
  throw new Error("Live mode requires an explicit non-Demo inventory provider");
};

export type ModeAwareProviderProps<P> =
  | {
      mode?: "demo";
      provider?: P;
    }
  | {
      mode: AssetDataMode;
      provider: P;
    };

export type ModeAwareInventoryProviderProps<P> =
  | {
      mode?: "demo";
      inventoryProvider?: P;
    }
  | {
      mode: AssetDataMode;
      inventoryProvider: P;
    };

export function resolveProviderForMode<TSnapshot>(
  mode: AssetDataMode,
  provider: Provider<TSnapshot> | undefined,
  demoProvider: Provider<TSnapshot>,
): Provider<TSnapshot> {
  if (mode === "live" && (!provider || provider === demoProvider)) {
    return rejectedLiveProvider as Provider<TSnapshot>;
  }

  return provider ?? demoProvider;
}

export function assertSnapshotMatchesMode<
  TSnapshot extends { readonly assets: readonly unknown[] },
>(
  mode: AssetDataMode,
  snapshot: TSnapshot,
): TSnapshot {
  if (mode !== "live") return snapshot;

  const containsDemoAsset = snapshot.assets.some((asset) => {
    if (!asset || typeof asset !== "object") return false;
    return "dataMode" in asset && asset.dataMode === "demo";
  });

  if (containsDemoAsset) {
    throw new Error("Live inventory provider returned Demo-labelled assets");
  }

  return snapshot;
}
