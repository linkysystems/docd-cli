# `@linkysystems/docd` CLI

CLI to install and update **DOCD — DOCs-Driven Development**, a docs-first development methodology, in any project.

## Requirements

- Node.js >= 18

## Install

```bash
npm install -g @linkysystems/docd
```

## Usage

```bash
# Initialize DOCD in the current project
npx docd init --ide kilo

# Install agents/skills globally (~/.agents) instead of in the project;
# .docd.json stays local
npx docd init --ide kilo --global

# Install for multiple IDEs at once (kilo and kimi share the .agents layout)
npx docd init --ide kilo,kimi

# Check installed vs available versions
npx docd status

# List open change plans in the current project
npx docd changes

# Update all DOCD files (uses the global setting recorded in .docd.json)
npx docd update

# Preview changes without applying them
npx docd update --dry-run

# Apply all updates without prompting
npx docd update --yes

# Overwrite local changes without prompting (backups still created)
npx docd update --force
```

## What it installs

- `.docd.json` — local configuration (including the docs layout under `config.docs`) and bundle version.
  - `config.docs.specFile`, `guideFile`, and `uiFile` are optional:
    set any of them to `null` to disable that file (e.g. projects without UI).
- `docs/` — empty directory for feature documentation.
- Provider-specific files (for `kilo` and `kimi`, both under the shared `.agents/` convention):
  - `.agents/roles.json` — role routing registry used to detect subagent needs (see below).
  - `.agents/agents/docs-manager.md` — docs/ change-plan orchestrator (`mode: primary`).
  - `.agents/agents/` — role-based agents:

| Role | Kind | mode | Notes |
|---|---|---|---|
| `architect` | design | all | System/API/data-model design; delegates implementation to `senior-developer`. |
| `senior-developer` | implementation | all | Default executor for implementation tasks. |
| `designer` | design | all | UI/UX, design system, accessibility. |
| `devops` | infra | all | Infrastructure, CI/CD, deploys, observability. |
| `qa-tester` | testing | all | Test design/execution/coverage; writes only test code. |
| `data-engineer` | data | all | Schemas, migrations, queries, data integrity. |
| `tech-writer` | docs | all | Guides, specs, ADRs, changelogs (DOCD-aware). |
| `review-lead` | review | all (read-only) | Review coordinator; fans out to the 4 domain lenses + `review-tests`. |
| `review-backend` | review | subagent (hidden, read-only) | Spawned only by `review-lead`. |
| `review-frontend` | review | subagent (hidden, read-only) | Spawned only by `review-lead`. |
| `review-security` | review | subagent (hidden, read-only) | Spawned only by `review-lead`. |
| `review-devops` | review | subagent (hidden, read-only) | Spawned only by `review-lead`. |
| `review-tests` | review | subagent (hidden, read-only) | Verification lens; also debuggable via `@review-tests`. |

  - `.agents/skills/docs-plan/SKILL.md`
  - `.agents/skills/docs-implement/SKILL.md`
  - `.agents/skills/docs-sync/SKILL.md`
  - `.agents/skills/docs-generate-from-code/SKILL.md`

## Subagent detection & routing

`docs-implement` does not guess when delegating. It reads `.agents/roles.json`, scores every
unchecked plan task against each role using deterministic precedence — explicit `@role` mention →
`affected_areas` match → file-pattern glob match → keyword hits — with `senior-developer` as the
default role. It then decides **whether** subagents pay off (≥ 2 independent tasks, any specialist
routed, or ≥ 5 tasks total; otherwise it executes directly to avoid over-orchestration) and prints
an auditable routing table (`Task → Role → Match → parallel/sequential`) before spawning anything,
bounded by `maxParallel`. Missing role agents degrade gracefully: the task runs directly under that
role's `scopeNote` with a warning to run `npx docd update`.

Customize routing for your project by editing `.agents/roles.json` (areas, patterns, keywords,
thresholds); `docd update` shows a diff and asks before overwriting local changes.

Migration note: role names changed from the legacy global PT-BR agents —
`arquiteto` → `architect`, `programador-senior` → `senior-developer` (`designer` and `devops`
kept their names). Bundled agents are project-level and shadow same-name globals.

## Development

```bash
npm install
npm run build
npm run dev -- init --ide kilo
```

This repo dogfoods DOCD: the files under `.agents/` are installed copies of `src/templates/`.
After editing any template, run `npm run dev -- update --yes` to refresh them —
`tests/dogfood.test.ts` fails if they drift.

The project is built with TypeScript and ESM. The entry binary is `dist/index.js` with a Node shebang.

## Copying to a standalone repo

This package is initially developed in `tools/docd-cli/` of the current monorepo. To publish it as a standalone repository, copy the entire `tools/docd-cli/` folder contents to the root of the new repo and keep the structure flat.

## License

[MIT](LICENSE)
