import { join } from "node:path";
import { Command } from "commander";
import Table from "cli-table3";
import * as config from "../tools/config";
import * as packages from "../tools/packages";
import * as log from "../tools/logging";
import { bold } from "../tools/logging";

export interface ListOptions {
  verbose?: boolean;
}

export const runList = async (options: ListOptions = {}): Promise<void> => {
  const { verbose = false } = options;

  const configuration = await config.get();

  const pkgs = await packages.list(configuration.repo);

  const table = new Table({
    head: ["Packages", verbose ? "Files" : "# Files"],
    style: { head: [] },
  });

  for (const pkg of pkgs) {
    table.push([
      bold(pkg.name),
      verbose
        ? pkg.files.map((file) => join(file.directory, file.name)).join("\n")
        : String(pkg.files.length),
    ]);
  }

  log.info(table.toString());
};

export const listCommand = new Command("list")
  .description("List your packages")
  .option("-v, --verbose", "Display files too", false)
  .action((options: ListOptions) => runList(options));

export default listCommand;
