import { Command } from "@cliffy/command";

import Dot from "./dot.ts";
import config from "./commands/config/index.ts";
import init from "./commands/init.ts";
import list from "./commands/list.ts";
import edit from "./commands/edit.ts";
import link from "./commands/link.ts";
import unlink from "./commands/unlink.ts";
import add from "./commands/add.ts";
import upgrade from "./commands/upgrade.ts";
import status from "./commands/status.ts";
import push from "./commands/push.ts";
import pull from "./commands/pull.ts";
import * as log from "./tools/logging.ts";

const command = new Command()
  .name(Dot.bin)
  .version(Dot.version)
  .description(Dot.description)
  .action((): void => log.info(command.getHelp()))
  .command("init", init)
  .command("config", config)
  .command("list", list)
  .command("edit", edit)
  .command("link", link)
  .command("unlink", unlink)
  .command("upgrade", upgrade)
  .command("add", add)
  .command("status", status)
  .command("pull", pull)
  .command("push", push);

await command.parse(Deno.args);
