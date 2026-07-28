import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeDiff, normalizeNewlines, hasMeaningfulDiff } from "../src/diff.js";

describe("diff", () => {
  it("computeDiff reports unchanged for identical content", () => {
    const result = computeDiff("same\n", "same\n");
    assert.equal(result.changed, false);
  });

  it("computeDiff reports changed with a unified patch", () => {
    const result = computeDiff("old line\n", "new line\n");
    assert.equal(result.changed, true);
    assert.ok(result.patch.includes("-old line"));
    assert.ok(result.patch.includes("+new line"));
  });

  it("normalizeNewlines converts CRLF to LF", () => {
    assert.equal(normalizeNewlines("a\r\nb\r\n"), "a\nb\n");
  });

  it("hasMeaningfulDiff ignores newline-style differences", () => {
    assert.equal(hasMeaningfulDiff("a\r\nb\r\n", "a\nb\n"), false);
  });

  it("hasMeaningfulDiff ignores leading/trailing whitespace", () => {
    assert.equal(hasMeaningfulDiff("  content  \n", "content"), false);
  });

  it("hasMeaningfulDiff detects real content changes", () => {
    assert.equal(hasMeaningfulDiff("content a", "content b"), true);
  });
});
