# `@linkysystems/docd` CLI

CLI to install and update the Docs-First Development (DFD) pattern in any project.

## Requirements

- Node.js >= 18

## Install

```bash
npm install -g @linkysystems/docd
```

## Usage

```bash
# Initialize DFD in the current project
npx docd init --ide kilo

# Install for multiple IDEs at once
npx docd init --ide kilo,cursor

# Check installed vs available versions
npx docd status

# Update all DFD files
npx docd update

# Preview changes without applying them
npx docd update --dry-run

# Apply all updates without prompting
npx docd update --yes

# Overwrite local changes without prompting (backups still created)
px docd update --force
```

## What it installs

- `.dfd.json` — local configuration and bundle version.
- `docs/` — empty directory for feature documentation.
- Provider-specific files (for `kilo`):
  - `.kilo/agent/docs-manager.md`
  - `.kilo/skills/docs-plan/SKILL.md`
  - `.kilo/skills/docs-implement/SKILL.md`
  - `.kilo/skills/docs-sync/SKILL.md`
  - `.kilo/skills/docs-generate-from-code/SKILL.md`
  - `.kilo/docs-manager.yaml`

Role-based agents are **not** included in this package.

## Development

```bash
npm install
npm run build
npm run dev -- init --ide kilo
```

The project is built with TypeScript and ESM. The entry binary is `dist/index.js` with a Node shebang.

## Copying to a standalone repo

This package is initially developed in `tools/docd-cli/` of the current monorepo. To publish it as a standalone repository, copy the entire `tools/docd-cli/` folder contents to the root of the new repo and keep the structure flat.

## License

[MIT](LICENSE)
