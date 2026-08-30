import { Command } from "commander";
import { configEditCommand } from "./edit";
import { showConfig } from "./show";

export const configCommand = new Command("config")
  .description("Manage the configuration")
  .action(showConfig)
  .addCommand(configEditCommand);

export default configCommand;
