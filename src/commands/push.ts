import { Command } from "commander";
import { confirm, input } from "@inquirer/prompts";
import * as config from "../tools/config";
import * as log from "../tools/logging";
import { bold } from "../tools/logging";
import * as git from "../tools/git";
import { runStatus } from "./status";

const toISODate = (date: Date): string => date.toISOString().split("T")[0];

export const runPush = async (): Promise<void> => {
  const { repo } = await config.get();

  const changes = await runStatus({ exitWhenClean: false });

  if (!changes) {
    log.info("No changes to push");
    return;
  }

  const branch = await git.getCurrentBranch(repo);

  if (!branch) {
    log.error("Cannot read current branch of repository", bold(repo));
    process.exit(1);
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
  .action(runPush);

export default pushCommand;
