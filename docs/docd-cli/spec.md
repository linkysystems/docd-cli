# docd CLI — Spec

## Architecture

TypeScript + ESM, Node.js >= 18. Entry point `src/index.ts` (built to `dist/index.js` with a Node shebang, exposed as the `docd` binary). Argument parsing with `mri` in `src/cli.ts`, which dispatches to one module per command in `src/commands/`. Shared concerns live in flat modules at `src/`: `config.ts`, `manifest.ts`, `paths.ts`, `diff.ts`, `backup.ts`. Provider abstraction in `src/providers/` (`base.ts` defines the `Provider` interface; `agents.ts` is a shared base class for IDEs that follow the `.agents/` convention; `kilo.ts` and `kimi.ts` are the concrete implementations, differing only in `name`/`configKey`). Bundled templates in `src/templates/{agent,skill}/` are the payload that gets installed into target projects.

Dependencies: `mri` (args), `prompts` (interactive prompts), `picocolors` (colors), `diff` (patches), `yaml` (frontmatter). Tests use `tsx --test` (`tests/*.test.ts`).

## CLI contract

Parsed in `src/cli.ts`:

- `init --ide <kilo|kimi[,...]> [--global]` — creates `.docd.json`, `docs/`, and installs templates per provider. No-ops if `.docd.json` already exists; skips template files that already exist.
- `status` — compares installed bundle version (`config.version` in `.docd.json`) with the package version, and reports per-provider files that are missing, outdated (frontmatter `version` mismatch), or locally modified (content diff).
- `changes` — walks `docs/` looking for `changes/` directories (skipping `archive/`), and lists change-plan `.md` files whose frontmatter `status` is not `completed`/`archived` (closed statuses are filtered from `allowedStatuses` in config).
- `update [--dry-run] [--yes] [--force] [--global]` — reconciles installed templates with the bundle (see flow below).
- `--cwd`, `-h/--help`, `-v/--version`.

## Key flows

### init (`src/commands/init.ts`)

1. Resolve ides (default `kilo`), build default config via `defaultConfig()` and record each provider's config dir (`kiloConfigDir`, `kimiConfigDir`).
2. Abort if `.docd.json` exists (message suggests `docd update`).
3. Write `.docd.json`, create `docs/` root.
4. Load the template manifest (`loadManifest`) and, per provider, create the agent and skill dirs and copy each template to its installed path (`provider.resolveInstalledPath`), applying `transformTemplate` when the provider defines one (none of the current providers does; fallback only ensures a trailing newline). Since `kilo` and `kimi` share the `.agents/` layout, installing both writes the same files once (the second provider skips existing files).

### update (`src/commands/update.ts`)

- Providers that resolve to the same config dir (e.g. `kilo` and `kimi`, both on `.agents/`) are processed once per `update`/`status` run; duplicate passes are skipped (`status` merges their names into a single section).
- Legacy layout migration (`src/migrate.ts`): when the config dir recorded in `.docd.json` (`config.config[provider.configKey]`) differs from the provider's current `configDir` and the provider declares `legacy` dirs (Kilo: `.kilo/agent`, `.kilo/skills`), installed files found at the legacy paths are moved into the new layout (skipped when the target already exists) and the recorded key is rewritten. `status` only warns; `update` migrates (`--dry-run` reports without writing).

For each provider and each manifest template:

- Missing installed file → install it (or report in `--dry-run`).
- Needs update when the template frontmatter `version` differs from the installed one **or** there is a meaningful content diff (`hasMeaningfulDiff` ignores newline style and leading/trailing whitespace).
- Before overwriting, a timestamped backup is copied to the provider backup dir (`.agents/.docd-backups/<timestamp>_<flattened-path>`).
- Without `--yes`/`--force`, an interactive prompt offers sobrescrever/manter/ver diff/abortar (diff rendered with `computeDiff`).
- On success, bumps `version` in `.docd.json` to the package version.

### Template versioning (`src/manifest.ts`)

Templates are `.md` files with YAML frontmatter (`name`, `version`, `description`). `parseFrontmatter`/`serializeFrontmatter` round-trip the frontmatter; the manifest walks `src/templates/` recursively (or `dist/templates/` when running from the built output — see `getTemplatesDir` in `src/paths.ts`).

### Provider path mapping (`src/providers/base.ts`)

`getInstalledPath` maps template relative paths to installed paths: `agent/*` → `<configDir>/<agentDirName>/*`, `skill/*` → `<configDir>/<skillDirName>/*` (subdirectory names are provider fields); anything else stays under `configDir`. Both current providers use the shared `.agents/` convention: project installs land in `.agents/agents/` and `.agents/skills/`; with `--global` they go to `~/.agents`, while `.docd.json` always stays in the project.

## Design decisions (inferred)

- **Provider-agnostic config**: `.docd.json` holds everything project-level (docs layout, ides, global flag); providers only control where agents/skills land.
- **Version + content dual check**: updates trigger on frontmatter version bump or real content change, so hand-edited templates are detected even without a version change.
- **Non-destructive updates**: backups are always created before overwrite; `--dry-run` never writes.
- **Optional doc files**: `specFile`, `guideFile`, and `uiFile` accept `null` to disable them (e.g. no-UI projects).

## Assumptions / not derivable from code

- The `cursor` IDE mentioned in older README examples has no provider implemented (`src/providers/index.ts` registers only Kilo and Kimi).
- Publishing/release process for `@linkysystems/docd` is not in the repo (only `prepublishOnly` build hook).
