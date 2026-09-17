export type NexusTheme = "light" | "dark";
export type NexusDensity = "comfortable" | "compact";

export const THEME_STORAGE_KEY = "igx-nexus:theme";
export const DENSITY_STORAGE_KEY = "igx-nexus:density";

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseTheme(value: string | null): NexusTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function parseDensity(value: string | null): NexusDensity | null {
  return value === "comfortable" || value === "compact" ? value : null;
}

export function readThemePreference(storage: PreferenceStorage | null): NexusTheme | null {
  if (!storage) return null;
  try {
    return parseTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readDensityPreference(storage: PreferenceStorage | null): NexusDensity | null {
  if (!storage) return null;
  try {
    return parseDensity(storage.getItem(DENSITY_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function resolveInitialTheme(stored: NexusTheme | null, prefersDark: boolean): NexusTheme {
  return stored ?? (prefersDark ? "dark" : "light");
}

export function resolveInitialDensity(stored: NexusDensity | null): NexusDensity {
  return stored ?? "comfortable";
}

export function persistPreference(storage: PreferenceStorage | null, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // El shell debe seguir funcionando cuando storage esté bloqueado o sin cuota.
  }
}
