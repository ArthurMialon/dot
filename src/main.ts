import { Command } from "@cliffy/command";

import config from "./commands/config/index.ts";
import init from "./commands/init.ts";
import list from "./commands/list.ts";
import edit from "./commands/edit.ts";
import link from "./commands/link.ts";
import unlink from "./commands/unlink.ts";
import add from "./commands/add.ts";

import * as log from "./tools/logging.ts";

const command = new Command()
  .name("dot")
  .version("__VERSION__")
  .description("Easily manage your dotfiles.")
  .action((): void => log.info(command.getHelp()))
  .command("init", init)
  .command("config", config)
  .command("list", list)
  .command("edit", edit)
  .command("link", link)
  .command("unlink", unlink)
  .command("add", add);

await command.parse(Deno.args);
