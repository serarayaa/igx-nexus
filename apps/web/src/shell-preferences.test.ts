import { describe, expect, it } from "vitest";
import {
  DENSITY_STORAGE_KEY,
  THEME_STORAGE_KEY,
  NAVIGATION_STORAGE_KEY,
  readNavigationPreference,
  parseDensity,
  parseTheme,
  persistPreference,
  readDensityPreference,
  readThemePreference,
  resolveInitialDensity,
  resolveInitialTheme,
  type PreferenceStorage,
} from "./shell-preferences";

function memoryStorage(initial: Record<string, string> = {}): PreferenceStorage & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe("shell preferences", () => {
  it("keeps presentation independent of route, theme and density, with safe storage fallback", () => {
    expect(readNavigationPreference(null)).toBe("expanded");
    expect(readNavigationPreference(memoryStorage({ [NAVIGATION_STORAGE_KEY]: "rail" }))).toBe("rail");
    expect(readNavigationPreference(memoryStorage({ [NAVIGATION_STORAGE_KEY]: "unknown" }))).toBe("expanded");
    expect(readNavigationPreference({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} })).toBe("expanded");
  });
  it("acepta sólo valores gobernados", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBeNull();
    expect(parseDensity("compact")).toBe("compact");
    expect(parseDensity("dense")).toBeNull();
  });

  it("prioriza preferencia guardada y usa sistema sólo como fallback de tema", () => {
    expect(resolveInitialTheme("light", true)).toBe("light");
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
    expect(resolveInitialDensity(null)).toBe("comfortable");
    expect(resolveInitialDensity("compact")).toBe("compact");
  });

  it("lee y persiste preferencias sin acoplar el shell a localStorage", () => {
    const storage = memoryStorage({
      [THEME_STORAGE_KEY]: "dark",
      [DENSITY_STORAGE_KEY]: "compact",
    });
    expect(readThemePreference(storage)).toBe("dark");
    expect(readDensityPreference(storage)).toBe("compact");

    persistPreference(storage, THEME_STORAGE_KEY, "light");
    persistPreference(storage, DENSITY_STORAGE_KEY, "comfortable");
    expect(storage.values.get(THEME_STORAGE_KEY)).toBe("light");
    expect(storage.values.get(DENSITY_STORAGE_KEY)).toBe("comfortable");
  });

  it("degrada de forma segura cuando storage falla", () => {
    const broken: PreferenceStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    expect(readThemePreference(broken)).toBeNull();
    expect(readDensityPreference(broken)).toBeNull();
    expect(() => persistPreference(broken, THEME_STORAGE_KEY, "dark")).not.toThrow();
  });
});
