# docd-cli — Changelog

| Date | Change | Description | Responsible |
|------|--------|-------------|-------------|
| 2026-07-25 | docs backfill | Initial feature documentation generated from code (`docs-generate-from-code`) | albertosouza |
| 2026-07-27 | .agents convention + kimi provider | Providers migrated to the shared `.agents/` layout (`.agents/agents/`, `.agents/skills/`, global `~/.agents`); added `kimi` provider; removed `dataModelsFile` support and the `data-models.md` doc | albertosouza |
| 2026-07-27 | review fixes | Legacy `.kilo`→`.agents` migration in `update` (warn-only in `status`), dedupe of providers sharing a config dir, package-lock bump to 1.1.0, dogfood drift test for `.agents/**` vs `src/templates/**` | albertosouza |
| 2026-10-23 | specialized subagent roles + routing | Bundle now installs 13 role-based agents (7 execution roles in English + `review-lead` with 5 hidden read-only specialists) and the `roles.json` routing registry; `docs-implement` 1.5.0 detects whether subagents are needed and routes each task deterministically (explicit → area → pattern → keyword) with an auditable routing table and graceful fallback; `docs-manager` 1.4.0 references the new role names; new `tests/agent-templates.test.ts` | albertosouza |
