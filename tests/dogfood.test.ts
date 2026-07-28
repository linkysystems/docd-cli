import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadManifest } from "../src/manifest.js";
import { getTemplatesDir } from "../src/paths.js";
import { KiloProvider } from "../src/providers/kilo.js";

describe("dogfooding", () => {
  it("installed .agents copies are in sync with src/templates", async () => {
    const cwd = process.cwd();
    const provider = new KiloProvider();
    const manifest = await loadManifest(getTemplatesDir());
    assert.ok(manifest.files.length > 0);

    const stale: string[] = [];
    for (const template of manifest.files) {
      const installedRelative = provider.resolveInstalledPath(template.relativePath, false);
      const installedAbsolute = resolve(cwd, installedRelative);
      if (!existsSync(installedAbsolute)) {
        stale.push(`${installedRelative} (missing)`);
        continue;
      }
      const installedContent = await readFile(installedAbsolute, "utf-8");
      if (installedContent.trimEnd() !== template.content.trimEnd()) {
        stale.push(`${installedRelative} (drifted)`);
      }
    }

    assert.deepEqual(
      stale,
      [],
      `Dogfooded .agents files are out of sync with src/templates; run "npm run dev -- update --yes":\n${stale.join("\n")}`,
    );
  });
});
