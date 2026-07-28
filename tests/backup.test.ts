import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupPath, backupFile, ensureBackupDir } from "../src/backup.js";

describe("backup", () => {
  let dir: string;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "docd-backup-"));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("backupPath sanitizes slashes in the installed path", () => {
    const result = backupPath("/backups", ".agents/agents/docd.md", "2026-07-25T10-00-00");
    assert.equal(result, "/backups/2026-07-25T10-00-00_.agents_agents_docd.md");
  });

  it("backupPath sanitizes backslashes", () => {
    const result = backupPath("/backups", ".agents\\agents\\docd.md", "ts");
    assert.equal(result, "/backups/ts_.agents_agents_docd.md");
  });

  it("backupFile copies the file into the backup dir and returns the target", async () => {
    const src = join(dir, "installed.md");
    await writeFile(src, "original content\n", "utf-8");
    const backupDir = join(dir, "nested", "backups");

    const target = await backupFile(src, backupDir, "ts1");
    assert.equal(target, backupPath(backupDir, src, "ts1"));
    assert.equal(await readFile(target, "utf-8"), "original content\n");
  });

  it("ensureBackupDir creates the directory and is idempotent", async () => {
    const backupDir = join(dir, "ensure", "backups");
    assert.equal(existsSync(backupDir), false);
    await ensureBackupDir(backupDir);
    assert.equal(existsSync(backupDir), true);
    await ensureBackupDir(backupDir);
    assert.equal(existsSync(backupDir), true);
  });
});
