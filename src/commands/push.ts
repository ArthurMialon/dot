import { Command } from "commander";
import { confirm, input } from "../tools/prompt";
import * as config from "../tools/config";
import * as log from "../tools/logging";
import { bold, yellow } from "../tools/logging";
import * as git from "../tools/git";
import { runStatus } from "./status";
import { resolveBranch } from "./remote";

const toISODate = (date: Date): string => date.toISOString().split("T")[0];

export interface PushOptions {
  force?: boolean;
}

export const runPush = async (options: PushOptions = {}): Promise<void> => {
  const { force = false } = options;

  const configuration = await config.get();
  const { repo } = configuration;

  const changes = await runStatus({ exitWhenClean: false });

  if (!changes) {
    log.info("No changes to push");
    return;
  }

  const { branch, current, diverged } = await resolveBranch(configuration);

  if (!branch) {
    log.error("Cannot read current branch of repository", bold(repo));
    process.exit(1);
  }

  // Pushing the configured branch while HEAD is elsewhere succeeds without
  // carrying the work that was just committed, so never do it silently.
  if (diverged) {
    log.info(
      yellow("⚠"),
      `Configured branch is ${bold(branch)} but the repository is on ${bold(current)}.`,
    );
    log.info(`  Pushing ${bold(branch)} will not include your current work.`);

    if (!force) {
      const proceed = await confirm({
        message: "Continue?",
        default: false,
        hint: "Re-run with --force to push the configured branch anyway.",
      });

      if (!proceed) {
        log.info("Push aborted");
        return;
      }
    }
  }

  const prefix = "chore:";
  const suffix = `${toISODate(new Date())} from Dot CLI`;

  const info = await input({
    message: "Add information about changes (optional)",
    default: "",
  });

  const commitMessage = info
    ? `${prefix} ${info} - ${suffix}`
    : `${prefix} ${suffix}`;

  log.info("\nCommit message", bold(commitMessage));

  const confirmed = await confirm({
    message: "Do you want to commit and push the changes?",
    default: false,
    hint: "Push needs an interactive terminal to confirm the commit.",
  });

  if (!confirmed) {
    log.info("Commit aborted");
    return;
  }

  await git.add(repo);
  await git.commit(repo, commitMessage);
  await git.push(repo, branch);

  log.success("Dotfiles pushed to remote repository.");
};

export const pushCommand = new Command("push")
  .description("Publish new version of your dotfiles")
  .option("-f, --force", "Skip the branch divergence prompt", false)
  .action((options: PushOptions) => runPush(options));

export default pushCommand;
