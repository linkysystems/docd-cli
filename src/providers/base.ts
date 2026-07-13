export interface ProviderPaths {
  configDir: string;
  agentDir: string;
  skillDir: string;
  manifestFile: string;
  backupDir: string;
}

export interface Provider {
  name: string;
  configKey: string;
  configDir: string;
  getPaths(cwd: string): ProviderPaths;
  resolveInstalledPath(templateRelativePath: string): string;
  transformTemplate?(content: string): string;
}

export function getInstalledPath(provider: Provider, templateRelativePath: string): string {
  const parts = templateRelativePath.split("/");
  const [kind] = parts;

  if (kind === "agent") {
    return [provider.configDir, "agent", ...parts.slice(1)].join("/");
  }

  if (kind === "skill") {
    return [provider.configDir, "skills", ...parts.slice(1)].join("/");
  }

  if (kind === "docs") {
    return [provider.configDir, ...parts.slice(1)].join("/");
  }

  return [provider.configDir, ...parts].join("/");
}
