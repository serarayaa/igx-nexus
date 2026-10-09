import { expect, it } from "vitest";
import { hardwareBytes, memoryCapacity, volumeUsage } from "./hardware-format";
import { complete, hardwareFixture, partialHardware, unknownHardware } from "./test/hardware-fixtures";
it("keeps zero, unknown, and binary units distinct", () => {
  expect(hardwareBytes(null)).toBe("Desconocida"); expect(hardwareBytes(0)).toBe("0 B"); expect(hardwareBytes(8 * 1024 ** 3)).toBe("8 GiB");
});
it("only calls a complete known RAM sum a total", () => {
  expect(memoryCapacity(hardwareFixture().memoryModules)).toEqual({ value: 32 * 1024 ** 3, total: true, missing: 0 });
  expect(memoryCapacity(partialHardware().memoryModules)).toEqual({ value: 8 * 1024 ** 3, total: false, missing: 2 });
  expect(memoryCapacity(unknownHardware().memoryModules)).toEqual({ value: null, total: false, missing: 1 });
  expect(memoryCapacity(complete([]))).toEqual({ value: null, total: false, missing: 0 });
  expect(memoryCapacity({ state: "not_requested" }).value).toBeNull();
});
it("does not sum past safe integer precision", () => {
  const section = hardwareFixture().memoryModules;
  if (section.state !== "complete") throw new Error("fixture");
  expect(memoryCapacity(complete(section.items.map(item => ({ ...item, capacityBytes: Number.MAX_SAFE_INTEGER })))).value).toBeNull();
});
it("uses collected free space for usage and avoids zero division or unknown estimates", () => {
  expect(volumeUsage(400, 100)).toEqual({ used: 300, percent: 75 });
  expect(volumeUsage(400, 0)).toEqual({ used: 400, percent: 100 });
  for (const [total, free] of [[0, 0], [null, 0], [400, null], [400, 401]] as const) expect(volumeUsage(total, free)).toBeNull();
});
