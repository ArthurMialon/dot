import { Command, flags } from "@oclif/command";
import * as open from "open";

import { read } from "../core/config";

export default class Open extends Command {
  static description = "Open your dotfiles repository";

  static flags = {
    help: flags.help({ char: "h" }),
  };

  async run() {
    this.parse(Open);
    const config = await read(this.config.configDir);

    await open(`https://github.com/${config.owner}/${config.repo}/`);
  }
}
