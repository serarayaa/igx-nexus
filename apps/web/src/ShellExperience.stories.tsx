import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { NexusShell } from "./NexusShell";
import { DashboardContent } from "./Dashboard";
import { AssetExplorer } from "./AssetExplorer";
import { LifecyclePlanning } from "./LifecyclePlanning";
import { demoProvider, demoSnapshot } from "./demo-provider";
import { routeFromHash } from "./navigation-model";
import type { InventoryProvider } from "./asset-model";
import mark from "../../../assets/branding/refinements/shell-3/mark-b.svg?raw";
import "./dashboard.css";
import "./test/shell-review.css";

const providers: Record<string, InventoryProvider> = {
  ready: demoProvider,
  empty: async () => ({ ...demoSnapshot, assets: [] }),
  error: async () => { throw new Error("Synthetic failure"); },
  loading: signal => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })),
};

function Review({ initial = "dashboard", state = "ready" }: { initial?: "dashboard" | "assets" | "lifecycle"; state?: string }) {
  const [view, setView] = useState(initial);
  useEffect(() => {
    const update = () => {
      const route = routeFromHash(window.location.hash);
      if (route?.view === "dashboard" || route?.view === "assets" || route?.view === "lifecycle") setView(route.view);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    const canvas = document.querySelector<HTMLElement>(".igx-storybook-canvas:has(.nexus-shell-review)");
    if (!canvas) return;
    const theme = canvas.getAttribute("data-theme"), density = canvas.getAttribute("data-density");
    canvas.removeAttribute("data-theme"); canvas.removeAttribute("data-density");
    return () => {
      if (theme) canvas.setAttribute("data-theme", theme);
      if (density) canvas.setAttribute("data-density", density);
    };
  }, []);
  return <div className="nexus-shell-review"><NexusShell view={view} mode="demo">
    <p className="nexus-shell-review-note" role="note">DATOS SINTÉTICOS · Storybook · Sin sesión GLPI Live ni consultas HTTP. Shell 3.0 y Mark B refinado pendientes de aprobación humana.</p>
    {view === "dashboard" ? <DashboardContent mode="demo" provider={demoProvider} /> : view === "lifecycle" ? <LifecyclePlanning mode="demo" inventoryProvider={demoProvider} /> : <AssetExplorer mode="demo" provider={providers[state] ?? demoProvider} />}
  </NexusShell></div>;
}
const meta = { title: "Web/Shell 3.0", component: Review, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Review>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = { args: { initial: "dashboard" }, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("note")).toHaveTextContent("DATOS SINTÉTICOS");
  await expect(canvas.getByRole("link", { name: /^Overview$/ })).toHaveAttribute("aria-current", "page");
  const collapse = canvas.queryByRole("button", { name: "Contraer navegación" });
  if (collapse) {
    await userEvent.click(collapse);
    await expect(canvas.getByRole("button", { name: "Expandir navegación" })).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(canvas.getByRole("button", { name: "Expandir navegación" }));
  }
} };
export const Explorer: Story = { args: { initial: "assets" } };
export const Lifecycle: Story = { args: { initial: "lifecycle" } };
export const Loading: Story = { args: { initial: "assets", state: "loading" } };
export const Empty: Story = { args: { initial: "assets", state: "empty" } };
export const Unavailable: Story = { args: { initial: "assets", state: "error" } };
export const MarkBReview: Story = { render: () => <section className="nexus-mark-review">
  <h1>Mark B · refinamiento óptico</h1><p>Propuesta vectorial original del producto. Aprobación humana pendiente; no es la marca corporativa Innergex.</p>
  {["light", "dark"].map(theme => <div key={theme} data-theme={theme} className="nexus-mark-review-plane">
    <h2>{theme}</h2>{[16, 24, 32].map(size => <figure key={size}><span style={{ width: size, height: size }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: mark }} /><figcaption>{size} px · monocromo</figcaption></figure>)}
  </div>)}
</section> };
