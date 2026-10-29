import { describe, expect, it } from "vitest";
import { canRelease } from "../lib/orchestrator/workflow";

describe("BLINK release gates", () => {
  it("blocks release when secrets are detected", () => {
    const result = canRelease({ buildPassed: true, requiredTestsPassed: true, leakedSecrets: 1, criticalVulnerabilities: 0, authorizationTestsPassed: true });
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("Potential leaked secrets were detected.");
  });

  it("blocks release when authorization tests fail", () => {
    const result = canRelease({ buildPassed: true, requiredTestsPassed: true, leakedSecrets: 0, criticalVulnerabilities: 0, authorizationTestsPassed: false });
    expect(result.allowed).toBe(false);
  });

  it("allows release only when all required gates pass", () => {
    const result = canRelease({ buildPassed: true, requiredTestsPassed: true, leakedSecrets: 0, criticalVulnerabilities: 0, authorizationTestsPassed: true });
    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});
