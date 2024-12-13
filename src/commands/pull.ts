import * as log from "../tools/logging.ts";
import * as config from "../tools/config.ts";
import { Command } from "@cliffy/command";
import { bold } from "@std/fmt/colors";
import * as git from "../tools/git.ts";
import { Confirm } from "@cliffy/prompt";
import link from "./link.ts";

export default new Command()
  .description("Pull new version of your dotfiles")
  .option(
    "-f, --force",
    "Force link after pull",
    {
      default: false,
    },
  )
  .action(async ({ force }) => {
    const { repo } = await config.get();

    const branch = await git.getCurrentBranch(repo);

    if (!branch) {
      log.error("Cannot read current branch of repository", bold(repo));
      Deno.exit(1);
    }

    const success = await git.pull(repo, branch);

    if (!success) {
      log.error("Cannot pull your repository in:", bold(repo));
      log.error("Please fix conflicts and/or rebase.");
      Deno.exit(1);
    }

    log.info("\n");

    const confirm = force ? true : (await Confirm.prompt({
      message: `Do you want to link new changes?`,
    }));

    if (!confirm) {
      log.info("Apply changes with `dot link` whenever you want.");
      Deno.exit(0);
    }

    await link.parse(force ? ["-f"] : []);
  });
