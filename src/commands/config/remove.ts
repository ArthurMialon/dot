import { Command, flags } from "@oclif/command";

import { read, write } from "../../core/config";

export default class Remove extends Command {
  static description = "Remove a value from the configuration";

  static flags = {
    help: flags.help({ char: "h" }),
  };

  static args = [
    {
      name: "key",
      description: "Key to delete from the configuration",
      required: true,
    },
  ];

  async run() {
    const {
      args: { key },
    } = this.parse(Remove);

    const configuration = await read(this.config.configDir);

    const value = configuration[key];
    delete configuration[key];

    await write(this.config.configDir, configuration);

    this.log(
      `Key "${key}" deleted from the configuration the value was: "${value}"`
    );
  }
}
