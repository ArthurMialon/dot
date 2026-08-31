import { Command } from "commander";
import { groupAction } from "../../tools/command";
import { configEditCommand } from "./edit";
import { showConfig } from "./show";

export const configCommand = groupAction(
  new Command("config")
    .description("Manage the configuration")
    .addCommand(configEditCommand),
  showConfig,
);

export default configCommand;
