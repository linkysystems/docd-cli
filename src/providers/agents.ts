import { homedir } from "node:os";
import { resolve } from "node:path";
import { Provider, ProviderPaths, getInstalledPath } from "./base.js";

export abstract class AgentsProvider implements Provider {
  abstract name: string;
  abstract configKey: string;
  configDir = ".agents";
  agentDirName = "agents";
  skillDirName = "skills";
  globalConfigDir = resolve(homedir(), ".agents");

  getPaths(cwd: string, globalInstall = false): ProviderPaths {
    const base = globalInstall ? this.globalConfigDir : `${cwd}/${this.configDir}`;
    return {
      configDir: base,
      agentDir: `${base}/${this.agentDirName}`,
      skillDir: `${base}/${this.skillDirName}`,
      backupDir: `${base}/.docd-backups`,
    };
  }

  resolveInstalledPath(templateRelativePath: string, globalInstall = false): string {
    return getInstalledPath(this, templateRelativePath, globalInstall);
  }
}
