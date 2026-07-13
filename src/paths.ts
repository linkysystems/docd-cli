import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function getPackageRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  return resolve(dirname(__filename), "..");
}

export function getTemplatesDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const isDist = /([\\/]|^)dist([\\/]|$)/.test(__filename);
  return isDist
    ? resolve(getPackageRoot(), "dist", "templates")
    : resolve(getPackageRoot(), "src", "templates");
}

export async function getPackageVersion(): Promise<string> {
  try {
    const pkgPath = resolve(getPackageRoot(), "package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8")) as { version: string };
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}
