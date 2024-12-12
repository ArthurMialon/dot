import Dot from "../dot.ts";
import { blue, bold } from "@std/fmt/colors";
import { Command } from "@cliffy/command";
import { Confirm, Input } from "@cliffy/prompt";
import list from "./list.ts";
import link from "./link.ts";
import configEditPrompt from "../prompt/config-edit.ts";
import * as config from "../tools/config.ts";
import * as log from "../tools/logging.ts";
import * as git from "../tools/git.ts";

export default new Command()
  .description("Initialize dot CLI with valid configuration.")
  .arguments("[repository]")
  .action(async (_flags, remoteRepository) => {
    log.info(blue(`👋 Welcome to ${Dot.title}.`));
    log.info(
      "👉 Setup starts with location of your dotfiles repository and the target location.\n",
    );

    if (remoteRepository) {
      log.info("Remote repository", bold(remoteRepository));
      const confirmClone = await Confirm.prompt({
        message: `Clone it as your dotfiles repository?`,
      });

      if (!confirmClone) {
        log.info(`Aborted`);
        Deno.exit(0);
      }

      const cloned = await git.clone(remoteRepository, "dotfiles");

      if (!cloned) {
        log.error(`Failed to clone repository ${remoteRepository}`);
        Deno.exit(1);
      }
    }

    // Avoid throw if config not yet initialized
    const configuration = await config.get({ safe: true });

    configuration.repo = remoteRepository
      ? (await Deno.realPath("./dotfiles"))
      : configuration.repo;

    const configPrompt = await configEditPrompt(configuration);

    await config.initialize({
      target: configPrompt.target,
      repo: configPrompt.repo,
      initialized: true,
    });

    log.success(`\n💪 ${Dot.title} initialized successfully!`);

    await list.parse([]);

    const confirm = await Confirm.prompt({
      message: "Do you want to link your dotfiles?",
    });

    if (!confirm) {
      log.success(
        `Link your dotfiles later, with: ${Dot.bin} link`,
      );
      Deno.exit(0);
    }

    await link.parse([
      "-f",
    ]);

    const configurationReady = await config.get();

    log.success(
      "\nYour dotfiles are now linked to your target",
      bold(configurationReady.target),
    );
  });
