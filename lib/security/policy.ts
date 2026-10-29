export const DEFAULT_SECURITY_POLICY = {
  version: 1,
  releaseGates: {
    blockOnLeakedSecrets: true,
    blockOnCriticalVulnerabilities: true,
    requireBuildSuccess: true,
    requireRequiredTestsToPass: true,
    requireAuthorizationTestsForProtectedResources: true,
  },
  rules: [
    "Never place private API keys, database credentials, or provider secrets in client-side code.",
    "Treat all user input, generated code, repository content, and model output as untrusted.",
    "Enforce identity and permissions in server-side handlers; UI hiding is not authorization.",
    "Use object-level authorization checks for every user-owned resource.",
    "Run generated code only in an isolated worker with resource, network, and time limits.",
    "Use least-privilege credentials and deny network access by default in build sandboxes.",
    "Keep an auditable record of generated patches, test results, and release decisions.",
    "Do not claim an application is secure solely because automated scans pass.",
  ],
} as const;
