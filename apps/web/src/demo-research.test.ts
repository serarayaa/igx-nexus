import { describe, expect, it } from "vitest";
import { buildProactiveFindingsReport, validateKnowledgeResearchReport } from "@igx-nexus/types";
import { demoSnapshot } from "./demo-provider";
import { createDemoResearchReport } from "./demo-research";

describe("Demo Knowledge Research", () => {
  it("deriva packets válidos y deterministas para todos los findings Demo", () => {
    const canonical = demoSnapshot.canonical!;
    const findings = buildProactiveFindingsReport(canonical).findings;
    expect(findings.length).toBeGreaterThan(0);

    for (const finding of findings) {
      const first = createDemoResearchReport(finding);
      const second = createDemoResearchReport(finding);

      expect(validateKnowledgeResearchReport(first)).toEqual([]);
      expect(second).toEqual(first);
      expect(first.request.findingId).toBe(finding.id);
      expect(first.request.assetId).toBe(finding.assetId);
      expect(first.sources.every(source => source.sourceClass === "synthetic_fixture")).toBe(true);
      expect(first.sources.every(source => source.location.kind === "synthetic_reference")).toBe(true);
      expect(first.sources.every(source => source.contentTrust === "untrusted")).toBe(true);
      expect(first.claims.every(claim => claim.localEvidence === false)).toBe(true);
      expect(first.recommendations.every(recommendation =>
        recommendation.humanReviewRequired === true
        && recommendation.executionAllowed === false
      )).toBe(true);
      expect(first.review.executionAuthorized).toBe(false);
    }
  });

  it("usa un finding Demo real para demostrar contradicción unresolved", () => {
    const canonical = demoSnapshot.canonical!;
    const finding = buildProactiveFindingsReport(canonical).findings.find(
      item => item.ruleId === "nexus.endpoint.application-instability",
    );
    expect(finding).toBeTruthy();

    const report = createDemoResearchReport(finding!);
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0]?.resolution).toBe("unresolved");
    expect(report.claims.some(claim => claim.supportState === "contested")).toBe(true);
  });
});
