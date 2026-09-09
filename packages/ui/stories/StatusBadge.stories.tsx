import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusBadge } from "../src/index.js";

const meta = {
  title: "Components/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  args: {
    children: "Operativo",
    status: "success",
  },
  argTypes: {
    status: {
      control: "select",
      options: ["neutral", "info", "success", "warning", "danger", "critical"],
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <StatusBadge status="neutral">Sin clasificar</StatusBadge>
      <StatusBadge status="info">Información</StatusBadge>
      <StatusBadge status="success">Operativo</StatusBadge>
      <StatusBadge status="warning">Atención</StatusBadge>
      <StatusBadge status="danger">No saludable</StatusBadge>
      <StatusBadge status="critical">Crítico</StatusBadge>
    </div>
  ),
};
