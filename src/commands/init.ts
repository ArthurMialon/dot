import { realpath } from "node:fs/promises";
import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import Dot from "../dot";
import * as config from "../tools/config";
import * as log from "../tools/logging";
import { blue, bold } from "../tools/logging";
import * as git from "../tools/git";
import configEditPrompt from "../prompt/config-edit";
import { runList } from "./list";
import { runLink } from "./link";

export interface InitOptions {
  path?: string;
}

export const runInit = async (
  remoteRepository: string | undefined,
  options: InitOptions = {},
): Promise<void> => {
  log.info(blue(`👋 Welcome to ${Dot.title}.`));
  log.info(
    "👉 Setup starts with location of your dotfiles repository and the target location.\n",
  );

  // Avoid throwing if the config is not initialized yet
  const configuration = await config.get({ safe: true });

  if (remoteRepository) {
    const destination = options.path ?? Dot.defaultRepo;

    log.info("Remote repository", bold(remoteRepository));
    log.info("Cloning into", bold(destination));

    const confirmClone = await confirm({
      message: "Clone it as your dotfiles repository?",
      default: false,
    });

    if (!confirmClone) {
      log.info("Aborted");
      return;
    }

    const cloned = await git.clone(remoteRepository, destination);

    if (!cloned) {
      log.error(`Failed to clone repository ${remoteRepository}`);
      process.exit(1);
    }

    configuration.repo = await realpath(destination);
  }

  const configPrompt = await configEditPrompt(configuration);

  await config.initialize({
    target: configPrompt.target,
    repo: configPrompt.repo,
    initialized: true,
  });

  log.success(`\n💪 ${Dot.title} initialized successfully!`);

  await runList();

  const confirmed = await confirm({
    message: "Do you want to link your dotfiles?",
    default: false,
  });

  if (!confirmed) {
    log.success(`Link your dotfiles later, with: ${Dot.bin} link`);
    return;
  }

  await runLink({ force: true });

  const configurationReady = await config.get();

  log.success(
    "\nYour dotfiles are now linked to your target",
    bold(configurationReady.target),
  );
};

export const initCommand = new Command("init")
  .description(`Initialize ${Dot.title} with valid configuration.`)
  .argument("[repository]", "Remote repository to clone")
  .option("--path <dir>", `Clone destination (default: ${Dot.defaultRepo})`)
  .action((repository: string | undefined, options: InitOptions) =>
    runInit(repository, options),
  );

export default initCommand;
