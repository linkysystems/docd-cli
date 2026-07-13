import mri from "mri";
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
    },
    boolean: ["help", "version", "dry-run", "force", "yes"],
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
      await runInit({ cwd, ide: args.ide });
      break;
    case "status":
      await runStatus({ cwd });
      break;
    case "update":
      await runUpdate({
        cwd,
        dryRun: args["dry-run"] ?? false,
        force: args.force ?? false,
        yes: args.yes ?? false,
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
${pc.bold("dfd")} — install and update the Docs-First Development (DFD) pattern

Usage:
  dfd init --ide kilo
  dfd init --ide kilo,cursor
  dfd status
  dfd update
  dfd update --dry-run
  dfd update --yes
  dfd update --force

Options:
  --ide         Comma-separated IDE providers (default: kilo)
  --dry-run     Show changes without applying
  --yes         Apply all updates without prompting
  --force       Overwrite local changes without prompting
  --cwd         Working directory (default: current directory)
  -h, --help    Show this help
  -v, --version Show version
`);
}
