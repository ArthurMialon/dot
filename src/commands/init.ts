import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import list from "./list.ts";
import link from "./link.ts";
import configEditPrompt from "../prompt/config-edit.ts";

import * as config from "../tools/config.ts";

export default new Command()
  .description("Initialize dot CLI with valid configuration.")
  .action(async () => {
    console.log("Welcome to Dot CLI.");
    console.log(
      "Setup the location of your dotfiles repository and the target location.",
    );

    // Avoid throw if config not yet initialized
    const configuration = await config.get({ safe: true });

    const configPrompt = await configEditPrompt(configuration);

    await config.initialize({
      target: configPrompt.target,
      repo: configPrompt.repo,
      initialized: true,
    });

    console.log("Dot CLI initialized.");

    await list.parse([]);

    const confirm = await Confirm.prompt({
      message: "Do you want to link your dotfiles?",
    });

    if (!confirm) {
      console.log("If you want to link your dotfiles later, run: dot link");
      Deno.exit(0);
    }

    await link.parse([
      "-f",
      "-v",
    ]);

    const configurationReady = await config.get();

    console.log(
      "Your Dofiles are now linked to your target",
      configurationReady.target,
    );
  });
