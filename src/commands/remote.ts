import { Command } from "commander";
import Table from "cli-table3";
import { groupAction } from "../tools/command";
import * as config from "../tools/config";
import * as git from "../tools/git";
import * as log from "../tools/logging";
import { bold, yellow } from "../tools/logging";

/**
 * The branch push/pull should act on: the configured one when set, otherwise
 * whatever is checked out (which is the behaviour that predates this setting).
 */
export const resolveBranch = async (
  configuration: config.DotConfig,
): Promise<{ branch: string; current: string; diverged: boolean }> => {
  const current = await git.getCurrentBranch(configuration.repo);
  const branch = configuration.branch ?? current;

  return { branch, current, diverged: branch !== current };
};

export const runRemoteShow = async (): Promise<void> => {
  const configuration = await config.get();

  const actual = await git.getRemoteUrl(configuration.repo);
  const current = await git.getCurrentBranch(configuration.repo);

  const table = new Table({ head: ["Key", "Value"], style: { head: [] } });

  table.push(
    ["Remote", configuration.remote ?? "–"],
    [
      "Branch",
      configuration.branch ??
        `– (uses current branch: ${current || "unknown"})`,
    ],
    ["Git origin", actual ?? "–"],
  );

  log.info(table.toString());

  if (configuration.remote && actual && configuration.remote !== actual) {
    log.info(
      yellow("⚠"),
      "The configured remote and the git origin differ.",
      `Run: dot remote set ${actual}`,
    );
  }

  if (!configuration.remote && actual) {
    log.info(
      yellow("⚠"),
      "No remote recorded yet.",
      `Run: dot remote set ${actual}`,
    );
  }
};

export interface RemoteSetOptions {
  branch?: string;
}

export const runRemoteSet = async (
  url: string,
  options: RemoteSetOptions = {},
): Promise<void> => {
  const configuration = await config.get();

  const updated = await git.setRemoteUrl(configuration.repo, url);

  if (!updated) {
    log.error("Cannot set the git remote on", bold(configuration.repo));
    process.exit(1);
  }

  await config.write({
    remote: url,
    ...(options.branch ? { branch: options.branch } : {}),
  });

  log.success("Remote set to", bold(url));

  if (options.branch) log.success("Branch set to", bold(options.branch));
};

export const runRemoteBranch = async (branch: string): Promise<void> => {
  const configuration = await config.get();

  if (!(await git.branchExists(configuration.repo, branch))) {
    log.error(
      `Branch ${bold(branch)} does not exist in ${configuration.repo}.`,
    );
    process.exit(1);
  }

  await config.write({ branch });

  log.success("Branch set to", bold(branch));
};

const remoteSetCommand = new Command("set")
  .description("Set the remote URL of your dotfiles repository")
  .argument("<url>", "Git remote URL")
  .option("-b, --branch <name>", "Branch to use for push and pull")
  .action((url: string, options: RemoteSetOptions) =>
    runRemoteSet(url, options),
  );

const remoteBranchCommand = new Command("branch")
  .description("Set the branch used by push and pull")
  .argument("<name>", "Branch name")
  .action((name: string) => runRemoteBranch(name));

export const remoteCommand = groupAction(
  new Command("remote")
    .description("Manage the remote of your dotfiles repository")
    .addCommand(remoteSetCommand)
    .addCommand(remoteBranchCommand),
  runRemoteShow,
);

export default remoteCommand;
