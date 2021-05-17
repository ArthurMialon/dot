import { join } from "@std/path";
import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import * as config from "../tools/config.ts";
import * as packages from "../tools/packages.ts";

export default new Command()
  .description("Link your packages to target")
  .alias("l")
  .option("-v, --verbose", "Display all linked packages", {
    default: false,
  })
  .option(
    "-f, --force",
    "Force apply packages without prompt",
    {
      default: false,
    },
  )
  .arguments("[package]")
  .action(async ({ verbose, force }, requestedPkg) => {
    const configuration = await config.get();

    const pkgs = await packages.list(configuration.repo);

    const filteredPkgs = pkgs
      .filter((pkg) => {
        if (!requestedPkg) return true;
        return pkg.name === requestedPkg;
      });

    if (filteredPkgs.length === 0) {
      console.log("No package to link");
      console.log(`Requested: ${requestedPkg || "all"}`);
      return;
    }

    console.log(`Ready to apply ${filteredPkgs.length} package(s)`);
    console.log(
      `Packages: ${filteredPkgs.map((pkg) => pkg.name).join(", ")}`,
    );

    if (!force) {
      const confirm = await Confirm.prompt({
        message: `Apply ${filteredPkgs.length} package(s)?`,
      });

      if (!confirm) return Deno.exit(0);
    }

    for await (const pkg of filteredPkgs) {
      console.log(`Set ${pkg.files.length} file(s) from package ${pkg.name}`);

      if (verbose) {
        pkg.files.forEach((file) => {
          console.log(
            join(configuration.target, file.directory, file.name),
            "->",
            join(file.directory, file.name),
          );
        });
        console.log("");
      }

      await packages.linkPackage(configuration, pkg);
    }
  });
