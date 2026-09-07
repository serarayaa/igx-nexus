import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../src/index.js";

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "Ver activo",
    variant: "primary",
    size: "md",
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary"],
    },
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
    children: "Acción no disponible",
  },
};
