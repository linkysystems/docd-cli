import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getInstalledPath, Provider } from "../src/providers/base.js";
import { listProviders, findProvider, parseIdeArgs } from "../src/providers/index.js";
import { KiloProvider } from "../src/providers/kilo.js";
import { KimiProvider } from "../src/providers/kimi.js";

function stubProvider(globalConfigDir?: string): Provider {
  return {
    name: "stub",
    configKey: "stubConfigDir",
    configDir: ".stub",
    agentDirName: "agent",
    skillDirName: "skills",
    globalConfigDir,
    getPaths: () => {
      throw new Error("not used in these tests");
    },
    resolveInstalledPath: () => {
      throw new Error("not used in these tests");
    },
  };
}

describe("providers registry", () => {
  it("lists kilo and kimi and finds them by name", () => {
    assert.ok(listProviders().some((p) => p.name === "kilo"));
    assert.ok(listProviders().some((p) => p.name === "kimi"));
    assert.equal(findProvider("kilo")?.name, "kilo");
    assert.equal(findProvider("kimi")?.name, "kimi");
  });

  it("returns undefined for unknown providers", () => {
    assert.equal(findProvider("nope"), undefined);
  });
});

describe("parseIdeArgs", () => {
  it("defaults to kilo when undefined", () => {
    assert.deepEqual(parseIdeArgs(undefined), ["kilo"]);
  });

  it("splits a comma-separated string and trims entries", () => {
    assert.deepEqual(parseIdeArgs("kilo, cursor ,,"), ["kilo", "cursor"]);
  });

  it("flattens arrays containing comma-separated values", () => {
    assert.deepEqual(parseIdeArgs(["kilo,cursor", "other"]), ["kilo", "cursor", "other"]);
  });
});

describe("getInstalledPath", () => {
  it("maps agent templates to the agent dir", () => {
    assert.equal(getInstalledPath(stubProvider(), "agent/docd.md"), ".stub/agent/docd.md");
  });

  it("maps skill templates to the skills dir", () => {
    assert.equal(getInstalledPath(stubProvider(), "skill/docd/SKILL.md"), ".stub/skills/docd/SKILL.md");
  });

  it("uses the global config dir for agents when global install is on", () => {
    assert.equal(
      getInstalledPath(stubProvider("/global/stub"), "agent/docd.md", true),
      "/global/stub/agent/docd.md",
    );
  });

  it("falls back to the local config dir when the provider has no global dir", () => {
    assert.equal(getInstalledPath(stubProvider(), "agent/docd.md", true), ".stub/agent/docd.md");
  });

  it("keeps other template kinds under the local config dir even for global installs", () => {
    assert.equal(
      getInstalledPath(stubProvider("/global/stub"), "docs/spec.md", true),
      ".stub/docs/spec.md",
    );
  });
});

describe("KiloProvider.getPaths", () => {
  it("builds local paths under the shared .agents dir", () => {
    const paths = new KiloProvider().getPaths("/proj");
    assert.deepEqual(paths, {
      configDir: "/proj/.agents",
      agentDir: "/proj/.agents/agents",
      skillDir: "/proj/.agents/skills",
      backupDir: "/proj/.agents/.docd-backups",
    });
  });

  it("builds global paths under ~/.agents", () => {
    const paths = new KiloProvider().getPaths("/proj", true);
    assert.ok(paths.configDir.endsWith(".agents"));
    assert.ok(paths.agentDir.endsWith(".agents/agents"));
    assert.ok(paths.backupDir.endsWith(".agents/.docd-backups"));
  });

  it("maps agent templates to the agents dir", () => {
    assert.equal(
      new KiloProvider().resolveInstalledPath("agent/docs-manager.md"),
      ".agents/agents/docs-manager.md",
    );
  });
});

describe("KimiProvider.getPaths", () => {
  it("shares the same .agents layout as kilo", () => {
    const kimi = new KimiProvider().getPaths("/proj");
    const kilo = new KiloProvider().getPaths("/proj");
    assert.deepEqual(kimi, kilo);
  });

  it("has its own config key", () => {
    assert.equal(new KimiProvider().configKey, "kimiConfigDir");
  });
});
