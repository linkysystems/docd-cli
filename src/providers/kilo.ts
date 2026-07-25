import { homedir } from "node:os";
import { resolve } from "node:path";
import { Provider, ProviderPaths, getInstalledPath } from "./base.js";

export class KiloProvider implements Provider {
  name = "kilo";
  configKey = "kiloConfigDir";
  configDir = ".kilo";
  globalConfigDir = resolve(homedir(), ".config", "kilo");

  getPaths(cwd: string, globalInstall = false): ProviderPaths {
    const base = globalInstall ? this.globalConfigDir : `${cwd}/${this.configDir}`;
    return {
      configDir: base,
      agentDir: `${base}/agent`,
      skillDir: `${base}/skills`,
      backupDir: `${base}/.dfd-backups`,
    };
  }

  resolveInstalledPath(templateRelativePath: string, globalInstall = false): string {
    return getInstalledPath(this, templateRelativePath, globalInstall);
  }
}
