import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useMemo, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Asset360 } from "./Asset360";
import { NexusShell } from "./NexusShell";
import { AssetExplorer } from "./AssetExplorer";
import { routeFromHash } from "./navigation-model";
import { demoSnapshot } from "./demo-provider";
import type { InventoryProvider } from "./asset-model";
import { HardwareRequestError, type HardwareReader } from "./hardware-client";
import { hardwareFixture, partialHardware, unknownHardware } from "./test/hardware-fixtures";
import "./dashboard.css";
import "./test/hardware-review.css";

const inventoryProvider: InventoryProvider = async () => ({ ...demoSnapshot, assets: demoSnapshot.assets.filter(asset => asset.id === "DEMO-0002").map(asset => ({ ...asset, dataMode: "live" })) });
const readers: Record<string, HardwareReader> = {
  complete: async () => hardwareFixture("DEMO-0002"),
  partial: async () => ({ ...partialHardware(), assetId: "DEMO-0002" }),
  unknown: async () => ({ ...unknownHardware(), assetId: "DEMO-0002" }),
  loading: async (_id, signal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })),
};
function Review({ scenario }: { scenario: string }) {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    // This full-shell story uses NexusShell preferences, not the component-canvas theme.
    const canvas = document.querySelector<HTMLElement>(".igx-storybook-canvas:has(.nexus-hardware-review-note)");
    if (!canvas) return;
    const theme = canvas.getAttribute("data-theme"), density = canvas.getAttribute("data-density");
    canvas.removeAttribute("data-theme"); canvas.removeAttribute("data-density");
    return () => {
      if (theme !== null) canvas.setAttribute("data-theme", theme);
      if (density !== null) canvas.setAttribute("data-density", density);
    };
  }, []);
  const route = routeFromHash(hash);
  // Instance-local retry avoids state leaking across stories; these readers perform no HTTP.
  const errorReader = useMemo<HardwareReader>(() => {
    let failed = false;
    return async () => { if (!failed) { failed = true; throw new HardwareRequestError("unavailable"); } return hardwareFixture("DEMO-0002"); };
  }, [scenario]);
  return <div className="nexus-hardware-review"><NexusShell view={route?.view === "assets" ? "assets" : "asset"} mode="live"><div role="note" className="nexus-hardware-review-note">DATOS SINTÉTICOS · STORYBOOK · Sin sesión GLPI Live ni consultas HTTP. Se ejercita la rama Live con fixtures inyectados; las etiquetas de modo de la ficha no indican una conexión real.</div>{route?.view === "assets" ? <AssetExplorer mode="live" provider={inventoryProvider} /> : <Asset360 assetId="DEMO-0002" section={route?.view === "asset" ? route.section : "hardware"} mode="live" provider={inventoryProvider} hardwareReader={readers[scenario] ?? errorReader} />}</NexusShell></div>;
}
const meta = { title: "Web/Asset 360/Hardware V2", component: Review, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Review>;
export default meta;
type Story = StoryObj<typeof meta>;
const ready: Story["play"] = async ({ canvasElement }) => { const canvas = within(canvasElement); await expect(canvas.getByRole("note")).toHaveTextContent("DATOS SINTÉTICOS"); for (const label of canvas.getAllByText("LIVE LAB")) await expect(label).not.toBeVisible(); await expect(canvas.getByText("Provider Live")).not.toBeVisible(); await waitFor(() => expect(canvas.getByRole("heading", { name: "Procesadores", level: 3 })).toBeVisible()); };
export const Complete: Story = { args: { scenario: "complete" }, play: ready };
export const Partial: Story = { args: { scenario: "partial" }, play: ready };
export const Unknown: Story = { args: { scenario: "unknown" }, play: ready };
export const Loading: Story = { args: { scenario: "loading" }, play: async ({ canvasElement }) => { await expect(await within(canvasElement).findByRole("status", { name: "Cargando hardware" })).toBeVisible(); } };
export const ErrorRetry: Story = { args: { scenario: "error" }, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await expect(await canvas.findByRole("button", { name: "Reintentar hardware" })).toBeVisible(); } };
export const RetryRecovered: Story = { args: { scenario: "error" }, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await userEvent.click(await canvas.findByRole("button", { name: "Reintentar hardware" })); await expect(await canvas.findByRole("heading", { name: "Procesadores", level: 3 })).toBeVisible(); } };
