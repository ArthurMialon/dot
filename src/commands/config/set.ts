import { Command, flags } from "@oclif/command";

import { writeValue } from "../../core/config";

export default class Set extends Command {
  static description = "Set a value inside the configuration";

  static flags = {
    help: flags.help({ char: "h" }),
  };

  static args = [
    {
      name: "key",
      description: "Key to be set in the configuration",
      required: true,
    },
    {
      name: "value",
      description: "Value to set in the configuration",
      required: true,
    },
  ];

  async run() {
    const {
      args: { key, value },
    } = this.parse(Set);

    await writeValue(this.config.configDir, key, value);

    this.log("Configuration updated");
  }
}
