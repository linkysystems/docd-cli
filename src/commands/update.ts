import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import pc from "picocolors";
import prompts from "prompts";
import { readConfig, writeConfig } from "../config.js";
import { getPackageVersion, getTemplatesDir } from "../paths.js";
import { loadManifest, parseFrontmatter, serializeFrontmatter } from "../manifest.js";
import { findProvider, parseIdeArgs } from "../providers/index.js";
import { computeDiff, hasMeaningfulDiff } from "../diff.js";
import { backupFile, ensureBackupDir } from "../backup.js";
import type { Provider } from "../providers/base.js";
import type { TemplateFile } from "../manifest.js";

export interface UpdateOptions {
  cwd: string;
  dryRun?: boolean;
  force?: boolean;
  yes?: boolean;
  global?: boolean;
}

export async function runUpdate(options: UpdateOptions): Promise<void> {
  const cwd = options.cwd;
  const config = await readConfig(cwd);
  if (!config) {
    console.log(pc.red("No .docd.json found. Run \"docd init\" first."));
    return;
  }

  const globalInstall = options.global ?? config.config.global ?? false;

  const bundleVersion = await getPackageVersion();
  if (config.version === bundleVersion && !options.dryRun) {
    console.log(pc.green(`Bundle is already at ${bundleVersion}.`));
  }

  const ides = parseIdeArgs(config.config.ides);
  const manifest = await loadManifest(getTemplatesDir());
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  let updatedCount = 0;
  let skippedCount = 0;
  let abortAll = false;

  for (const ide of ides) {
    const provider = findProvider(ide);
    if (!provider) {
      console.log(pc.red(`Unknown provider "${ide}"`));
      continue;
    }

    const paths = provider.getPaths(cwd, globalInstall);
    await ensureBackupDir(paths.backupDir);

    for (const template of manifest.files) {
      if (abortAll) {
        skippedCount++;
        continue;
      }

      const installedRelative = provider.resolveInstalledPath(template.relativePath, globalInstall);
      const installedAbsolute = resolve(cwd, installedRelative);

      if (!existsSync(installedAbsolute)) {
        if (options.dryRun) {
          console.log(pc.yellow(`[dry-run] would install ${installedRelative}`));
          continue;
        }
        await mkdir(resolve(installedAbsolute, ".."), { recursive: true });
        await writeFile(installedAbsolute, template.content, "utf-8");
        console.log(pc.green(`installed ${installedRelative}`));
        updatedCount++;
        continue;
      }

      const installedContent = await readFile(installedAbsolute, "utf-8");
      const installedParsed = parseFrontmatter(installedContent);
      const installedVersion = installedParsed
        ? String(installedParsed.frontmatter.version ?? "")
        : null;
      const templateVersion = template.version;

      const needsUpdate =
        (templateVersion && installedVersion !== templateVersion) ||
        hasMeaningfulDiff(installedContent, template.content);

      if (!needsUpdate) {
        console.log(pc.dim(`up to date ${installedRelative}`));
        continue;
      }

      const locallyModified = hasMeaningfulDiff(installedContent, template.content);

      if (options.dryRun) {
        console.log(pc.yellow(`[dry-run] would update ${installedRelative}`));
        if (locallyModified) {
          console.log(pc.cyan(`  local modifications detected`));
        }
        continue;
      }

      if (options.force) {
        await backupFile(installedAbsolute, paths.backupDir, timestamp);
        await writeFile(installedAbsolute, template.content, "utf-8");
        console.log(pc.green(`force-overwrote ${installedRelative}`));
        updatedCount++;
        continue;
      }

      if (options.yes) {
        await backupFile(installedAbsolute, paths.backupDir, timestamp);
        await writeFile(installedAbsolute, template.content, "utf-8");
        console.log(pc.green(`updated ${installedRelative}`));
        updatedCount++;
        continue;
      }

      const question = locallyModified
        ? `${installedRelative} has local modifications. Update?`
        : `${installedRelative} has a new template version. Update?`;

      const action = await promptUpdate(question, installedContent, template.content);

      if (action === "abort") {
        abortAll = true;
        skippedCount++;
        console.log(pc.red("Aborted update."));
        continue;
      }

      if (action === "skip") {
        skippedCount++;
        console.log(pc.yellow(`skipped ${installedRelative}`));
        continue;
      }

      if (action === "overwrite") {
        await backupFile(installedAbsolute, paths.backupDir, timestamp);
        await writeFile(installedAbsolute, template.content, "utf-8");
        console.log(pc.green(`updated ${installedRelative}`));
        updatedCount++;
      }
    }
  }

  if (!options.dryRun && updatedCount > 0) {
    config.version = bundleVersion;
    await writeConfig(cwd, config);
    console.log(pc.green(`\nUpdated .docd.json version to ${bundleVersion}.`));
  }

  console.log();
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

async function promptUpdate(question: string, installed: string, template: string): Promise<"overwrite" | "skip" | "abort"> {
  while (true) {
    const response = await prompts({
      type: "text",
      name: "action",
      message: `${question} [s]obrescrever, [m]anter, [v]er diff, [a]bortar`,
      initial: "s",
      validate: (value) =>
        ["s", "m", "v", "a", "sobrescrever", "manter", "ver diff", "abortar"].includes(String(value).toLowerCase()) ||
        "Use s, m, v ou a",
    });

    const action = String(response.action ?? "").toLowerCase().trim();
    if (action === "a" || action === "abortar") return "abort";
    if (action === "m" || action === "manter") return "skip";
    if (action === "s" || action === "sobrescrever") return "overwrite";
    if (action === "v" || action === "ver diff") {
      const { patch } = computeDiff(installed, template);
      console.log(pc.dim("--- diff start ---"));
      console.log(patch);
      console.log(pc.dim("--- diff end ---"));
    }
  }
}
