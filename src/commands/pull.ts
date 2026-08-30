import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import * as config from "../tools/config";
import * as log from "../tools/logging";
import { bold } from "../tools/logging";
import * as git from "../tools/git";
import { runLink } from "./link";

export interface PullOptions {
  force?: boolean;
}

export const runPull = async (options: PullOptions = {}): Promise<void> => {
  const { force = false } = options;

  const { repo } = await config.get();

  const branch = await git.getCurrentBranch(repo);

  if (!branch) {
    log.error("Cannot read current branch of repository", bold(repo));
    process.exit(1);
  }

  const success = await git.pull(repo, branch);

  if (!success) {
    log.error("Cannot pull your repository in:", bold(repo));
    log.error("Please fix conflicts and/or rebase.");
    process.exit(1);
  }

  log.info("\n");

  const confirmed =
    force ||
    (await confirm({
      message: "Do you want to link new changes?",
      default: false,
    }));

  if (!confirmed) {
    log.info("Apply changes with `dot link` whenever you want.");
    return;
  }

  await runLink({ force });
};

export const pullCommand = new Command("pull")
  .description("Pull new version of your dotfiles")
  .option("-f, --force", "Force link after pull", false)
  .action((options: PullOptions) => runPull(options));

export default pullCommand;
