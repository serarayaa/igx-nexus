import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Pagination } from "../src/index.js";

const meta = {
  title: "Components/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  args: {
    page: 4,
    totalPages: 12,
    onPageChange: fn(),
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("navigation", { name: "Paginación" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Página 4, página actual" }),
    ).toHaveAttribute("aria-current", "page");

    await userEvent.click(
      canvas.getByRole("button", { name: "Página siguiente" }),
    );
    await expect(args.onPageChange).toHaveBeenCalledWith(5);
  },
};

export const FirstPage: Story = {
  args: {
    page: 1,
    totalPages: 5,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("button", { name: "Página anterior" }),
    ).toBeDisabled();
  },
};

export const LastPage: Story = {
  args: {
    page: 5,
    totalPages: 5,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("button", { name: "Página siguiente" }),
    ).toBeDisabled();
  },
};

export const DarkCompact: Story = {
  args: {
    page: 8,
    totalPages: 24,
  },
  globals: {
    theme: "dark",
    density: "compact",
  },
};
