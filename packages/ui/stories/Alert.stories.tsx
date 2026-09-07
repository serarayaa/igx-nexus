import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert } from "../src/index.js";

const meta = {
  title: "Components/Alert",
  component: Alert,
  tags: ["autodocs"],
  args: {
    title: "Inventario actualizado",
    children: "Los datos del activo fueron sincronizados correctamente.",
    tone: "info",
    announce: "off",
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["info", "success", "warning", "danger", "critical"],
    },
    announce: {
      control: "inline-radio",
      options: ["off", "polite", "assertive"],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = {
  args: {
    tone: "success",
    title: "Sincronización completada",
  },
};

export const Warning: Story = {
  args: {
    tone: "warning",
    title: "Datos desactualizados",
    children: "Este activo no reporta inventario reciente.",
  },
};

export const Danger: Story = {
  args: {
    tone: "danger",
    title: "Activo no saludable",
    children: "Se detectaron condiciones que requieren revisión.",
  },
};

export const Critical: Story = {
  args: {
    tone: "critical",
    title: "Activo crítico",
    children: "La condición requiere atención prioritaria.",
    announce: "assertive",
  },
};
