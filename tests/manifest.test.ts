import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  findTemplateByInstalledPath,
  loadManifest,
  parseFrontmatter,
  serializeFrontmatter,
} from "../src/manifest.js";

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

describe("loadManifest", () => {
  it("walks nested dirs and extracts frontmatter versions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "docd-manifest-"));
    try {
      await mkdir(join(dir, "agent"), { recursive: true });
      await mkdir(join(dir, "skill", "docd"), { recursive: true });
      await writeFile(
        join(dir, "agent", "docd.md"),
        "---\nname: docd\nversion: 1.2.3\n---\n\n# agent\n",
      );
      await writeFile(join(dir, "skill", "docd", "SKILL.md"), "# no frontmatter\n");

      const manifest = await loadManifest(dir);
      assert.equal(manifest.files.length, 2);

      const agent = manifest.files.find((f) => f.relativePath === join("agent", "docd.md"));
      assert.ok(agent);
      assert.equal(agent.version, "1.2.3");
      assert.deepEqual(agent.frontmatter, { name: "docd", version: "1.2.3" });

      const skill = manifest.files.find((f) => f.relativePath === join("skill", "docd", "SKILL.md"));
      assert.ok(skill);
      assert.equal(skill.version, null);
      assert.equal(skill.frontmatter, null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("findTemplateByInstalledPath matches by relative path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "docd-manifest-find-"));
    try {
      await writeFile(join(dir, "a.md"), "# a\n");
      const manifest = await loadManifest(dir);
      assert.equal(findTemplateByInstalledPath(manifest, "a.md")?.relativePath, "a.md");
      assert.equal(findTemplateByInstalledPath(manifest, "missing.md"), undefined);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
