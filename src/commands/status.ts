import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import pc from "picocolors";
import { readConfig } from "../config.js";
import { getPackageVersion, getTemplatesDir } from "../paths.js";
import { loadManifest, parseFrontmatter } from "../manifest.js";
import { findProvider, parseIdeArgs } from "../providers/index.js";
import { hasMeaningfulDiff } from "../diff.js";

export interface StatusOptions {
  cwd: string;
}

export async function runStatus(options: StatusOptions): Promise<void> {
  const cwd = options.cwd;
  const config = await readConfig(cwd);
  if (!config) {
    console.log(pc.red("No .dfd.json found. Run \"docd init\" first."));
    return;
  }

  const bundleVersion = await getPackageVersion();
  const installedBundleVersion = config.version;

  console.log(pc.bold("Bundle version"));
  console.log(`  installed: ${installedBundleVersion}`);
  console.log(`  available: ${bundleVersion}`);
  console.log();

  const ides = parseIdeArgs(config.config.ides);
  const manifest = await loadManifest(getTemplatesDir());

  for (const ide of ides) {
    const provider = findProvider(ide);
    if (!provider) {
      console.log(pc.red(`Unknown provider "${ide}"`));
      continue;
    }

    console.log(pc.bold(`Provider: ${provider.name}`));
    const outdated: string[] = [];
    const modified: string[] = [];

    for (const template of manifest.files) {
      const installedRelative = provider.resolveInstalledPath(template.relativePath);
      const installedAbsolute = resolve(cwd, installedRelative);

      if (!existsSync(installedAbsolute)) {
        console.log(pc.yellow(`  missing: ${installedRelative}`));
        continue;
      }

      const installedContent = await readFile(installedAbsolute, "utf-8");
      const installedParsed = parseFrontmatter(installedContent);
      const installedVersion = installedParsed
        ? String(installedParsed.frontmatter.version ?? "")
        : null;
      const templateVersion = template.version;

      if (templateVersion && installedVersion !== templateVersion) {
        outdated.push(installedRelative);
      }

      if (hasMeaningfulDiff(installedContent, template.content)) {
        modified.push(installedRelative);
      }
    }

    if (outdated.length === 0 && modified.length === 0) {
      console.log(pc.green("  all files up to date"));
    } else {
      if (outdated.length) {
        console.log(pc.yellow("  outdated files:"));
        for (const f of outdated) console.log(`    - ${f}`);
      }
      if (modified.length) {
        console.log(pc.cyan("  locally modified files:"));
        for (const f of modified) console.log(`    - ${f}`);
      }
    }
    console.log();
  }
}
