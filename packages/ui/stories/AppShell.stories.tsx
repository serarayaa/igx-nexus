import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, Database, LayoutDashboard, Network, ShieldCheck } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";

import {
  AppHeader,
  AppShell,
  AppSidebar,
  Card,
  IconButton,
} from "../src/index.js";

const meta = {
  title: "Layout/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

function NexusSidebar() {
  return (
    <AppSidebar
      brand={
        <>
          <strong>IGX NEXUS</strong>
          <small>The Technology Map</small>
        </>
      }
      footer={<small>Innergex · Chile</small>}
    >
      <a href="#overview" aria-current="page">
        <LayoutDashboard aria-hidden="true" />
        Resumen
      </a>
      <a href="#assets">
        <Database aria-hidden="true" />
        Activos
      </a>
      <a href="#relations">
        <Network aria-hidden="true" />
        Relaciones
      </a>
      <a href="#quality">
        <ShieldCheck aria-hidden="true" />
        Calidad CMDB
      </a>
    </AppSidebar>
  );
}

function NexusHeader() {
  return (
    <AppHeader
      context="CMDB · Chile"
      title="IGX NEXUS"
      actions={
        <IconButton aria-label="Ver notificaciones" variant="secondary">
          <Bell />
        </IconButton>
      }
    />
  );
}

export const Default: Story = {
  args: {
    sidebar: <NexusSidebar />,
    header: <NexusHeader />,
    children: (
      <section id="overview" aria-labelledby="overview-title">
        <h1 id="overview-title">Mapa tecnológico</h1>
        <p>
          Estructura base para las experiencias CMDB de IGX NEXUS sin
          acoplamiento a una funcionalidad específica.
        </p>
        <Card>
          <strong>Contenido de ejemplo</strong>
          <p>
            El área principal puede alojar dashboards, exploradores, fichas de
            activos y otras vistas manteniendo la misma navegación.
          </p>
        </Card>
      </section>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const skipLink = canvas.getByRole("link", {
      name: "Saltar al contenido principal",
    });

    await expect(
      canvas.getByRole("navigation", { name: "Navegación principal" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("main")).toHaveAttribute(
      "id",
      "igx-main-content",
    );
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Mapa tecnológico" }),
    ).toBeInTheDocument();

    await userEvent.tab();
    await expect(skipLink).toHaveFocus();
  },
};

export const DarkCompact: Story = {
  ...Default,
  globals: {
    theme: "dark",
    density: "compact",
  },
};
