import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../src/index.js";

const content = (
  <div>
    <strong style={{ display: "block", marginBottom: 8 }}>ITSTGO75</strong>
    <span>Notebook corporativo · Santiago</span>
  </div>
);

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  args: {
    children: content,
    variant: "base",
    padding: "md",
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["base", "muted", "elevated"],
    },
    padding: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
    },
    children: {
      control: false,
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Base: Story = {};

export const Muted: Story = {
  args: {
    variant: "muted",
  },
};

export const Elevated: Story = {
  args: {
    variant: "elevated",
  },
};

export const LargePadding: Story = {
  args: {
    padding: "lg",
  },
};
