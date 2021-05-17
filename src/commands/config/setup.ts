import { Command, flags } from "@oclif/command";
import * as inquirer from "inquirer";

import { read, writeValue } from "../../core/config";

export default class Setup extends Command {
  static aliases = ["setup"];

  static description = "Setup the default values for a ToDD";

  static flags = {
    help: flags.help({ char: "h" }),
  };

  async run() {
    this.parse(Setup);

    const { configDir } = this.config;
    const configuration = await read(configDir);

    const questions = [
      {
        message: "Owner",
        name: "owner",
        type: "input",
        default: () => configuration.owner,
      },
      {
        message: "Repository",
        name: "repo",
        type: "input",
        default: () => configuration.repo,
      },
    ];

    const answers = await inquirer.prompt(questions);

    await writeValue(configDir, "owner", answers.owner);
    await writeValue(configDir, "repo", answers.repo);
  }
}
