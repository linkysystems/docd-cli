import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import pc from "picocolors";
import { readConfig } from "../config.js";
import { parseFrontmatter } from "../manifest.js";

export interface OpenChange {
  featurePath: string;
  fileName: string;
  title: string | null;
  status: string;
  priority: string | null;
}

export interface ChangesOptions {
  cwd: string;
}

const CLOSED_STATUSES = new Set(["completed", "archived"]);

async function* walkChangesDirs(
  dir: string,
  changesDirName: string,
  archiveDirName: string,
): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === archiveDirName) continue;
    const fullPath = join(dir, entry.name);
    if (entry.name === changesDirName) {
      yield fullPath;
    } else {
      yield* walkChangesDirs(fullPath, changesDirName, archiveDirName);
    }
  }
}

export async function collectOpenChanges(cwd: string): Promise<OpenChange[] | null> {
  const config = await readConfig(cwd);
  if (!config) return null;

  const docs = config.config.docs;
  const docsRoot = resolve(cwd, docs.root);
  if (!existsSync(docsRoot)) return [];

  const closed = new Set(
    docs.allowedStatuses.filter((s) => CLOSED_STATUSES.has(s)),
  );
  const open: OpenChange[] = [];

  for await (const changesDir of walkChangesDirs(docsRoot, docs.changesDir, docs.archiveDir)) {
    const featurePath = relative(cwd, resolve(changesDir, ".."));
    const entries = await readdir(changesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const content = await readFile(join(changesDir, entry.name), "utf-8");
      const parsed = parseFrontmatter(content);
      const status = parsed ? String(parsed.frontmatter.status ?? "unknown") : "unknown";
      if (closed.has(status)) continue;
      open.push({
        featurePath,
        fileName: entry.name,
        title: parsed?.frontmatter.title ? String(parsed.frontmatter.title) : null,
        status,
        priority: parsed?.frontmatter.priority ? String(parsed.frontmatter.priority) : null,
      });
    }
  }

  open.sort((a, b) => (a.featurePath + sep + a.fileName).localeCompare(b.featurePath + sep + b.fileName));
  return open;
}

function statusColor(status: string): (s: string) => string {
  switch (status) {
    case "in_progress":
      return pc.cyan;
    case "blocked":
      return pc.red;
    case "pending":
      return pc.yellow;
    default:
      return pc.dim;
  }
}

export async function runChanges(options: ChangesOptions): Promise<void> {
  const open = await collectOpenChanges(options.cwd);
  if (!open) {
    console.log(pc.red("No .docd.json found. Run \"docd init\" first."));
    return;
  }

  if (open.length === 0) {
    console.log(pc.green("No open changes found."));
    return;
  }

  console.log(pc.bold(`Open changes (${open.length})`));
  let currentFeature: string | null = null;
  for (const change of open) {
    if (change.featurePath !== currentFeature) {
      currentFeature = change.featurePath;
      console.log(`\n${pc.bold(currentFeature)}`);
    }
    console.log(`  ${change.fileName}`);
    const details = [
      change.title ? `title: ${change.title}` : null,
      `status: ${statusColor(change.status)(change.status)}`,
      change.priority ? `priority: ${change.priority}` : null,
    ].filter(Boolean);
    console.log(`    ${details.join("  ")}`);
  }
}
