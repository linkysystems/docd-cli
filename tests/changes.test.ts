import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectOpenChanges } from "../src/commands/changes.js";
import { defaultConfig, writeConfig } from "../src/config.js";

function plan(status: string | null, extra = ""): string {
  const fm = status === null ? "" : `---\nid: x\nfeature_id: f\ntitle: T\nstatus: ${status}\npriority: high\n---\n`;
  return `${fm}${extra}\n# plan\n`;
}

describe("changes", () => {
  let dir: string;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "docd-changes-"));
    await writeConfig(dir, defaultConfig("1.0.0", ["kilo"]));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns null when no .docd.json exists", async () => {
    const empty = await mkdtemp(join(tmpdir(), "docd-changes-empty-"));
    try {
      assert.equal(await collectOpenChanges(empty), null);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });

  it("lists only open changes, excluding completed and archived", async () => {
    const changesDir = join(dir, "docs", "feature-a", "changes");
    await mkdir(changesDir, { recursive: true });
    await writeFile(join(changesDir, "2026-07-01-pending-plan.md"), plan("pending"));
    await writeFile(join(changesDir, "2026-07-02-in-progress-plan.md"), plan("in_progress"));
    await writeFile(join(changesDir, "2026-07-03-blocked-plan.md"), plan("blocked"));
    await writeFile(join(changesDir, "2026-07-04-completed-plan.md"), plan("completed"));

    const open = await collectOpenChanges(dir);
    assert.ok(open);
    const files = open.map((c) => c.fileName).sort();
    assert.deepEqual(files, [
      "2026-07-01-pending-plan.md",
      "2026-07-02-in-progress-plan.md",
      "2026-07-03-blocked-plan.md",
    ]);
  });

  it("ignores changes inside the archive directory", async () => {
    const archiveDir = join(dir, "docs", "feature-a", "archive", "changes");
    await mkdir(archiveDir, { recursive: true });
    await writeFile(join(archiveDir, "2026-01-01-old-plan.md"), plan("pending"));

    const open = await collectOpenChanges(dir);
    assert.ok(open);
    assert.ok(!open.some((c) => c.fileName === "2026-01-01-old-plan.md"));
  });

  it("includes changes from nested subfeatures", async () => {
    const subDir = join(dir, "docs", "feature-a", "sub-x", "changes");
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, "2026-07-05-sub-plan.md"), plan("pending"));

    const open = await collectOpenChanges(dir);
    assert.ok(open);
    const sub = open.find((c) => c.fileName === "2026-07-05-sub-plan.md");
    assert.ok(sub);
    assert.ok(sub.featurePath.endsWith(join("feature-a", "sub-x")));
  });

  it("includes plans without frontmatter as unknown status", async () => {
    const noFmDir = join(dir, "docs", "feature-b", "changes");
    await mkdir(noFmDir, { recursive: true });
    await writeFile(join(noFmDir, "2026-07-06-no-frontmatter-plan.md"), plan(null));

    const open = await collectOpenChanges(dir);
    assert.ok(open);
    const change = open.find((c) => c.fileName === "2026-07-06-no-frontmatter-plan.md");
    assert.ok(change);
    assert.equal(change.status, "unknown");
  });

  it("returns an empty list when there are no open changes", async () => {
    const empty = await mkdtemp(join(tmpdir(), "docd-changes-none-"));
    try {
      await writeConfig(empty, defaultConfig("1.0.0", ["kilo"]));
      const open = await collectOpenChanges(empty);
      assert.ok(open);
      assert.equal(open.length, 0);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });
});
