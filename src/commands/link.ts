import { join } from "@std/path";
import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import * as config from "../tools/config.ts";
import * as packages from "../tools/packages.ts";
import * as log from "../tools/logging.ts";
import { bold } from "@std/fmt/colors";

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
      log.info("No package to link");
      log.info(`Requested: ${bold(requestedPkg || "all")}`);
      return;
    }

    log.info(`Ready to apply ${bold(filteredPkgs.length + " package(s)")}`);
    log.info(
      `Packages: ${bold(filteredPkgs.map((pkg) => pkg.name).join(", "))}`,
    );

    if (!force) {
      const confirm = await Confirm.prompt({
        message: `Apply ${filteredPkgs.length} package(s)?`,
      });

      if (!confirm) return Deno.exit(0);
    }

    for await (const pkg of filteredPkgs) {
      log.success(
        `Set ${pkg.files.length} file(s) from package ${bold(pkg.name)}`,
      );

      if (verbose) {
        pkg.files.forEach((file) => {
          log.info(
            join(configuration.target, file.directory, file.name),
            "->",
            join(file.directory, file.name),
          );
        });
        log.info("");
      }

      await packages.linkPackage(configuration, pkg);
    }
  });
