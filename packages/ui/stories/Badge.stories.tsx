import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../src/index.js";

const meta = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: {
    children: "Notebook",
    tone: "neutral",
  },
  argTypes: {
    tone: {
      control: "inline-radio",
      options: ["neutral", "accent"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Accent: Story = {
  args: {
    tone: "accent",
    children: "Innergex Chile",
  },
};
