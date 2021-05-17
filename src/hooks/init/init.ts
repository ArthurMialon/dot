import { Hook } from "@oclif/config";
import * as fs from "fs";

import * as configModule from "../../core/config";

const hook: Hook<"init"> = async function (opts) {
  const folder = opts.config.configDir;

  // Create the folder to store the CLI configuration
  await fs.promises.mkdir(folder, { recursive: true });

  const files = await fs.promises.readdir(folder);

  // Check if the config already exist
  const exist = files.includes(configModule.CONFIG_FILE_NAME);

  if (!exist) {
    // Create the default config file
    await configModule.init(folder);

    this.log("Configuration file initialized.");
  }
};

export default hook;
