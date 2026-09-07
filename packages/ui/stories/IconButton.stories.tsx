import type { Meta, StoryObj } from "@storybook/react-vite";
import { RefreshCw, Settings } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import { IconButton } from "../src/index.js";

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  args: {
    "aria-label": "Actualizar activo",
    children: <RefreshCw />,
    variant: "secondary",
    size: "md",
    onPress: fn(),
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
    children: {
      control: false,
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", {
      name: "Actualizar activo",
    });

    await expect(button).toHaveAccessibleName("Actualizar activo");
    await userEvent.tab();
    await expect(button).toHaveFocus();

    await userEvent.keyboard(" ");
    await expect(args.onPress).toHaveBeenCalledTimes(1);
  },
};

export const Primary: Story = {
  args: {
    variant: "primary",
    "aria-label": "Configurar activo",
    children: <Settings />,
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
    "aria-label": "Actualizar activo no disponible",
  },
};
