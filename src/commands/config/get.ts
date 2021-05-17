import { Command, flags } from "@oclif/command";

import { read } from "../../core/config";

export default class Get extends Command {
  static description = "Get a value from the configuration";

  static flags = {
    help: flags.help({ char: "h" }),
  };

  static args = [
    {
      name: "key",
      description: "Key from the configuration",
      required: true,
    },
  ];

  async run() {
    const {
      args: { key },
    } = this.parse(Get);

    const configuration = await read(this.config.configDir);
    const value = configuration[key];

    if (value === undefined) {
      return this.error(`The key ${key} doesn't exist`);
    }
  }
}
