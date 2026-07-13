import { Provider, ProviderPaths, getInstalledPath } from "./base.js";

export class KiloProvider implements Provider {
  name = "kilo";
  configKey = "kiloConfigDir";
  configDir = ".kilo";

  getPaths(cwd: string): ProviderPaths {
    return {
      configDir: `${cwd}/${this.configDir}`,
      agentDir: `${cwd}/${this.configDir}/agent`,
      skillDir: `${cwd}/${this.configDir}/skills`,
      manifestFile: `${cwd}/${this.configDir}/docs-manager.yaml`,
      backupDir: `${cwd}/${this.configDir}/.dfd-backups`,
    };
  }

  resolveInstalledPath(templateRelativePath: string): string {
    return getInstalledPath(this, templateRelativePath);
  }
}
