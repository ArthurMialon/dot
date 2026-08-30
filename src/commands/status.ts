import { Command } from "commander";
import * as config from "../tools/config";
import * as log from "../tools/logging";
import { bold } from "../tools/logging";
import * as git from "../tools/git";

export interface StatusOptions {
  /** Exit the process when the repository is clean. */
  exitWhenClean?: boolean;
}

/** Returns whether the repository has uncommitted changes. */
export const runStatus = async (
  options: StatusOptions = {},
): Promise<boolean> => {
  const { exitWhenClean = true } = options;

  const { repo } = await config.get();

  log.info("Status of your dotfiles in:");
  log.info(bold(repo), "\n");

  const changes = await git.hasChange(repo);

  if (!changes) {
    log.info("No changes to commit");
    if (exitWhenClean) process.exit(0);
    return false;
  }

  await git.status(repo);

  return true;
};

export const statusCommand = new Command("status")
  .description("Check status of your dotfiles repository")
  .action(async () => {
    await runStatus();
  });

export default statusCommand;
