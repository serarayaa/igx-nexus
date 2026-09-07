import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

type JsonObject = Record<string, unknown>;

type TokenDefinition = {
  path: string;
  type: string;
  value: unknown;
  source: string;
};

type TokenRegistry = Map<string, TokenDefinition>;

const SUPPORTED_TYPES = new Set([
  "color",
  "cubicBezier",
  "dimension",
  "duration",
  "fontFamily",
  "fontWeight",
  "number",
  "shadow",
  "typography",
]);

const REFERENCE_PATTERN = /^\{([^{}]+)\}$/;

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
const tokensDir = resolve(packageRoot, "tokens");
const generatedDir = resolve(packageRoot, "generated");

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectJsonFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = resolve(directory, entry.name);

      if (entry.isDirectory()) {
        return collectJsonFiles(absolutePath);
      }

      return entry.isFile() && entry.name.endsWith(".json")
        ? [absolutePath]
        : [];
    })
    .sort();
}

function normalizeRelativePath(filePath: string): string {
  return relative(tokensDir, filePath).split(sep).join("/");
}

function themeForFile(filePath: string): "light" | "dark" | null {
  const path = normalizeRelativePath(filePath);

  if (
    path === "semantic/light.tokens.json" ||
    path.startsWith("data-viz/light/")
  ) {
    return "light";
  }

  if (
    path === "semantic/dark.tokens.json" ||
    path.startsWith("data-viz/dark/")
  ) {
    return "dark";
  }

  return null;
}

function parseTokenFile(filePath: string): TokenRegistry {
  const document = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  const registry: TokenRegistry = new Map();

  if (!isObject(document)) {
    throw new Error(`Token document must be an object: ${filePath}`);
  }

  function walk(
    node: JsonObject,
    pathParts: string[],
    inheritedType?: string,
  ): void {
    const localType =
      typeof node.$type === "string" ? node.$type : inheritedType;

    if ("$value" in node) {
      if (pathParts.length === 0) {
        throw new Error(`Token without path in ${filePath}`);
      }

      if (!localType) {
        throw new Error(
          `Token "${pathParts.join(".")}" has no $type in ${filePath}`,
        );
      }

      if (!SUPPORTED_TYPES.has(localType)) {
        throw new Error(
          `Unsupported token type "${localType}" at "${pathParts.join(".")}"`,
        );
      }

      const tokenPath = pathParts.join(".");

      if (registry.has(tokenPath)) {
        throw new Error(`Duplicate token "${tokenPath}" in ${filePath}`);
      }

      registry.set(tokenPath, {
        path: tokenPath,
        type: localType,
        value: node.$value,
        source: normalizeRelativePath(filePath),
      });

      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith("$")) {
        continue;
      }

      if (!isObject(value)) {
        throw new Error(
          `Unexpected non-object node "${[...pathParts, key].join(".")}" in ${filePath}`,
        );
      }

      walk(value, [...pathParts, key], localType);
    }
  }

  walk(document, []);

  return registry;
}

function mergeRegistries(...registries: TokenRegistry[]): TokenRegistry {
  const merged: TokenRegistry = new Map();

  for (const registry of registries) {
    for (const [path, token] of registry) {
      const existing = merged.get(path);

      if (existing) {
        throw new Error(
          `Duplicate token "${path}" between "${existing.source}" and "${token.source}"`,
        );
      }

      merged.set(path, token);
    }
  }

  return merged;
}

function resolveValue(
  value: unknown,
  registry: TokenRegistry,
  stack: string[],
  cache: Map<string, unknown>,
): unknown {
  if (typeof value === "string") {
    const reference = value.match(REFERENCE_PATTERN);

    if (reference) {
      const target = reference[1];

      if (!target) {
        throw new Error(`Invalid token reference "${value}"`);
      }

      return resolveToken(target, registry, stack, cache);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, registry, stack, cache));
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        resolveValue(nestedValue, registry, stack, cache),
      ]),
    );
  }

  return value;
}

function resolveToken(
  tokenPath: string,
  registry: TokenRegistry,
  stack: string[] = [],
  cache: Map<string, unknown> = new Map(),
): unknown {
  if (cache.has(tokenPath)) {
    return cache.get(tokenPath);
  }

  const token = registry.get(tokenPath);

  if (!token) {
    const from = stack.at(-1);
    throw new Error(
      `Unknown token reference "${tokenPath}"${from ? ` from "${from}"` : ""}`,
    );
  }

  if (stack.includes(tokenPath)) {
    throw new Error(
      `Circular token reference detected: ${[...stack, tokenPath].join(" -> ")}`,
    );
  }

  const resolved = resolveValue(
    token.value,
    registry,
    [...stack, tokenPath],
    cache,
  );

  cache.set(tokenPath, resolved);

  return resolved;
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(6)));
}

function serializeDimension(value: unknown): string {
  if (
    !isObject(value) ||
    typeof value.value !== "number" ||
    typeof value.unit !== "string"
  ) {
    throw new Error(`Invalid dimension value: ${JSON.stringify(value)}`);
  }

  return `${formatNumber(value.value)}${value.unit}`;
}

function serializeColor(value: unknown): string {
  if (!isObject(value)) {
    throw new Error(`Invalid color value: ${JSON.stringify(value)}`);
  }

  if (value.colorSpace !== "srgb") {
    throw new Error(
      `Only sRGB colors are currently supported: ${JSON.stringify(value)}`,
    );
  }

  if (
    !Array.isArray(value.components) ||
    value.components.length !== 3 ||
    !value.components.every((component) => typeof component === "number")
  ) {
    throw new Error(`Invalid sRGB components: ${JSON.stringify(value)}`);
  }

  const alpha =
    typeof value.alpha === "number"
      ? value.alpha
      : 1;

  if (alpha < 0 || alpha > 1) {
    throw new Error(`Invalid color alpha: ${JSON.stringify(value)}`);
  }

  if (
    typeof value.hex === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(value.hex) &&
    alpha === 1
  ) {
    return value.hex.toUpperCase();
  }

  const [red, green, blue] = value.components as [number, number, number];
  const channels = [red, green, blue].map((component) =>
    Math.round(component * 255),
  );

  return alpha === 1
    ? `rgb(${channels.join(" ")})`
    : `rgb(${channels.join(" ")} / ${formatNumber(alpha)})`;
}

function serializeFontFamily(value: unknown): string {
  if (
    !Array.isArray(value) ||
    !value.every((family) => typeof family === "string")
  ) {
    throw new Error(`Invalid fontFamily value: ${JSON.stringify(value)}`);
  }

  const genericFamilies = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "emoji",
    "math",
    "fangsong",
  ]);

  return value
    .map((family) => {
      if (genericFamilies.has(family)) {
        return family;
      }

      return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(family)
        ? family
        : `"${family.replaceAll('"', '\\"')}"`;
    })
    .join(", ");
}

function serializeCubicBezier(value: unknown): string {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    !value.every((coordinate) => typeof coordinate === "number")
  ) {
    throw new Error(`Invalid cubicBezier value: ${JSON.stringify(value)}`);
  }

  return `cubic-bezier(${value.map(formatNumber).join(", ")})`;
}

function serializeShadowEntry(value: unknown): string {
  if (!isObject(value)) {
    throw new Error(`Invalid shadow value: ${JSON.stringify(value)}`);
  }

  return [
    serializeDimension(value.offsetX),
    serializeDimension(value.offsetY),
    serializeDimension(value.blur),
    serializeDimension(value.spread),
    serializeColor(value.color),
  ].join(" ");
}

function serializeShadow(value: unknown): string {
  return Array.isArray(value)
    ? value.map(serializeShadowEntry).join(", ")
    : serializeShadowEntry(value);
}

function toKebabCase(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function cssVariableName(tokenPath: string): string {
  return `--igx-${tokenPath
    .split(".")
    .map(toKebabCase)
    .join("-")}`;
}

function serializeScalarToken(type: string, value: unknown): string {
  switch (type) {
    case "color":
      return serializeColor(value);

    case "dimension":
    case "duration":
      return serializeDimension(value);

    case "number":
    case "fontWeight":
      if (typeof value !== "number") {
        throw new Error(`Invalid ${type} value: ${JSON.stringify(value)}`);
      }
      return formatNumber(value);

    case "fontFamily":
      return serializeFontFamily(value);

    case "cubicBezier":
      return serializeCubicBezier(value);

    case "shadow":
      return serializeShadow(value);

    default:
      throw new Error(`Cannot serialize scalar token type "${type}"`);
  }
}

function tokenDeclarations(
  token: TokenDefinition,
  resolvedValue: unknown,
): string[] {
  const variableName = cssVariableName(token.path);

  if (token.type !== "typography") {
    return [
      `${variableName}: ${serializeScalarToken(token.type, resolvedValue)};`,
    ];
  }

  if (!isObject(resolvedValue)) {
    throw new Error(
      `Invalid typography value at "${token.path}": ${JSON.stringify(resolvedValue)}`,
    );
  }

  const requiredProperties = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
  ] as const;

  for (const property of requiredProperties) {
    if (!(property in resolvedValue)) {
      throw new Error(
        `Typography token "${token.path}" is missing "${property}"`,
      );
    }
  }

  return [
    `${variableName}-font-family: ${serializeFontFamily(resolvedValue.fontFamily)};`,
    `${variableName}-font-size: ${serializeDimension(resolvedValue.fontSize)};`,
    `${variableName}-font-weight: ${serializeScalarToken("fontWeight", resolvedValue.fontWeight)};`,
    `${variableName}-letter-spacing: ${serializeDimension(resolvedValue.letterSpacing)};`,
    `${variableName}-line-height: ${serializeScalarToken("number", resolvedValue.lineHeight)};`,
  ];
}

function declarationsForRegistry(
  sourceRegistry: TokenRegistry,
  resolutionRegistry: TokenRegistry,
): string[] {
  const cache = new Map<string, unknown>();

  return [...sourceRegistry.values()]
    .sort((left, right) => left.path.localeCompare(right.path))
    .flatMap((token) =>
      tokenDeclarations(
        token,
        resolveToken(token.path, resolutionRegistry, [], cache),
      ),
    );
}

function assertThemeParity(
  lightRegistry: TokenRegistry,
  darkRegistry: TokenRegistry,
): void {
  const lightPaths = [...lightRegistry.keys()].sort();
  const darkPaths = [...darkRegistry.keys()].sort();

  const missingInDark = lightPaths.filter((path) => !darkRegistry.has(path));
  const missingInLight = darkPaths.filter((path) => !lightRegistry.has(path));

  if (missingInDark.length || missingInLight.length) {
    throw new Error(
      [
        "Light/Dark token contract mismatch.",
        missingInDark.length
          ? `Missing in dark: ${missingInDark.join(", ")}`
          : "",
        missingInLight.length
          ? `Missing in light: ${missingInLight.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  for (const path of lightPaths) {
    const lightToken = lightRegistry.get(path);
    const darkToken = darkRegistry.get(path);

    if (!lightToken || !darkToken || lightToken.type !== darkToken.type) {
      throw new Error(`Light/Dark type mismatch at "${path}"`);
    }
  }
}

function formatCssBlock(selector: string, declarations: string[]): string {
  return [
    selector,
    "{",
    ...declarations.map((declaration) => `  ${declaration}`),
    "}",
    "",
  ].join("\n");
}

function generatedHeader(): string {
  return [
    "/*",
    " * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.",
    " * Source: packages/ui/tokens (recursive JSON files)",
    " * Generator: packages/ui/scripts/build-tokens.ts",
    " */",
    "",
  ].join("\n");
}

function writeGeneratedFile(fileName: string, content: string): void {
  writeFileSync(
    resolve(generatedDir, fileName),
    `${generatedHeader()}${content}`,
    "utf8",
  );
}

const allFiles = collectJsonFiles(tokensDir);

const commonFiles = allFiles.filter((file) => themeForFile(file) === null);
const lightFiles = allFiles.filter((file) => themeForFile(file) === "light");
const darkFiles = allFiles.filter((file) => themeForFile(file) === "dark");

const commonRegistry = mergeRegistries(...commonFiles.map(parseTokenFile));
const lightThemeRegistry = mergeRegistries(...lightFiles.map(parseTokenFile));
const darkThemeRegistry = mergeRegistries(...darkFiles.map(parseTokenFile));

assertThemeParity(lightThemeRegistry, darkThemeRegistry);

const lightResolutionRegistry = mergeRegistries(
  commonRegistry,
  lightThemeRegistry,
);
const darkResolutionRegistry = mergeRegistries(
  commonRegistry,
  darkThemeRegistry,
);

const commonDeclarations = declarationsForRegistry(
  commonRegistry,
  commonRegistry,
);

const lightDeclarations = declarationsForRegistry(
  lightThemeRegistry,
  lightResolutionRegistry,
);

const darkDeclarations = declarationsForRegistry(
  darkThemeRegistry,
  darkResolutionRegistry,
);

mkdirSync(generatedDir, { recursive: true });

writeGeneratedFile(
  "tokens.css",
  formatCssBlock(":root", commonDeclarations),
);

writeGeneratedFile(
  "theme-light.css",
  formatCssBlock(':root,\n[data-theme="light"]', lightDeclarations),
);

writeGeneratedFile(
  "theme-dark.css",
  formatCssBlock('[data-theme="dark"]', darkDeclarations),
);

writeGeneratedFile(
  "index.css",
  [
    '@import "./tokens.css";',
    '@import "./theme-light.css";',
    '@import "./theme-dark.css";',
    "",
  ].join("\n"),
);

console.log(
  [
    "✅ IGX token build completed",
    `   Common tokens: ${commonRegistry.size}`,
    `   Light tokens:  ${lightThemeRegistry.size}`,
    `   Dark tokens:   ${darkThemeRegistry.size}`,
    `   CSS variables: ${commonDeclarations.length + lightDeclarations.length + darkDeclarations.length}`,
  ].join("\n"),
);
