import { Command } from "commander";
import * as config from "../tools/config";
import * as log from "../tools/logging";
import { exec } from "../tools/process";

export const runEdit = async (): Promise<void> => {
  const configuration = await config.get();

  const editor = process.env.EDITOR;

  if (!editor) {
    log.error("Please, set the EDITOR environment variable.");
    log.info("Example with Vim: export EDITOR=vim");
    process.exit(1);
  }

  // inherit stdio so terminal editors can take over the TTY
  await exec([editor, configuration.repo]);
};

export const editCommand = new Command("edit")
  .description("Open the dotfiles in your editor.")
  .alias("open")
  .action(runEdit);

export default editCommand;
