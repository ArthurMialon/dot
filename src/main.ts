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
  .addCommand(pushCommand);

await program.parseAsync(process.argv);
