import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", {
      name: "Nombre del activo",
    });

    await expect(input).toHaveAccessibleName("Nombre del activo");
    await userEvent.tab();
    await expect(input).toHaveFocus();

    await userEvent.type(input, "ITSTGO75");
    await expect(input).toHaveValue("ITSTGO75");
  },
};

export const Invalid: Story = {
  args: {
    errorMessage: "El nombre del activo es obligatorio.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", {
      name: "Nombre del activo",
    });

    await expect(input).toHaveAttribute("aria-invalid", "true");
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
    defaultValue: "ITSTGO75",
  },
};
