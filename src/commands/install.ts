import { Command, flags } from "@oclif/command";
import { CLIError } from '@oclif/errors'
import * as inquirer from "inquirer";

import * as prompter from "../core/prompter";
import { Configuration, read, validateConfig } from "../core/config";

export default class Install extends Command {
  static aliases = ['i']

  static description = "describe the command here";

  static flags = {
    help: flags.help({ char: "h" }),
    yes: flags.boolean({ char: "y", description: "Skip prompt" }),
    repo: flags.string({ char: "r", description: "Repository to use" }),
    owner: flags.string({ char: "o", description: "Owner of the repository" }),
    target: flags.string({
      char: "t",
      description: "Target folder on the machine",
    }),
    install_script: flags.string({
      char: "s",
      description: "Install script path",
    }),
  };

  static args = [{ name: "file" }];

  async run() {
    const { args, flags } = this.parse(Install);
    const { configDir } = this.config;

    const configuration = await read(configDir);

    const configWithFlags: Configuration = {
      repo: flags.repo || configuration.repo,
      owner: flags.owner || configuration.owner,
      install_script: flags.install_script || configuration.install_script,
      target: flags.target || configuration.target,
    };

    const questions: inquirer.Question[] = [
      prompter.ownerPrompter(configWithFlags),
      prompter.repositoryPrompter(configWithFlags),
      prompter.installScriptPrompter(configWithFlags),
      prompter.targetPrompter(configWithFlags),
    ];

    const answers = flags.yes
      ? configWithFlags
      : await inquirer.prompt(questions);


    const errors = validateConfig(answers)

    if (errors) {
      const message = errors.join('\n')
      throw new CLIError(message)
    }

  this.log('configuration ok')    

    // Step 1: Check if the repository exist
    // Step 2: Check if the script
    // Step 3: Check if the repository have been clone under the target
    // Step 4: Be sure we are at the last commit
    // Step 5: Pull if necessary
    // Step 6: Run the install script
  }
}
