import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, serializeFrontmatter } from "../src/manifest.js";

describe("manifest", () => {
  it("parses YAML frontmatter", () => {
    const content = `---\nname: docs-plan\nversion: 1.0.0\n---\n\n# docs-plan\n`;
    const parsed = parseFrontmatter(content);
    assert.ok(parsed);
    assert.equal(parsed.frontmatter.name, "docs-plan");
    assert.equal(parsed.frontmatter.version, "1.0.0");
    assert.ok(parsed.body.startsWith("\n# docs-plan"));
  });

  it("serializes frontmatter preserving version", () => {
    const content = `---\nname: docs-plan\nversion: 1.0.0\n---\n\n# docs-plan\n`;
    const parsed = parseFrontmatter(content)!;
    parsed.frontmatter.version = "1.1.0";
    const out = serializeFrontmatter(parsed.frontmatter, parsed.body);
    assert.ok(out.includes("version: 1.1.0"));
  });

  it("returns null when no frontmatter is present", () => {
    const content = `# no frontmatter\n`;
    const parsed = parseFrontmatter(content);
    assert.equal(parsed, null);
  });
});
