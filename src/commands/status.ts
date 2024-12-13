import * as log from "../tools/logging.ts";
import * as config from "../tools/config.ts";
import { Command } from "@cliffy/command";
import { bold } from "@std/fmt/colors";
import * as git from "../tools/git.ts";

export default new Command()
  .description("Check status of your dotfiles repository")
  .action(async () => {
    const { repo } = await config.get();

    log.info("Status of your dotfiles in:");
    log.info(bold(repo), "\n");

    const changes = await git.hasChange(repo);

    if (!changes) {
      log.info("No changes to commit");
      Deno.exit(0);
    }

    await git.status(repo);
  });
