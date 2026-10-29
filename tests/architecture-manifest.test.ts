import { describe, expect, it } from "vitest";
import { createArchitectureManifest, validateArchitectureManifest } from "../lib/architecture/manifest";
import { createProjectPlan } from "../lib/planner/create-plan";

describe("architecture manifest generation", () => {
  it("turns a project brief into a structured, validated manifest", () => {
    const plan = createProjectPlan({
      projectName: "Shop app",
      description: "Create an online store with product listings, a shopping cart, user accounts and secure checkout.",
    });
    const manifest = createArchitectureManifest(plan);

    expect(manifest.version).toBe(1);
    expect(manifest.projectName).toBe("Shop app");
    expect(manifest.entries.length).toBeGreaterThan(0);
    expect(manifest.entries.some((entry) => entry.kind === "directory")).toBe(true);
    expect(manifest.securityControls.length).toBeGreaterThan(0);
  });

  it("rejects traversal paths and duplicate paths case-insensitively", () => {
    const result = validateArchitectureManifest({
      version: 1,
      projectName: "Unsafe app",
      summary: "Example",
      recommendedStack: ["Next.js"],
      entries: [
        { path: "../secrets.txt", kind: "file", purpose: "Unsafe", dependsOn: [] },
        { path: "src/App.tsx", kind: "file", purpose: "Component", dependsOn: [] },
        { path: "src/app.tsx", kind: "file", purpose: "Duplicate", dependsOn: [] },
      ],
      dataModels: [],
      securityControls: ["Validate inputs"],
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((error) => error.includes("Unsafe"))).toBe(true);
      expect(result.errors.some((error) => error.includes("Duplicate"))).toBe(true);
    }
  });

  it("rejects dependencies that do not exist and self-dependencies", () => {
    const result = validateArchitectureManifest({
      version: 1,
      projectName: "Dependency app",
      summary: "Example",
      recommendedStack: ["TypeScript"],
      entries: [
        { path: "src/app.ts", kind: "file", purpose: "Entry", dependsOn: ["src/missing.ts", "src/app.ts"] },
      ],
      dataModels: [],
      securityControls: ["Keep secrets server-side"],
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((error) => error.includes("Unknown dependency"))).toBe(true);
      expect(result.errors.some((error) => error.includes("cannot depend on itself"))).toBe(true);
    }
  });

  it("rejects malformed manifest shapes", () => {
    const result = validateArchitectureManifest({ version: 2, entries: [] });
    expect(result.valid).toBe(false);
  });
});
