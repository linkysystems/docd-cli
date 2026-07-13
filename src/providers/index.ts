import { KiloProvider } from "./kilo.js";
import type { Provider } from "./base.js";

const providers = [new KiloProvider()];

export function listProviders(): Provider[] {
  return providers;
}

export function findProvider(name: string): Provider | undefined {
  return providers.find((p) => p.name === name);
}

export function parseIdeArgs(value: string | string[] | undefined): string[] {
  if (!value) return ["kilo"];
  if (Array.isArray(value)) return value.flatMap((v) => v.split(","));
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}
