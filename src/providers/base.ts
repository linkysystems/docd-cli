export interface ProviderPaths {
  configDir: string;
  agentDir: string;
  skillDir: string;
  backupDir: string;
}

export interface Provider {
  name: string;
  configKey: string;
  configDir: string;
  globalConfigDir?: string;
  getPaths(cwd: string, globalInstall?: boolean): ProviderPaths;
  resolveInstalledPath(templateRelativePath: string, globalInstall?: boolean): string;
  transformTemplate?(content: string): string;
}

export function getInstalledPath(
  provider: Provider,
  templateRelativePath: string,
  globalInstall = false,
): string {
  const parts = templateRelativePath.split("/");
  const [kind] = parts;

  // Agents and skills can live in the global config dir; project config
  // lives in .docd.json, which is provider-agnostic.
  const base =
    globalInstall && provider.globalConfigDir ? provider.globalConfigDir : provider.configDir;

  if (kind === "agent") {
    return [base, "agent", ...parts.slice(1)].join("/");
  }

  if (kind === "skill") {
    return [base, "skills", ...parts.slice(1)].join("/");
  }

  return [provider.configDir, ...parts].join("/");
}
