import { z } from "zod";
import type { ProjectPlan } from "@/lib/planner/schema";
import { isSafeGeneratedFilePath } from "@/lib/generation/security";

const manifestEntrySchema = z.object({
  path: z.string().min(1).max(180),
  kind: z.enum(["directory", "file"]),
  purpose: z.string().trim().min(1).max(240),
  dependsOn: z.array(z.string().min(1).max(180)).max(30).default([]),
});

export const architectureManifestSchema = z.object({
  version: z.literal(1),
  projectName: z.string().trim().min(1).max(60),
  summary: z.string().trim().min(1).max(1000),
  recommendedStack: z.array(z.string().trim().min(1).max(160)).min(1).max(20),
  entries: z.array(manifestEntrySchema).min(1).max(80),
  dataModels: z.array(z.string().trim().min(1).max(120)).max(60),
  securityControls: z.array(z.string().trim().min(1).max(240)).min(1).max(30),
});

export type ArchitectureManifest = z.infer<typeof architectureManifestSchema>;

export type ManifestValidationResult =
  | { valid: true; manifest: ArchitectureManifest; errors: [] }
  | { valid: false; manifest: null; errors: string[] };

/** Convert the first-pass product plan into an explicit, validated architecture manifest. */
export function createArchitectureManifest(plan: ProjectPlan): ArchitectureManifest {
  const entries = plan.fileTree.map((item) => {
    const separator = item.indexOf(" — ");
    const rawPath = (separator >= 0 ? item.slice(0, separator) : item).trim();
    const purpose = (separator >= 0 ? item.slice(separator + 3) : "Project module").trim();
    const isDirectory = rawPath.endsWith("/");
    return {
      path: isDirectory ? rawPath.slice(0, -1) : rawPath,
      kind: isDirectory ? "directory" as const : "file" as const,
      purpose: purpose || "Project module",
      dependsOn: [] as string[],
    };
  });

  const candidate = {
    version: 1 as const,
    projectName: plan.projectName,
    summary: plan.summary,
    recommendedStack: plan.recommendedStack,
    entries,
    dataModels: plan.dataModels,
    securityControls: plan.securityChecks,
  };

  const result = validateArchitectureManifest(candidate);
  if (!result.valid) {
    throw new Error("The generated architecture manifest failed validation: " + result.errors.join(" "));
  }
  return result.manifest;
}

/**
 * Validate paths, uniqueness and dependency references before a manifest is accepted.
 * This validates metadata only; it does not execute generated code or prove security.
 */
export function validateArchitectureManifest(input: unknown): ManifestValidationResult {
  const parsed = architectureManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      manifest: null,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const manifest = parsed.data;
  const errors: string[] = [];
  const paths = new Set<string>();

  for (const entry of manifest.entries) {
    const key = entry.path.toLowerCase();
    if (!isSafeGeneratedFilePath(entry.path)) {
      errors.push(`Unsafe or non-portable architecture path: ${entry.path}`);
    }
    if (paths.has(key)) {
      errors.push(`Duplicate architecture path: ${entry.path}`);
    }
    paths.add(key);
  }

  for (const entry of manifest.entries) {
    for (const dependency of entry.dependsOn) {
      if (!paths.has(dependency.toLowerCase())) {
        errors.push(`Unknown dependency "${dependency}" referenced by "${entry.path}".`);
      }
      if (dependency.toLowerCase() === entry.path.toLowerCase()) {
        errors.push(`Entry "${entry.path}" cannot depend on itself.`);
      }
    }
  }

  return errors.length
    ? { valid: false, manifest: null, errors }
    : { valid: true, manifest, errors: [] };
}
