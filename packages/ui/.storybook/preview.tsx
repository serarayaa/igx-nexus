import type { Preview } from "@storybook/react-vite";
import "../styles/index.css";
import "./preview.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Tema visual de IGX",
      defaultValue: "light",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
    density: {
      description: "Densidad de controles IGX",
      defaultValue: "comfortable",
      toolbar: {
        icon: "component",
        items: [
          { value: "comfortable", title: "Comfortable" },
          { value: "compact", title: "Compact" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => (
      <div
        className="igx-storybook-canvas"
        data-theme={context.globals["theme"]}
        data-density={context.globals["density"]}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      expanded: true,
    },
    a11y: {
      test: "error",
    },
  },
  tags: ["autodocs"],
};

export default preview;
