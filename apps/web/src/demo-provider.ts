import type { InventoryProvider } from "./asset-model";
import { demoDataset } from "./demo-dataset";

export const demoSnapshot = demoDataset.inventory;
export const demoProvider: InventoryProvider = async (signal) => {
  signal.throwIfAborted();
  return demoSnapshot;
};
