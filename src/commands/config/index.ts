import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import * as log from "../../tools/logging.ts";
import { get } from "../../tools/config.ts";
import edit from "./edit.ts";

const displayConfig = async () => {
  const configuration = await get();

  const table = new Table();

  table
    .border(true)
    .header(["Key", "Value"])
    .body([
      ["Config location", configuration.configPath],
      ["Dotfiles", configuration.repo],
      ["Target", configuration.target],
    ]);

  log.info(table.toString());
};

export default new Command()
  .description("Manage the configuration")
  .action(displayConfig)
  .command("edit", edit);
