import { join } from "@std/path";
import { Command } from "@cliffy/command";
import { Table } from "@cliffy/table";
import * as config from "../tools/config.ts";
import * as packages from "../tools/packages.ts";

export default new Command()
  .description("List your packages")
  .option("-v, --verbose", "Display files too", {
    default: false,
  })
  .action(async ({ verbose }) => {
    const configuration = await config.get();

    const pkgs = await packages.list(configuration.repo);

    const table = new Table();
    const body: [string, string][] = [];

    table
      .border(true)
      .header(["Packages", verbose ? "Files" : "# Files"]);

    for await (const pkg of pkgs) {
      body.push([
        pkg.name,
        verbose
          ? pkg.files.map((file) => join(file.directory, file.name)).join(", ")
          : pkg.files.length.toString(),
      ]);
    }

    table.body(body);

    console.log(table.toString());
  });
