import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../src/index.js";

const meta = {
  title: "Components/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    label: "Nombre del activo",
    description: "Identificador visible para usuarios de NEXUS.",
    placeholder: "Ej. ITSTGO75",
    size: "md",
  },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Invalid: Story = {
  args: {
    errorMessage: "El nombre del activo es obligatorio.",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
    defaultValue: "ITSTGO75",
  },
};
