# docd-cli — Changelog

| Date | Change | Description | Responsible |
|------|--------|-------------|-------------|
| 2026-07-25 | docs backfill | Initial feature documentation generated from code (`docs-generate-from-code`) | albertosouza |
| 2026-07-27 | .agents convention + kimi provider | Providers migrated to the shared `.agents/` layout (`.agents/agents/`, `.agents/skills/`, global `~/.agents`); added `kimi` provider; removed `dataModelsFile` support and the `data-models.md` doc | albertosouza |
| 2026-07-27 | review fixes | Legacy `.kilo`→`.agents` migration in `update` (warn-only in `status`), dedupe of providers sharing a config dir, package-lock bump to 1.1.0, dogfood drift test for `.agents/**` vs `src/templates/**` | albertosouza |
