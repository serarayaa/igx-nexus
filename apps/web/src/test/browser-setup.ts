import { beforeEach } from "vitest";
import { DENSITY_STORAGE_KEY, THEME_STORAGE_KEY, NAVIGATION_STORAGE_KEY } from "../shell-preferences";

/**
 * Keep browser tests deterministic while preserving the product's real
 * persistence behavior inside each individual test.
 *
 * V02-014 intentionally persists shell preferences. Browser Mode reuses the
 * same page/storage context across tests, so a theme or density toggle in one
 * historical test must not become the starting state of the next one.
 */
beforeEach(() => {
  window.localStorage.removeItem(NAVIGATION_STORAGE_KEY);
  window.localStorage.setItem(THEME_STORAGE_KEY, "light");
  window.localStorage.setItem(DENSITY_STORAGE_KEY, "comfortable");
  document.documentElement.dataset.theme = "light";
  document.documentElement.dataset.density = "comfortable";
  document.documentElement.style.colorScheme = "light";
});
