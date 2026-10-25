import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadManifest, parseFrontmatter } from "../src/manifest.js";
import { getTemplatesDir } from "../src/paths.js";
import { KiloProvider } from "../src/providers/kilo.js";

interface AgentFrontmatter {
  name?: unknown;
  version?: unknown;
  description?: unknown;
  mode?: unknown;
  hidden?: unknown;
  temperature?: unknown;
  permission?: { edit?: unknown; write?: unknown };
}

interface RoleEntry {
  name?: unknown;
  kind?: unknown;
  routedBy?: unknown;
  priority?: unknown;
  affectedAreas?: unknown;
  filePatterns?: unknown;
  keywords?: unknown;
  default?: unknown;
}

const ORCHESTRATORS = new Set(["docs-implement", "review-lead", "user"]);
const REVIEW_SPECIALISTS = [
  "review-backend",
  "review-frontend",
  "review-security",
  "review-devops",
  "review-tests",
];

async function loadAgentTemplates() {
  const manifest = await loadManifest(getTemplatesDir());
  return manifest.files.filter((f) => f.relativePath.startsWith("agent/"));
}

describe("agent templates frontmatter", () => {
  it("every agent template has valid identity frontmatter", async () => {
    const agents = await loadAgentTemplates();
    assert.ok(agents.length >= 14, `expected at least 14 agent templates, got ${agents.length}`);

    for (const agent of agents) {
      const parsed = parseFrontmatter(agent.content);
      assert.ok(parsed, `${agent.relativePath}: missing frontmatter`);
      const fm = parsed!.frontmatter as AgentFrontmatter;
      const fileName = agent.relativePath.split("/").pop()!.replace(/\.md$/, "");

      assert.equal(fm.name, fileName, `${agent.relativePath}: name must match file name`);
      assert.ok(fm.version, `${agent.relativePath}: missing version`);
      assert.ok(typeof fm.description === "string" && fm.description.length > 0, `${agent.relativePath}: missing description`);
      assert.ok(
        fm.mode === "all" || fm.mode === "subagent" || fm.mode === "primary",
        `${agent.relativePath}: invalid mode ${String(fm.mode)}`,
      );
    }
  });

  it("review specialists are hidden and read-only", async () => {
    const agents = await loadAgentTemplates();

    for (const name of REVIEW_SPECIALISTS) {
      const template = agents.find((a) => a.relativePath === `agent/${name}.md`);
      assert.ok(template, `missing template for ${name}`);
      const fm = parseFrontmatter(template!.content)!.frontmatter as AgentFrontmatter;

      assert.equal(fm.mode, "subagent", `${name}: must be spawn-only (mode: subagent)`);
      assert.equal(fm.hidden, true, `${name}: must be hidden`);
      assert.equal(fm.permission?.edit, "deny", `${name}: edit must be denied`);
      assert.equal(fm.permission?.write, "deny", `${name}: write must be denied`);
    }
  });

  it("review-lead coordinates without editing", async () => {
    const agents = await loadAgentTemplates();
    const template = agents.find((a) => a.relativePath === "agent/review-lead.md");
    assert.ok(template, "missing template for review-lead");
    const fm = parseFrontmatter(template!.content)!.frontmatter as AgentFrontmatter;

    assert.notEqual(fm.hidden, true, "review-lead must be visible");
    assert.equal(fm.permission?.edit, "deny", "review-lead must not edit");
    assert.equal(fm.permission?.write, "deny", "review-lead must not write");
  });
});

describe("roles.json routing registry", () => {
  it("installs at the provider config root, not inside agent/skill dirs", async () => {
    const provider = new KiloProvider();
    assert.equal(provider.resolveInstalledPath("roles.json", false), ".agents/roles.json");
  });

  it("is a valid registry consistent with the agent templates", async () => {
    const registryPath = resolve(getTemplatesDir(), "roles.json");
    const registry = JSON.parse(await readFile(registryPath, "utf-8")) as {
      version: unknown;
      selection: {
        defaultRole?: unknown;
        precedence?: unknown;
        scores?: Record<string, unknown>;
        minTasksForSubagents?: unknown;
        minTasksForAlwaysDelegate?: unknown;
        maxParallel?: unknown;
      };
      roles: RoleEntry[];
    };

    assert.ok(registry.version, "roles.json: missing version");
    assert.ok(Array.isArray(registry.roles) && registry.roles.length > 0, "roles.json: roles must be a non-empty array");

    const selection = registry.selection;
    assert.ok(selection, "roles.json: missing selection");
    const names = registry.roles.map((r) => r.name as string);
    assert.ok(names.includes(String(selection.defaultRole)), "defaultRole must exist in roles");

    assert.ok(
      Array.isArray(selection.precedence) &&
        JSON.stringify(selection.precedence) === JSON.stringify(["explicit", "affectedArea", "filePattern", "keyword"]),
      "precedence must keep the documented order",
    );
    for (const key of ["explicit", "affectedArea", "filePattern", "keyword"]) {
      assert.equal(typeof selection.scores?.[key], "number", `scores.${key} must be a number`);
    }
    assert.ok(Number(selection.minTasksForSubagents) >= 1, "minTasksForSubagents must be >= 1");
    assert.ok(Number(selection.minTasksForAlwaysDelegate) >= 1, "minTasksForAlwaysDelegate must be >= 1");
    assert.ok(Number(selection.maxParallel) >= 1, "maxParallel must be >= 1");

    for (const role of registry.roles) {
      assert.ok(role.name, "every role needs a name");
      assert.ok(ORCHESTRATORS.has(String(role.routedBy)), `${role.name}: invalid routedBy ${String(role.routedBy)}`);
      assert.equal(typeof role.priority, "number", `${role.name}: priority must be a number`);
      assert.ok(Array.isArray(role.affectedAreas), `${role.name}: affectedAreas must be an array`);
      assert.ok(Array.isArray(role.filePatterns), `${role.name}: filePatterns must be an array`);
      assert.ok(Array.isArray(role.keywords), `${role.name}: keywords must be an array`);
      assert.ok(typeof role.kind === "string" && role.kind.length > 0, `${role.name}: missing kind`);
    }

    const routedByOrchestrator = registry.roles.filter((r) => r.routedBy === "docs-implement");
    const defaults = routedByOrchestrator.filter((r) => r.default === true);
    assert.equal(defaults.length, 1, "exactly one docs-implement role may be the default");
    assert.equal(defaults[0].name, selection.defaultRole, "default flag must match selection.defaultRole");

    for (const specialist of REVIEW_SPECIALISTS) {
      const role = registry.roles.find((r) => r.name === specialist);
      assert.ok(role, `${specialist}: missing registry entry`);
      assert.equal(role!.routedBy, "review-lead", `${specialist}: must be routed only by review-lead`);
    }
  });

  it("registry roles and agent templates map 1:1 (routed roles only)", async () => {
    const registryPath = resolve(getTemplatesDir(), "roles.json");
    const registry = JSON.parse(await readFile(registryPath, "utf-8")) as { roles: RoleEntry[] };
    const agents = await loadAgentTemplates();
    const agentNames = new Set(
      agents.map((a) => a.relativePath.split("/").pop()!.replace(/\.md$/, "")),
    );

    for (const role of registry.roles) {
      assert.ok(
        agentNames.has(String(role.name)),
        `roles.json: role "${String(role.name)}" has no agent template`,
      );
    }

    const routedRoles = new Set(registry.roles.map((r) => String(r.name)));
    for (const name of agentNames) {
      if (name === "docs-manager") continue;
      assert.ok(routedRoles.has(name), `agent template "${name}" has no roles.json entry`);
    }
  });
});
