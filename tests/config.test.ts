import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DOCS_CONFIG, defaultConfig } from "../src/config.js";

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
});
