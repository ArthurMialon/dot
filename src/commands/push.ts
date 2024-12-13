import * as log from "../tools/logging.ts";
import * as config from "../tools/config.ts";
import { Command } from "@cliffy/command";
import status from "./status.ts";
import { bold } from "@std/fmt/colors";
import * as git from "../tools/git.ts";
import { Confirm } from "@cliffy/prompt";

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default new Command()
  .description("Publish new version of your dotfiles")
  .action(async () => {
    const { repo } = await config.get();

    await status.parse([]);

    const changes = await git.hasChange(repo);

    if (!changes) {
      log.info("No changes to push");
      Deno.exit(0);
    }

    const branch = await git.getCurrentBranch(repo);

    if (!branch) {
      log.error("Cannot read current branch of repository", bold(repo));
      Deno.exit(1);
    }

    const date = toISODate(new Date());
    const commit = `chore: updated on ${date} from Dot CLI`;

    log.info("\nCommit message", bold(commit));

    const confirm = await Confirm.prompt({
      message: `Do you want to commit and push the changes?`,
    });

    if (!confirm) {
      log.info("Commit aborted");
      Deno.exit(0);
    }

    await git.commit(repo, commit);
    await git.push(repo, branch);

    log.success("Dotfiles pushed to remote repository.");
  });
