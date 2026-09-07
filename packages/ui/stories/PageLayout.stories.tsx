import type { Meta, StoryObj } from "@storybook/react-vite";
import { Filter, Plus } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";

import {
  Button,
  Card,
  ContentSection,
  PageHeader,
  Search,
  Toolbar,
} from "../src/index.js";

const meta = {
  title: "Layout/Page Layout",
  component: PageHeader,
  tags: ["autodocs"],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

function Example() {
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--igx-density-section-gap)",
      }}
    >
      <PageHeader
        eyebrow="CMDB · Chile"
        title="Activos tecnológicos"
        description="Patrón estructural reutilizable para vistas de IGX NEXUS."
        meta={<span>Última sincronización: hace 8 min</span>}
        actions={
          <Button variant="primary">
            <Plus aria-hidden="true" />
            Agregar acción
          </Button>
        }
      />

      <Toolbar
        ariaLabel="Herramientas de activos"
        primary={
          <Search
            label="Buscar activos"
            placeholder="Buscar por nombre o serie"
          />
        }
        secondary={
          <Button variant="secondary">
            <Filter aria-hidden="true" />
            Filtros
          </Button>
        }
      />

      <ContentSection
        title="Resumen"
        description="Sección genérica preparada para contenido funcional posterior."
      >
        <Card>
          <strong>Contenido de ejemplo</strong>
          <p>
            Este bloque no implementa Asset Explorer ni Dashboard; solamente
            demuestra la composición base del sistema de diseño.
          </p>
        </Card>
      </ContentSection>
    </div>
  );
}

export const Default: Story = {
  render: () => <Example />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("heading", { level: 1, name: "Activos tecnológicos" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("group", { name: "Herramientas de activos" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("region", { name: "Resumen" }),
    ).toBeInTheDocument();

    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Agregar acción" }),
    ).toHaveFocus();
  },
};

export const DarkCompact: Story = {
  render: () => <Example />,
  globals: {
    theme: "dark",
    density: "compact",
  },
};
