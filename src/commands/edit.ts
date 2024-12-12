import { Command } from "@cliffy/command";
import * as config from "../tools/config.ts";
import * as log from "../tools/logging.ts";

export default new Command()
  .description("Open the dotfiles in your editor.")
  .alias("open")
  .action(async () => {
    const configuration = await config.get();

    const editor = Deno.env.get("EDITOR");

    if (!editor) {
      log.error("Please, set the EDITOR environment variable.");
      log.info("Example with Vim: export EDITOR=vim");
      Deno.exit(1);
    }

    const command = new Deno.Command(editor, {
      args: [configuration.repo],
    });

    await command.output();
  });
