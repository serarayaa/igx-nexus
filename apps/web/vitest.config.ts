import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "model", include: ["src/**/*.test.ts"] } },
      { test: {
        name: "dashboard", include: ["src/**/*.browser.test.tsx"],
        browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }], viewport: { width: 1440, height: 1000 } },
      } },
    ],
  },
});
