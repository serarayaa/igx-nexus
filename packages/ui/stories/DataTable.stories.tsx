import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
  StatusBadge,
  type StatusBadgeStatus,
} from "../src/index.js";

interface DemoAsset {
  id: string;
  name: string;
  type: string;
  owner: string;
  health: StatusBadgeStatus;
}

const rows: readonly DemoAsset[] = [
  {
    id: "asset-001",
    name: "NEXUS-LAB-001",
    type: "Notebook",
    owner: "Usuario demo",
    health: "success",
  },
  {
    id: "asset-002",
    name: "NEXUS-LAB-002",
    type: "Servidor",
    owner: "Plataforma demo",
    health: "warning",
  },
  {
    id: "asset-003",
    name: "NEXUS-LAB-003",
    type: "Switch",
    owner: "Infraestructura demo",
    health: "neutral",
  },
];

const columns: readonly DataTableColumn<DemoAsset>[] = [
  {
    id: "name",
    header: "Nombre",
    cell: (row) => row.name,
    isRowHeader: true,
    isSortable: true,
  },
  {
    id: "type",
    header: "Tipo",
    cell: (row) => row.type,
    isSortable: true,
  },
  {
    id: "owner",
    header: "Responsable",
    cell: (row) => row.owner,
  },
  {
    id: "health",
    header: "Salud",
    cell: (row) => <StatusBadge status={row.health}>{row.health}</StatusBadge>,
  },
];

type DemoTableProps = Omit<
  DataTableProps<DemoAsset>,
  "columns" | "getRowKey" | "getSelectionLabel"
>;

function DemoTable(props: DemoTableProps) {
  return (
    <DataTable
      {...props}
      columns={columns}
      getRowKey={(row) => row.id}
      getSelectionLabel={(row) => `Seleccionar ${row.name}`}
    />
  );
}

const meta = {
  title: "Components/DataTable",
  component: DemoTable,
  tags: ["autodocs"],
  args: {
    caption: "Activos de ejemplo",
    rows,
    sort: {
      columnId: "name",
      direction: "ascending",
    },
    onSortChange: fn(),
    selectionMode: "multiple",
    defaultSelectedKeys: ["asset-002"],
    onSelectionChange: fn(),
  },
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof DemoTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole("table", { name: "Activos de ejemplo" });
    const nameHeader = canvas.getByRole("columnheader", { name: "Nombre" });
    const sortButton = within(nameHeader).getByRole("button", { name: "Nombre" });
    const firstRowCheckbox = canvas.getByRole("checkbox", {
      name: "Seleccionar NEXUS-LAB-001",
    });

    await expect(table).toBeInTheDocument();
    await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");

    await userEvent.click(sortButton);
    await expect(args.onSortChange).toHaveBeenCalledWith({
      columnId: "name",
      direction: "descending",
    });

    await userEvent.click(firstRowCheckbox);
    await expect(firstRowCheckbox).toBeChecked();
    await expect(args.onSelectionChange).toHaveBeenCalledTimes(1);
  },
};

export const Empty: Story = {
  args: {
    rows: [],
    defaultSelectedKeys: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("No hay datos para mostrar.")).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: {
    rows: [],
    defaultSelectedKeys: [],
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole("table", { name: "Activos de ejemplo" });

    await expect(table).toHaveAttribute("aria-busy", "true");
    await expect(canvas.getByRole("status")).toHaveTextContent("Cargando datos…");
  },
};

export const Error: Story = {
  args: {
    rows: [],
    defaultSelectedKeys: [],
    errorMessage: "No fue posible cargar los datos de ejemplo.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "No fue posible cargar los datos de ejemplo.",
    );
  },
};

export const DarkCompact: Story = {
  ...Default,
  globals: {
    theme: "dark",
    density: "compact",
  },
};
