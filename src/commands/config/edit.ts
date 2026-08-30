import { Command } from "commander";
import * as config from "../../tools/config";
import * as log from "../../tools/logging";
import configEditPrompt from "../../prompt/config-edit";
import { showConfig } from "./show";

export const runConfigEdit = async (): Promise<void> => {
  const configuration = await config.get();

  const configPrompt = await configEditPrompt(configuration);

  await config.write(configPrompt);

  await showConfig();

  log.success("Configuration edited");
};

export const configEditCommand = new Command("edit")
  .description("Edit your configuration")
  .action(runConfigEdit);

export default configEditCommand;
