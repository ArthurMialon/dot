#!/usr/bin/env bun
import { Command } from "commander";

import Dot from "./dot";
import { initCommand } from "./commands/init";
import { configCommand } from "./commands/config/index";
import { listCommand } from "./commands/list";
import { editCommand } from "./commands/edit";
import { linkCommand } from "./commands/link";
import { unlinkCommand } from "./commands/unlink";
import { upgradeCommand } from "./commands/upgrade";
import { addCommand } from "./commands/add";
import { statusCommand } from "./commands/status";
import { pullCommand } from "./commands/pull";
import { pushCommand } from "./commands/push";
import { remoteCommand } from "./commands/remote";
import { profileCommand } from "./commands/profile/index";
import { ManifestError } from "./tools/profiles";
import * as log from "./tools/logging";

const program = new Command()
  .name(Dot.bin)
  .description(Dot.description)
  .version(Dot.version, "-V, --version", "Show the version")
  .showHelpAfterError()
  .action(() => program.outputHelp());

program
  .addCommand(initCommand)
  .addCommand(configCommand)
  .addCommand(listCommand)
  .addCommand(editCommand)
  .addCommand(linkCommand)
  .addCommand(unlinkCommand)
  .addCommand(upgradeCommand)
  .addCommand(addCommand)
  .addCommand(statusCommand)
  .addCommand(pullCommand)
  .addCommand(pushCommand)
  .addCommand(remoteCommand)
  .addCommand(profileCommand);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  // dot.json problems are user-facing configuration errors, never stack traces.
  if (error instanceof ManifestError) {
    log.error(error.message);
    if (error.hint) log.info(error.hint);
    process.exit(1);
  }

  throw error;
}
