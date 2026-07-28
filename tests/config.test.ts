import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_DOCS_CONFIG,
  DocsManagerConfig,
  defaultConfig,
  readConfig,
  writeConfig,
} from "../src/config.js";

describe("config", () => {
  it("defaultConfig embeds the docs-manager defaults under config.docs", () => {
    const config = defaultConfig("1.0.0", ["kilo"]);
    assert.deepEqual(config.config.docs, DEFAULT_DOCS_CONFIG);
    assert.equal(config.config.docs.root, "docs");
    assert.equal(config.config.ides[0], "kilo");
    assert.equal(config.version, "1.0.0");
  });

  it("defaultConfig does not share the docs object between calls", () => {
    const a = defaultConfig("1.0.0", ["kilo"]);
    const b = defaultConfig("1.0.0", ["kilo"]);
    a.config.docs.root = "custom";
    assert.equal(b.config.docs.root, "docs");
  });

  it("accepts null for optional feature files and preserves them", async () => {
    const dir = await mkdtemp(join(tmpdir(), "docd-config-"));
    try {
      const config = defaultConfig("1.0.0", ["kilo"]);
      const docs: DocsManagerConfig = {
        ...config.config.docs,
        uiFile: null,
      };
      config.config.docs = docs;
      await writeConfig(dir, config);

      const loaded = await readConfig(dir);
      assert.ok(loaded);
      assert.equal(loaded.config.docs.uiFile, null);
      assert.equal(loaded.config.docs.guideFile, "guide.md");
      assert.equal(loaded.config.docs.specFile, "spec.md");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("readConfig returns null when no .docd.json exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "docd-config-empty-"));
    try {
      assert.equal(await readConfig(dir), null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
