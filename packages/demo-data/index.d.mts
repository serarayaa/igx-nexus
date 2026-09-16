import type { TechnologyRelationship, TechnologySnapshot } from "@igx-nexus/types";

export const DEMO_DATASET_VERSION: "2.1.0";
export const DEMO_LEGACY_DATASET_VERSION: "1.0.0";
export const DEMO_AS_OF: "2026-09-09T12:00:00.000Z";

export const demoSites: readonly [
  "Oficina Demo Centro",
  "Planta Demo Norte",
  "Planta Demo Sur",
  "Bodega Demo",
];

export type DemoHeroScenario =
  | "insufficient"
  | "expired"
  | "warranty_due"
  | "healthy"
  | "relationships"
  | "ot"
  | "degraded"
  | "attention"
  | "retired"
  | "stock"
  | "repair";

export interface DemoHero {
  readonly assetId: string;
  readonly scenario: DemoHeroScenario;
  readonly purpose: string;
}

export const demoHeroes: readonly DemoHero[];

export const demoRelationshipFixtures: readonly TechnologyRelationship[];

export function createCanonicalDemoSnapshot(): TechnologySnapshot;
export const demoCanonicalSnapshot: TechnologySnapshot;
