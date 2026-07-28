---
id: docd-cli
title: docd CLI
status: active
created_at: 2026-07-25
updated_at: 2026-07-27
owner: albertosouza
affected_areas:
  - src/cli.ts
  - src/commands/
  - src/providers/
  - src/templates/
  - src/config.ts
  - src/manifest.ts
tags:
  - cli
  - tooling
  - docd
---

# docd CLI

Command-line tool (`@linkysystems/docd`, binary `docd`) that installs and updates the **DOCD — DOCs-Driven Development** methodology in any project. It scaffolds the local configuration (`.docd.json`), the `docs/` directory, and agent/skill files for the supported providers (`kilo` and `kimi`), both installed under the shared `.agents/` convention (`.agents/agents/`, `.agents/skills/`).

## How to use

```bash
# Initialize DOCD in the current project (kilo, kimi, or both)
docd init --ide kilo,kimi

# Install agents/skills globally (~/.agents); .docd.json stays local
docd init --ide kilo --global

# Check installed vs available template versions
docd status

# List open change plans under docs/
docd changes

# Update installed templates to the current bundle
docd update [--dry-run] [--yes] [--force]
```

During development (this repo), run via tsx: `npm run dev -- <command>`.

## Goals

- One-command bootstrap of the docs-driven workflow in any repository.
- Keep installed agent/skill templates up to date with the published bundle, with backups and interactive diff review before overwriting local modifications.
- Stay provider-agnostic: project config lives in `.docd.json`; only agents/skills are provider-specific.

## Notes

- This documentation was backfilled from the code with `docs-generate-from-code`; see [spec.md](spec.md) for architecture details and [changelog.md](changelog.md) for the change history.
- This very repository is initialized with DOCD (dogfooding): its `.docd.json` disables `uiFile` because a CLI has no UI.
