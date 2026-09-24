import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AssetExplorer } from "./AssetExplorer";
import { DashboardContent } from "./Dashboard";
import { Asset360 } from "./Asset360";
import { liveProvider } from "./live-provider";
import { canonicalSnapshotFixture } from "./test/canonical-snapshot";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it.each([
  { schemaVersion: 99 },
  { schemaVersion: "99" },
  { asOf: "not-a-date" },
  { asOf: "2026-02-30T12:00:00Z" },
])("shows existing error/retry UI for incompatible HTTP payload %j", async invalid => {
  const payload = canonicalSnapshotFixture();
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ...payload, ...invalid }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const diagnostic = vi.spyOn(console, "warn").mockImplementation(() => {});
  render(<AssetExplorer provider={liveProvider} mode="live" />);
  expect(await screen.findByText("No se pudo cargar el inventario")).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
  expect(document.body.textContent).not.toContain("Invalid time value");
  expect(document.body.textContent).not.toContain("not-a-date");
  expect(diagnostic).toHaveBeenCalledWith("NEXUS technology contract rejected", expect.objectContaining({ path: expect.stringContaining("snapshot.") }));
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByRole("table", { name: "Inventario de activos Live" })).toBeTruthy();
  expect(screen.getByText("Contract fixture")).toBeTruthy();
});

it("keeps Asset360 mounted with controlled error for invalid asOf", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...canonicalSnapshotFixture(), asOf: "not-a-date" }), { status: 200 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  render(<Asset360 assetId="NXS-CONTRACT" provider={liveProvider} mode="live" />);
  expect(await screen.findByText("No se pudo cargar el activo")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  expect(document.body.textContent).not.toContain("Invalid time value");
});

it("keeps Overview mounted with controlled error for invalid asOf", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...canonicalSnapshotFixture(), asOf: "not-a-date" }), { status: 200 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  render(<DashboardContent provider={liveProvider} mode="live" />);
  expect(await screen.findByText("No se pudo cargar Technology Overview")).toBeTruthy();
  expect(document.body.textContent).not.toContain("Invalid time value");
});
