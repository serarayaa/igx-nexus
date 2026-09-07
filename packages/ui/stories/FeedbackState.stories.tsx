import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Spinner,
} from "../src/index.js";

const meta = {
  title: "Patterns/Feedback States",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Empty: Story = {
  render: () => (
    <EmptyState
      title="No hay activos para mostrar"
      description="Ajusta los filtros o registra un activo para comenzar."
      action={<Button variant="secondary">Limpiar filtros</Button>}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText("No hay activos para mostrar"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Limpiar filtros" }),
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  render: () => (
    <LoadingState
      title="Cargando activos"
      description="Estamos preparando la información disponible."
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Cargando activos",
    );
  },
};

export const Error: Story = {
  render: () => (
    <ErrorState
      title="No fue posible cargar los activos"
      description="Reintenta la operación. Si el problema continúa, revisa la conectividad del servicio."
      action={<Button variant="secondary">Reintentar</Button>}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "No fue posible cargar los activos",
    );
  },
};

export const Compact: Story = {
  render: () => (
    <EmptyState
      compact
      title="Sin relaciones registradas"
      description="Este elemento aún no posee relaciones CMDB."
    />
  ),
};

export const StandaloneSpinner: Story = {
  render: () => <Spinner label="Sincronizando datos" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("status", { name: "Sincronizando datos" }),
    ).toBeInTheDocument();
  },
};
