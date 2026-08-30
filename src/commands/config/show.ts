import Table from "cli-table3";
import { get } from "../../tools/config";
import * as log from "../../tools/logging";

export const showConfig = async (): Promise<void> => {
  const configuration = await get();

  const table = new Table({ head: ["Key", "Value"], style: { head: [] } });

  table.push(
    ["Config location", configuration.configPath],
    ["Dotfiles", configuration.repo],
    ["Target", configuration.target],
  );

  log.info(table.toString());
};
