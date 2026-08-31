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
import { groupAction } from "./tools/command";
import { ManifestError } from "./tools/profiles";
import * as log from "./tools/logging";
import { dim } from "./tools/logging";

const program = new Command()
  .name(Dot.bin)
  .description(Dot.description)
  .version(Dot.version, "-V, --version", "Show the version")
  .showHelpAfterError();

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

// Registered last so an unknown name is matched against every command above.
groupAction(program, () => program.outputHelp());

/**
 * Matched by name rather than instanceof: a second copy of @inquirer/core in the
 * dependency tree would silently break the instance check and bring the stack
 * trace back.
 */
const isPromptCancellation = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === "ExitPromptError" || error.name === "AbortPromptError");

try {
  await program.parseAsync(process.argv);
} catch (error) {
  // Ctrl+C at a prompt is a normal way to leave, not a crash.
  if (isPromptCancellation(error)) {
    log.info(dim("Aborted."));
    // 128 + SIGINT, so a cancelled run does not look like success to a script.
    process.exit(130);
  }

  // dot.json problems are user-facing configuration errors, never stack traces.
  if (error instanceof ManifestError) {
    log.error(error.message);
    if (error.hint) log.info(error.hint);
    process.exit(1);
  }

  throw error;
}
