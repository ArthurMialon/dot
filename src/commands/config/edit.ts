import { Command } from "@cliffy/command";
import * as config from "../../tools/config.ts";
import * as log from "../../tools/logging.ts";
import configCommand from "./index.ts";
import configEditPrompt from "../../prompt/config-edit.ts";

const edit = new Command()
  .description("Edit your configuration")
  .action(async () => {
    const configuration = await config.get();

    const configPrompt = await configEditPrompt(configuration);

    await config.write(configPrompt);

    await configCommand.parse([]);

    log.success("Configuration edited");
  });

export default edit;
