import { Command, flags } from "@oclif/command";

import { toFullPath } from "../../core/config";

export default class Locate extends Command {
  static description = "Get the location of the configuration file";

  static flags = {
    help: flags.help({ char: "h" }),
  };

  async run() {
    this.parse(Locate);
    const path = toFullPath(this.config.configDir);

    return this.log(path);
  }
}
