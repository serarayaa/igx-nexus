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

function nextAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
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
    const navigation = canvas.getByRole("navigation", {
      name: "Navegación principal",
    });
    const main = canvas.getByRole("main");
    const notificationsButton = canvas.getByRole("button", {
      name: "Ver notificaciones",
    });
    const navigationLinks = within(navigation).getAllByRole("link");
    const openButton = canvasElement.querySelector<HTMLButtonElement>(
      'button[aria-label="Abrir navegación"]',
    );
    const closeButton = canvasElement.querySelector<HTMLButtonElement>(
      'button[aria-label="Cerrar navegación"]',
    );

    if (!openButton || !closeButton) {
      throw new Error("No se encontraron los controles de navegación de AppShell");
    }

    await expect(navigation).toBeInTheDocument();
    await expect(main).toHaveAttribute("id", "igx-main-content");
    await expect(notificationsButton).toBeInTheDocument();
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Mapa tecnológico" }),
    ).toBeInTheDocument();

    await userEvent.tab();
    await expect(skipLink).toHaveFocus();

    const openContainer = openButton.parentElement;
    const closeContainer = closeButton.parentElement;

    if (!openContainer || !closeContainer) {
      throw new Error("No se encontraron los contenedores de navegación de AppShell");
    }

    openContainer.style.display = "flex";
    closeContainer.style.display = "flex";

    await userEvent.click(openButton);
    await nextAnimationFrame();

    await expect(openButton).toHaveAttribute("aria-expanded", "true");
    await expect(closeButton).toHaveFocus();
    await expect(skipLink).toHaveAttribute("inert");
    await expect(main).toHaveAttribute("inert");

    for (const link of navigationLinks) {
      await userEvent.tab();
      await expect(link).toHaveFocus();
    }

    await userEvent.tab();
    await expect(closeButton).toHaveFocus();

    await userEvent.tab({ shift: true });
    await expect(navigationLinks[navigationLinks.length - 1]).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    await nextAnimationFrame();

    await expect(openButton).toHaveAttribute("aria-expanded", "false");
    await expect(openButton).toHaveFocus();
    await expect(skipLink).not.toHaveAttribute("inert");
    await expect(main).not.toHaveAttribute("inert");

    openContainer.style.removeProperty("display");
    closeContainer.style.removeProperty("display");
    openButton.blur();
  },
};

export const DarkCompact: Story = {
  ...Default,
  globals: {
    theme: "dark",
    density: "compact",
  },
};
