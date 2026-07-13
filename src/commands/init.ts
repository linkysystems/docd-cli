import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import pc from "picocolors";
import { defaultConfig, writeConfig } from "../config.js";
import { getPackageVersion, getTemplatesDir } from "../paths.js";
import { loadManifest, parseFrontmatter, serializeFrontmatter } from "../manifest.js";
import { findProvider, parseIdeArgs } from "../providers/index.js";
import type { Provider } from "../providers/base.js";

export interface InitOptions {
  ide: string | string[] | undefined;
  cwd: string;
}

export async function runInit(options: InitOptions): Promise<void> {
  const cwd = options.cwd;
  const ides = parseIdeArgs(options.ide);
  const bundleVersion = await getPackageVersion();

  const config = defaultConfig(bundleVersion, ides);
  for (const ide of ides) {
    const provider = findProvider(ide);
    if (!provider) {
      console.error(pc.red(`Provider "${ide}" not found.`));
      continue;
    }
    config.config[provider.configKey] = provider.configDir;
  }

  const configPath = resolve(cwd, ".dfd.json");
  if (existsSync(configPath)) {
    console.log(pc.yellow(`.dfd.json already exists. Run "dfd update" to refresh templates.`));
    return;
  }

  await writeConfig(cwd, config);
  console.log(pc.green(`Created .dfd.json (bundle ${bundleVersion})`));

  await mkdir(resolve(cwd, config.config.docsDir), { recursive: true });
  console.log(pc.green(`Created ${config.config.docsDir}/`));

  const manifest = await loadManifest(getTemplatesDir());

  for (const ide of ides) {
    const provider = findProvider(ide);
    if (!provider) continue;

    const paths = provider.getPaths(cwd);
    await mkdir(paths.configDir, { recursive: true });
    await mkdir(paths.agentDir, { recursive: true });
    await mkdir(paths.skillDir, { recursive: true });

    for (const template of manifest.files) {
      const installedRelative = provider.resolveInstalledPath(template.relativePath);
      const installedAbsolute = resolve(cwd, installedRelative);

      if (existsSync(installedAbsolute)) {
        console.log(pc.yellow(`  skipped ${installedRelative} (already exists)`));
        continue;
      }

      await mkdir(resolve(installedAbsolute, ".."), { recursive: true });
      const content = applyTransform(provider, template.content);
      await writeFile(installedAbsolute, content, "utf-8");
      console.log(pc.green(`  installed ${installedRelative}`));
    }
  }

  console.log(pc.green("\nDocs-First Development (DFD) initialized."));
}

function applyTransform(provider: Provider, content: string): string {
  if (provider.transformTemplate) {
    return provider.transformTemplate(content);
  }
  return ensureTrailingNewline(content);
}

function ensureTrailingNewline(content: string): string {
  if (content.endsWith("\n")) return content;
  return content + "\n";
}

export function bumpFrontmatterVersion(content: string, version: string): string {
  const parsed = parseFrontmatter(content);
  if (!parsed) return content;
  parsed.frontmatter.version = version;
  return serializeFrontmatter(parsed.frontmatter, parsed.body);
}
