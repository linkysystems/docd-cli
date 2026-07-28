import { mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import pc from "picocolors";
import type { Provider } from "./providers/base.js";
import type { Manifest } from "./manifest.js";

export function legacyInstalledPath(provider: Provider, templateRelativePath: string): string | null {
  const legacy = provider.legacy;
  if (!legacy) return null;
  const parts = templateRelativePath.split("/");
  const [kind] = parts;
  if (kind === "agent") {
    return [legacy.configDir, legacy.agentDirName, ...parts.slice(1)].join("/");
  }
  if (kind === "skill") {
    return [legacy.configDir, legacy.skillDirName, ...parts.slice(1)].join("/");
  }
  return null;
}

export function findLegacyFiles(provider: Provider, cwd: string, manifest: Manifest): string[] {
  const found: string[] = [];
  for (const template of manifest.files) {
    const legacyRel = legacyInstalledPath(provider, template.relativePath);
    if (legacyRel && existsSync(resolve(cwd, legacyRel))) {
      found.push(legacyRel);
    }
  }
  return found;
}

export async function migrateLegacyLayout(
  provider: Provider,
  cwd: string,
  manifest: Manifest,
  dryRun = false,
): Promise<number> {
  let migrated = 0;
  for (const template of manifest.files) {
    const legacyRel = legacyInstalledPath(provider, template.relativePath);
    if (!legacyRel) continue;
    const legacyAbs = resolve(cwd, legacyRel);
    if (!existsSync(legacyAbs)) continue;

    const newRel = provider.resolveInstalledPath(template.relativePath, false);
    const newAbs = resolve(cwd, newRel);
    if (existsSync(newAbs)) {
      console.log(pc.yellow(`  kept legacy ${legacyRel} (${newRel} already exists)`));
      continue;
    }

    if (dryRun) {
      console.log(pc.yellow(`[dry-run] would migrate ${legacyRel} -> ${newRel}`));
      continue;
    }

    await mkdir(dirname(newAbs), { recursive: true });
    await rename(legacyAbs, newAbs);
    migrated++;
    console.log(pc.green(`  migrated ${legacyRel} -> ${newRel}`));
  }
  return migrated;
}
