import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import YAML from "yaml";

export interface TemplateFile {
  sourcePath: string;
  relativePath: string;
  content: string;
  version: string | null;
  frontmatter: Record<string, unknown> | null;
}

export interface Manifest {
  files: TemplateFile[];
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } | null {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) return null;
  const frontmatter = YAML.parse(match[1]) as Record<string, unknown>;
  return { frontmatter, body: match[2] };
}

export function serializeFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
  const yaml = YAML.stringify(frontmatter, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n${body}`;
}

async function* walkDir(dir: string, baseDir: string): AsyncGenerator<TemplateFile> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath, baseDir);
    } else if (entry.isFile()) {
      const relativePath = relative(baseDir, fullPath);
      const content = await readFile(fullPath, "utf-8");
      const parsed = parseFrontmatter(content);
      yield {
        sourcePath: fullPath,
        relativePath,
        content,
        version: parsed ? String(parsed.frontmatter.version ?? "") : null,
        frontmatter: parsed ? parsed.frontmatter : null,
      };
    }
  }
}

export async function loadManifest(templatesDir: string): Promise<Manifest> {
  const files: TemplateFile[] = [];
  for await (const file of walkDir(templatesDir, templatesDir)) {
    files.push(file);
  }
  return { files };
}

export function findTemplateByInstalledPath(manifest: Manifest, installedPath: string): TemplateFile | undefined {
  return manifest.files.find((t) => t.relativePath === installedPath);
}
