import { describe, expect, it } from "vitest";
import { enforcePreviewPolicy, isSafeGeneratedFilePath } from "../lib/generation/security";

describe("generated source path validation", () => {
  it("accepts normal relative source paths", () => {
    expect(isSafeGeneratedFilePath("index.html")).toBe(true);
    expect(isSafeGeneratedFilePath("assets/app.min.js")).toBe(true);
    expect(isSafeGeneratedFilePath("src/components/Button.tsx")).toBe(true);
  });

  it.each([
    "",
    "/etc/passwd",
    "../secrets.txt",
    "src/../../secrets.txt",
    "src/./page.tsx",
    "src//page.tsx",
    "src\\page.tsx",
    "file name.html",
    ".env",
    ".env.example",
    "src/.env.production",
    "CON",
    "aux.txt",
    "trailing.",
    "trailing ",
    ".git/config",
    "node_modules/package/index.js",
    ".npmrc",
  ])("rejects unsafe or non-portable path %s", (path) => {
    expect(isSafeGeneratedFilePath(path)).toBe(false);
  });

  it("rejects oversized paths", () => {
    expect(isSafeGeneratedFilePath("a".repeat(181))).toBe(false);
  });
});

describe("generated preview content security policy", () => {
  it("replaces model-supplied policy with one restrictive policy before application scripts", () => {
    const input = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src *"><title>App</title></head><body><script>window.ready = true;</script></body></html>';
    const output = enforcePreviewPolicy(input);

    expect((output.match(/Content-Security-Policy/gi) ?? []).length).toBe(1);
    expect(output.indexOf("Content-Security-Policy")).toBeLessThan(output.indexOf("<script>"));
    expect(output).toContain("default-src 'none'");
    expect(output).toContain("connect-src 'none'");
    expect(output).toContain("form-action 'none'");
    expect(output).toContain("object-src 'none'");
    expect(output).not.toContain("default-src *");
  });

  it("adds a policy when a document has no head element", () => {
    const output = enforcePreviewPolicy("<!doctype html><html><body>Safe</body></html>");
    expect(output).toContain("<head><meta http-equiv=\"Content-Security-Policy\"");
    expect(output).toContain("<body>Safe</body>");
  });
});
