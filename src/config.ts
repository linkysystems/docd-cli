import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface DDDConfig {
  config: {
    ides: string[];
    docsDir: string;
    [key: string]: unknown;
  };
  version: string;
}

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

export function defaultConfig(version: string, ides: string[]): DDDConfig {
  return {
    config: {
      ides,
      docsDir: "docs",
    },
    version,
  };
}
