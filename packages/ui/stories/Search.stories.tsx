import type { Meta, StoryObj } from "@storybook/react-vite";
import { Search } from "../src/index.js";

const meta = {
  title: "Components/Search",
  component: Search,
  tags: ["autodocs"],
  args: {
    label: "Buscar activos",
    description: "Busca por nombre, serie, usuario o ubicación.",
    placeholder: "Buscar en NEXUS",
    size: "md",
    showLabel: false,
  },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Search>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const VisibleLabel: Story = {
  args: {
    showLabel: true,
  },
};

export const Invalid: Story = {
  args: {
    showLabel: true,
    errorMessage: "La búsqueda contiene caracteres no válidos.",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};
