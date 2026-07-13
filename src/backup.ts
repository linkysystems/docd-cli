import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

export function backupPath(providerBackupDir: string, installedPath: string, timestamp: string): string {
  const safePath = installedPath.replace(/\//g, "_").replace(/\\/g, "_");
  return `${providerBackupDir}/${timestamp}_${safePath}`;
}

export async function backupFile(installedPath: string, providerBackupDir: string, timestamp: string): Promise<string> {
  const target = backupPath(providerBackupDir, installedPath, timestamp);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(installedPath, target);
  return target;
}

export async function ensureBackupDir(providerBackupDir: string): Promise<void> {
  if (!existsSync(providerBackupDir)) {
    await mkdir(providerBackupDir, { recursive: true });
  }
}
