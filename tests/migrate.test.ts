import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findLegacyFiles, legacyInstalledPath, migrateLegacyLayout } from "../src/migrate.js";
import { KiloProvider } from "../src/providers/kilo.js";
import { KimiProvider } from "../src/providers/kimi.js";
import type { Manifest } from "../src/manifest.js";

const manifest: Manifest = {
  files: [
    { sourcePath: "t/agent/docs-manager.md", relativePath: "agent/docs-manager.md", content: "agent", version: "1", frontmatter: null },
    { sourcePath: "t/skill/docs-plan/SKILL.md", relativePath: "skill/docs-plan/SKILL.md", content: "skill", version: "1", frontmatter: null },
  ],
};

async function seedLegacy(dir: string): Promise<void> {
  await mkdir(join(dir, ".kilo/agent"), { recursive: true });
  await mkdir(join(dir, ".kilo/skills/docs-plan"), { recursive: true });
  await writeFile(join(dir, ".kilo/agent/docs-manager.md"), "legacy agent\n", "utf-8");
  await writeFile(join(dir, ".kilo/skills/docs-plan/SKILL.md"), "legacy skill\n", "utf-8");
}

describe("migrate", () => {
  it("maps template paths to the legacy kilo layout", () => {
    const kilo = new KiloProvider();
    assert.equal(legacyInstalledPath(kilo, "agent/docs-manager.md"), ".kilo/agent/docs-manager.md");
    assert.equal(legacyInstalledPath(kilo, "skill/docs-plan/SKILL.md"), ".kilo/skills/docs-plan/SKILL.md");
    assert.equal(legacyInstalledPath(kilo, "docs/spec.md"), null);
  });

  it("returns null for providers without a legacy layout", () => {
    assert.equal(legacyInstalledPath(new KimiProvider(), "agent/docs-manager.md"), null);
  });

  it("moves legacy files into the new layout, preserving content", async () => {
    const dir = await mkdtemp(join(tmpdir(), "docd-migrate-"));
    try {
      await seedLegacy(dir);
      const kilo = new KiloProvider();

      assert.deepEqual(findLegacyFiles(kilo, dir, manifest).sort(), [
        ".kilo/agent/docs-manager.md",
        ".kilo/skills/docs-plan/SKILL.md",
      ]);

      const migrated = await migrateLegacyLayout(kilo, dir, manifest);
      assert.equal(migrated, 2);
      assert.equal(await readFile(join(dir, ".agents/agents/docs-manager.md"), "utf-8"), "legacy agent\n");
      assert.equal(
        await readFile(join(dir, ".agents/skills/docs-plan/SKILL.md"), "utf-8"),
        "legacy skill\n",
      );
      assert.equal(existsSync(join(dir, ".kilo/agent/docs-manager.md")), false);
      assert.deepEqual(findLegacyFiles(kilo, dir, manifest), []);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps the legacy file when the new target already exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "docd-migrate-"));
    try {
      await seedLegacy(dir);
      await mkdir(join(dir, ".agents/agents"), { recursive: true });
      await writeFile(join(dir, ".agents/agents/docs-manager.md"), "current\n", "utf-8");
      const kilo = new KiloProvider();

      const migrated = await migrateLegacyLayout(kilo, dir, manifest);
      assert.equal(migrated, 1);
      assert.equal(await readFile(join(dir, ".agents/agents/docs-manager.md"), "utf-8"), "current\n");
      assert.equal(existsSync(join(dir, ".kilo/agent/docs-manager.md")), true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not write anything in dry-run mode", async () => {
    const dir = await mkdtemp(join(tmpdir(), "docd-migrate-"));
    try {
      await seedLegacy(dir);
      const kilo = new KiloProvider();

      const migrated = await migrateLegacyLayout(kilo, dir, manifest, true);
      assert.equal(migrated, 0);
      assert.equal(existsSync(join(dir, ".agents/agents/docs-manager.md")), false);
      assert.equal(existsSync(join(dir, ".kilo/agent/docs-manager.md")), true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
