import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runUpdate } from "../src/commands/update.js";
import { defaultConfig, readConfig, writeConfig } from "../src/config.js";

async function captureLogs(fn: () => Promise<void>): Promise<string[]> {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return logs;
}

describe("update", () => {
  it("processes each shared config dir only once when ides resolve to the same layout", async () => {
    const dir = await mkdtemp(join(tmpdir(), "docd-update-"));
    try {
      const config = defaultConfig("0.0.0", ["kilo", "kimi"]);
      config.config.kiloConfigDir = ".agents";
      config.config.kimiConfigDir = ".agents";
      await writeConfig(dir, config);

      const logs = await captureLogs(() => runUpdate({ cwd: dir, yes: true }));

      const installs = logs.filter((l) => l.includes("installed .agents/agents/docs-manager.md"));
      assert.equal(installs.length, 1);
      assert.ok(logs.some((l) => l.includes("shares") && l.includes("skipping duplicate pass")));
      assert.equal(existsSync(join(dir, ".agents/agents/docs-manager.md")), true);
      assert.equal(existsSync(join(dir, ".agents/skills/docs-plan/SKILL.md")), true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("migrates a legacy .kilo layout and updates the recorded config dir", async () => {
    const dir = await mkdtemp(join(tmpdir(), "docd-update-"));
    try {
      const config = defaultConfig("0.0.0", ["kilo"]);
      config.config.kiloConfigDir = ".kilo";
      await writeConfig(dir, config);
      await mkdir(join(dir, ".kilo/agent"), { recursive: true });
      await mkdir(join(dir, ".kilo/skills/docs-plan"), { recursive: true });
      await writeFile(join(dir, ".kilo/agent/docs-manager.md"), "legacy agent\n", "utf-8");
      await writeFile(join(dir, ".kilo/skills/docs-plan/SKILL.md"), "legacy skill\n", "utf-8");

      const logs = await captureLogs(() => runUpdate({ cwd: dir, yes: true }));

      assert.ok(logs.some((l) => l.includes("Migrating 2 file(s) from legacy layout .kilo")));
      assert.ok(logs.some((l) => l.includes("migrated .kilo/agent/docs-manager.md")));
      assert.equal(existsSync(join(dir, ".kilo/agent/docs-manager.md")), false);
      assert.equal(existsSync(join(dir, ".agents/agents/docs-manager.md")), true);

      const updated = await readConfig(dir);
      assert.ok(updated);
      assert.equal(updated.config.kiloConfigDir, ".agents");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
