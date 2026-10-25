---
name: docs-implement
version: 1.5.0
description: Implement tasks from an approved change plan, detecting whether subagents are needed and routing each task to the right specialized agent via the roles.json registry.
---

# docs-implement

Implement the tasks defined in an approved change plan located in `docs/<feature-id>/<changesDir>/`. Detect whether subagents are needed, route each task to the right specialized agent using the installed `roles.json` registry, and execute independent tasks in parallel whenever that pays off.

## Input

- Feature ID and change ID (e.g., `/docs-implement products-store/ui-mobile-de-produtos-para-clientes`).
- The feature ID is the full path relative to the docs `root`, including all parent segments for nested features. Example: plan at `docs/social-media/posts/changes/2026-10-22-midias-em-posts-de-grupo-via-mcp-plan.md` → reference `social-media/posts/midias-em-posts-de-grupo-via-mcp`, never `posts/midias-em-posts-de-grupo-via-mcp`.

## Steps

1. **Load configuration**

   Read the `config.docs` object in `.docd.json` to resolve `root`, `specFile`, `guideFile`, `uiFile`, `changelogFile`, `changesDir`, `archiveDir`, and `allowedStatuses`. A `null` value for `specFile`, `guideFile`, or `uiFile` means the file is disabled: never create, read, update, or link to it.

2. **Read the plan**

   - Read `docs/<feature-id>/<guideFile>` for context (if enabled).
   - Read `docs/<feature-id>/<specFile>` for architecture and contracts (if enabled).
   - Read `docs/<feature-id>/<changesDir>/<date>-<change-id>-plan.md` for the task list.
   - If `<feature-id>` does not resolve to an existing directory, search for `<date>-<change-id>-plan.md` under the docs `root` to locate the nested feature path, and use the full path-derived ID from then on (e.g., `social-media/posts`, not `posts/midias...`).

3. **Confirm approval**

   - Ensure the plan status is `pending` or `in_progress`. If it is `completed` or `archived`, report that and stop.
   - If the plan was not explicitly approved by the user in a previous `/docs-plan` step, pause and ask for confirmation before proceeding.

4. **Detect subagent needs and route tasks**

   Do this before executing anything. Deterministic rules first; your own judgment is only a tie-breaker.

   a. **Capability check.** If the harness exposes no subagent/task mechanism, execute every task directly in this session, report "subagents unavailable — executing directly", and skip to step 7.

   b. **Load the routing registry.** Read `roles.json` installed next to the agents directory (project `.agents/roles.json`, or the global agents dir recorded in `.docd.json`). It defines, per role: `affectedAreas`, `filePatterns`, `keywords`, `priority`, `routedBy`, `scopeNote`; and under `selection`: `defaultRole`, `precedence`, `scores`, `minTasksForSubagents`, `minTasksForAlwaysDelegate`, `maxParallel`. If the registry is missing or invalid JSON, fall back to the role names listed in this skill and note the fallback in the report.

   c. **Collect signals per unchecked task** (`- [ ]`): the task text; the `affected_areas` metadata from the guide/plan; file paths mentioned in the task or in the related spec section; and an explicit agent mention (`@role`) if present.

   d. **Score each role** with the registry's `precedence` and `scores`:
      - `explicit` (`@role` in the task) — wins outright.
      - `affectedArea` exact match against the task's areas.
      - `filePattern` glob match against the mentioned paths.
      - `keyword` substring hits in the task text (case-insensitive, capped at `maxKeywordScore`).
      - Highest total wins; ties broken by the lower `priority` value; zero matches → `defaultRole`.
      - Never route to a role whose `routedBy` is not this orchestrator (`review-*` specialists are spawnable only by `review-lead`).

   e. **Compute the execution shape.** Tasks with disjoint file sets → parallel groups (capped at `maxParallel`). Tasks sharing files or with ordering dependencies (e.g., schema before endpoint before UI) → sequential chain handled by one agent.

   f. **Decide whether to use subagents at all.** Use them when ANY of:
      - at least `minTasksForSubagents` tasks are independent;
      - any task routed to a specialist role other than `defaultRole` (score ≥ 1);
      - the plan has at least `minTasksForAlwaysDelegate` tasks (context isolation beats coordination cost).
      
      Execute directly (no spawn) when: it is a single small task; all tasks share the same role and run sequentially; the user asked for direct execution; or the routed role agent does not exist in the harness — then execute respecting the role's `scopeNote`, warn, and suggest `npx docd update`.

   g. **Output the routing table** before launching anything:

      ```text
      | Task | Role | Match (explicit/area/pattern/keyword/default) | Mode (parallel-N / sequential) |
      ```

      This makes the decision auditable; the user can override any row before execution.

5. **Distribute tasks**

   - Follow the routing table: delegate each task to the routed role agent (`senior-developer`, `architect`, `designer`, `devops`, `qa-tester`, `data-engineer`, `tech-writer`) via the subagent/task mechanism, or execute directly when step 4f said so.
   - When delegating, pass:
     - The exact task description.
     - Relevant sections from the plan, spec, and ui docs (whichever are enabled) — only the slices the task needs, to keep subagent context small.
     - The affected area and file paths if known.
     - A clear instruction to mark the task as complete in the plan file after finishing.
   - If a delegated agent fails or returns an empty result, retry once; if it fails again, execute that task yourself and note it in the report.

6. **Execute in parallel**

   - Launch independent subagents/Agent Manager sessions in parallel (bounded by `maxParallel`) to reduce total time and avoid overloading a single agent's context.
   - Wait for all parallel tasks to finish before starting dependent ones.

7. **Mark tasks complete**

   - As each task finishes, update the plan file: `- [ ]` → `- [x]`.
   - Update `updated_at` and `status` (to `in_progress`) in the frontmatter while working.

8. **Finish**

   - If all tasks are complete, set `status` to `completed` and update `updated_at`.
   - Report progress and any files modified. If subagents were used, summarize which agent handled which task.
   - **Recommend running `@review-lead` on the diff before a PR**, and **`/docs-sync <feature-id>/<change-id>`** to finalize the plan and update the changelog and feature docs.

## Output

Report the current progress: "X/Y tasks complete", the routing decisions made (or the reason subagents were not used), and the list of completed/pending tasks.

## Guardrails

- Do not skip tasks.
- Always refer to the change by the full `<feature-id>/<change-id>` derived from the actual plan file path relative to the docs `root`, including parent feature segments.
- Do not implement a plan that was not explicitly approved.
- Do not invent role names: route only through roles declared in `roles.json` (or listed in this skill when the registry is unavailable).
- Never spawn `review-*` specialists directly; route review work to `review-lead`.
- If a task is unclear, pause and ask for clarification before implementing.
- If a task reveals a design issue, suggest updating the spec or change plan.
- Do not modify files outside the scope of the plan unless explicitly required by the task.
