import { blue, bold } from "@std/fmt/colors";
import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import list from "./list.ts";
import link from "./link.ts";
import configEditPrompt from "../prompt/config-edit.ts";
import * as config from "../tools/config.ts";
import * as log from "../tools/logging.ts";

export default new Command()
  .description("Initialize dot CLI with valid configuration.")
  .action(async () => {
    log.info(blue("👋 Welcome to Dot CLI."));
    log.info(
      "👉 Setup the location of your dotfiles repository and the target location.\n",
    );

    // Avoid throw if config not yet initialized
    const configuration = await config.get({ safe: true });

    const configPrompt = await configEditPrompt(configuration);

    await config.initialize({
      target: configPrompt.target,
      repo: configPrompt.repo,
      initialized: true,
    });

    log.success("\n💪 Dot CLI initialized successfully!");

    await list.parse([]);

    const confirm = await Confirm.prompt({
      message: "Do you want to link your dotfiles?",
    });

    if (!confirm) {
      log.info("If you want to link your dotfiles later, run: dot link");
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
