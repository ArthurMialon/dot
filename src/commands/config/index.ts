import { Command, flags } from "@oclif/command";
import cli from "cli-ux";

import { read } from "../../core/config";

export default class Config extends Command {
  static description = "Manage the Configuration";

  static aliases = ["env"];

  static flags = {
    help: flags.help({ char: "h" }),
    ...cli.table.flags(),
  };

  async run() {
    const configuration = await read(this.config.configDir);

    const data = Object.entries(configuration);
    
    const columns = {
      key: {
        minWidth: 18,
        get: (row: [string, string]) => row[0],
      },
      value: {
        get: (row: [string, string]) => row[1],
      },
    };

    const options = {
      printLine: this.log,
      ...flags,
    };

    cli.table(data, columns, options);
  }
}
