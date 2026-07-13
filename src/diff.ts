import { createPatch } from "diff";

export interface DiffResult {
  changed: boolean;
  patch: string;
}

export function computeDiff(original: string, updated: string): DiffResult {
  const patch = createPatch("file", original, updated, "installed", "template", { context: 3 });
  const changed = original !== updated;
  return { changed, patch };
}

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function hasMeaningfulDiff(a: string, b: string): boolean {
  return normalizeNewlines(a).trim() !== normalizeNewlines(b).trim();
}
