import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useMemo, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Asset360 } from "./Asset360";
import { AssetExplorer } from "./AssetExplorer";
import { NexusShell } from "./NexusShell";
import { routeFromHash } from "./navigation-model";
import { demoSnapshot } from "./demo-provider";
import type { InventoryProvider } from "./asset-model";
import { SoftwareRequestError, type SoftwareReader } from "./software-client";
import { partialSoftware, softwareComplete, softwareFixture, unknownSoftware } from "./test/software-fixtures";
import { hardwareFixture } from "./test/hardware-fixtures";
import "./dashboard.css";
import "./test/software-review.css";
const provider: InventoryProvider = async () => ({ ...demoSnapshot, assets: demoSnapshot.assets.filter(asset => asset.id === "DEMO-0002").map(asset => ({ ...asset, dataMode: "live" })) });
const hardwareReader = async () => hardwareFixture("DEMO-0002");
function Review({ scenario }: { scenario: string }) {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => { const update = () => setHash(window.location.hash); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  useEffect(() => {
    const canvas = document.querySelector<HTMLElement>(".igx-storybook-canvas:has(.nexus-software-review)");
    if (!canvas) return;
    const theme = canvas.getAttribute("data-theme"), density = canvas.getAttribute("data-density"); canvas.removeAttribute("data-theme"); canvas.removeAttribute("data-density");
    return () => { if (theme !== null) canvas.setAttribute("data-theme", theme); if (density !== null) canvas.setAttribute("data-density", density); };
  }, []);
  const reader = useMemo<SoftwareReader>(() => {
    let failed = false;
    return async (id, signal) => {
      if (scenario === "loading") return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
      if (scenario === "error" && !failed) { failed = true; throw new SoftwareRequestError("unavailable"); }
      if (scenario === "partial") return partialSoftware(id);
      if (scenario === "unknown") return unknownSoftware(id);
      if (scenario === "empty") return { ...softwareFixture(id), operatingSystems: softwareComplete([]), installations: softwareComplete([]) };
      return softwareFixture(id);
    };
  }, [scenario]);
  const route = routeFromHash(hash);
  return <div className="nexus-software-review"><NexusShell view={route?.view === "assets" ? "assets" : "asset"} mode="live"><div className="nexus-software-review-note" role="note">DATOS SINTÉTICOS · STORYBOOK · Sin sesión GLPI Live ni consultas HTTP. Shell y ficha ejercitan la rama Live con readers inyectados; no representan una conexión corporativa.</div>{route?.view === "assets" ? <AssetExplorer mode="live" provider={provider} /> : <Asset360 assetId="DEMO-0002" section={route?.view === "asset" ? route.section : "software"} mode="live" provider={provider} softwareReader={reader} hardwareReader={hardwareReader} />}</NexusShell></div>;
}
const meta = { title: "Web/Asset 360/Software OS V2", component: Review, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Review>;
export default meta;
type Story = StoryObj<typeof meta>;
const ready: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement); await expect(canvas.getByRole("note")).toHaveTextContent("DATOS SINTÉTICOS");
  await expect(await canvas.findByRole("heading", { name: "Software instalado", level: 3 })).toBeVisible();
};
export const Complete: Story = { args: { scenario: "complete" }, play: ready };
export const Partial: Story = { args: { scenario: "partial" }, play: ready };
export const Unknown: Story = { args: { scenario: "unknown" }, play: ready };
export const Empty: Story = { args: { scenario: "empty" }, play: ready };
export const Loading: Story = { args: { scenario: "loading" }, play: async ({ canvasElement }) => { await expect(await within(canvasElement).findByText("Cargando sistema y software")).toBeVisible(); } };
export const ErrorRetry: Story = { args: { scenario: "error" }, play: async ({ canvasElement }) => { await expect(await within(canvasElement).findByRole("button", { name: "Reintentar sistema y software" })).toBeVisible(); } };
export const RetryRecovered: Story = { args: { scenario: "error" }, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await userEvent.click(await canvas.findByRole("button", { name: "Reintentar sistema y software" })); await expect(await canvas.findByRole("table")).toBeVisible(); } };
