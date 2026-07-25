import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface DocsManagerConfig {
  root: string;
  specFile: string | null;
  guideFile: string | null;
  dataModelsFile: string | null;
  uiFile: string | null;
  changelogFile: string;
  changesDir: string;
  archiveDir: string;
  changeFilenamePattern: string;
  defaultStatus: string;
  allowedStatuses: string[];
}

export interface DDDConfig {
  config: {
    ides: string[];
    docs: DocsManagerConfig;
    global?: boolean;
    [key: string]: unknown;
  };
  version: string;
}

export const DEFAULT_DOCS_CONFIG: DocsManagerConfig = {
  root: "docs",
  specFile: "spec.md",
  guideFile: "guide.md",
  dataModelsFile: "data-models.md",
  uiFile: "ui.md",
  changelogFile: "changelog.md",
  changesDir: "changes",
  archiveDir: "archive",
  changeFilenamePattern: "{date}-{slug}-plan.md",
  defaultStatus: "pending",
  allowedStatuses: ["pending", "in_progress", "blocked", "completed", "archived"],
};

const CONFIG_FILE = ".docd.json";

export function getConfigPath(cwd: string): string {
  return resolve(cwd, CONFIG_FILE);
}

export async function readConfig(cwd: string): Promise<DDDConfig | null> {
  const path = getConfigPath(cwd);
  if (!existsSync(path)) {
    return null;
  }
  const content = await readFile(path, "utf-8");
  return JSON.parse(content) as DDDConfig;
}

export async function writeConfig(cwd: string, config: DDDConfig): Promise<void> {
  await writeFile(getConfigPath(cwd), JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function defaultConfig(version: string, ides: string[], globalInstall = false): DDDConfig {
  return {
    config: {
      ides,
      docs: { ...DEFAULT_DOCS_CONFIG },
      global: globalInstall,
    },
    version,
  };
}
