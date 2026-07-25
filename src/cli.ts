import mri from "mri";
import { runChanges } from "./commands/changes.js";
import { runInit } from "./commands/init.js";
import { runStatus } from "./commands/status.js";
import { runUpdate } from "./commands/update.js";
import { getPackageVersion } from "./paths.js";
import pc from "picocolors";

export interface CLIOptions {
  cwd: string;
}

export async function run(argv: string[]): Promise<void> {
  const args = mri(argv, {
    alias: {
      h: "help",
      v: "version",
      i: "ide",
      d: "dry-run",
      f: "force",
      y: "yes",
      g: "global",
    },
    boolean: ["help", "version", "dry-run", "force", "yes", "global"],
    string: ["ide"],
    default: {
      cwd: process.cwd(),
    },
  });

  if (args.version) {
    console.log(await getPackageVersion());
    return;
  }

  const command = args._[0];

  if (args.help || !command) {
    printHelp();
    return;
  }

  const cwd = String(args.cwd);

  switch (command) {
    case "init":
      await runInit({ cwd, ide: args.ide, global: args.global ?? false });
      break;
    case "status":
      await runStatus({ cwd });
      break;
    case "changes":
      await runChanges({ cwd });
      break;
    case "update":
      await runUpdate({
        cwd,
        dryRun: args["dry-run"] ?? false,
        force: args.force ?? false,
        yes: args.yes ?? false,
        global: args.global === true ? true : undefined,
      });
      break;
    default:
      console.error(pc.red(`Unknown command: ${command}`));
      printHelp();
      process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
${pc.bold("docd")} — install and update DOCD (DOCs-Driven Development) in any project

Usage:
  docd init --ide kilo
  docd init --ide kilo,cursor
  docd init --global
  docd status
  docd changes
  docd update
  docd update --dry-run
  docd update --yes
  docd update --force

Options:
  --ide         Comma-separated IDE providers (default: kilo)
  --global      Install/update agents and skills in the global IDE config
                (e.g. ~/.config/kilo); .docd.json stays local
  --dry-run     Show changes without applying
  --yes         Apply all updates without prompting
  --force       Overwrite local changes without prompting
  --cwd         Working directory (default: current directory)
  -h, --help    Show this help
  -v, --version Show version
`);
}
