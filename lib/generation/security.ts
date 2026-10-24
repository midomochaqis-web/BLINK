const PREVIEW_CSP = "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' data:; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'\">";

const SAFE_FILE_PATH = /^[a-zA-Z0-9._/-]+$/;
const RESERVED_SEGMENTS = new Set([".git", ".env", ".npmrc", ".yarnrc", "node_modules"]);

/**
 * Restrict generated archive entries to portable relative file paths.
 * Prevent traversal, absolute paths, control characters, and secret-bearing directories.
 */
export function isSafeGeneratedFilePath(path: string): boolean {
  if (!path || path.length > 180 || !SAFE_FILE_PATH.test(path) || path.startsWith("/") || path.includes("\\")) {
    return false;
  }
  const segments = path.split("/");
  return segments.every((segment) => {
    const normalized = segment.toLowerCase();
    const windowsDeviceName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(normalized.split(".")[0] || "");
    return segment.length > 0 &&
      segment !== "." &&
      segment !== ".." &&
      !/[. ]$/.test(segment) &&
      !windowsDeviceName &&
      !normalized.startsWith(".env") &&
      !RESERVED_SEGMENTS.has(normalized);
  });
}

/**
 * Generated code runs in a sandboxed iframe. This meta CSP intentionally denies
 * network access, remote assets, form submission, nested frames, and plugins.
 */
export function enforcePreviewPolicy(source: string): string {
  const withoutExistingPolicy = source.replace(/<meta\b[^>]*content-security-policy[^>]*>/gi, "");
  if (/<head\b[^>]*>/i.test(withoutExistingPolicy)) {
    return withoutExistingPolicy.replace(/<head\b[^>]*>/i, (head) => head + PREVIEW_CSP);
  }
  if (/<html\b[^>]*>/i.test(withoutExistingPolicy)) {
    return withoutExistingPolicy.replace(/<html\b[^>]*>/i, (tag) => tag + "<head>" + PREVIEW_CSP + "</head>");
  }

  // Edited/local documents can be malformed or partial. Never return raw source
  // without a policy: wrap fragments in a full document with the policy in its head.
  const bodySource = withoutExistingPolicy.replace(/<!doctype\s+html[^>]*>/gi, "");
  return "<!doctype html><html><head>" + PREVIEW_CSP + "</head><body>" + bodySource + "</body></html>";
}
