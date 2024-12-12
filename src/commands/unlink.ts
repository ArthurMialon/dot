import { bold } from "@std/fmt/colors";
import { join } from "@std/path";
import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import * as config from "../tools/config.ts";
import * as packages from "../tools/packages.ts";
import * as log from "../tools/logging.ts";

export default new Command()
  .description("Unlink your packages from target")
  .alias("remove")
  .alias("u")
  .option("-v, --verbose", "Display all unlinked packages", {
    default: false,
  })
  .option("-f, --force", "Unlink all the pacakges directly without prompt", {
    default: false,
  })
  .arguments("[package]")
  .action(async ({ verbose, force }, requestedPkg) => {
    const configuration = await config.get();

    const pkgs = await packages.list(configuration.repo)
      .catch(() => [])

    const filteredPkgs = pkgs
      .filter((pkg) => {
        if (!requestedPkg) return true;
        return pkg.name === requestedPkg;
      });

    if (filteredPkgs.length === 0) {
      log.info("No package to unlink");
      log.info(`Requested: ${bold(requestedPkg || "all")}`);
      return;
    }

    log.info(`Ready to unlink ${filteredPkgs.length} package(s)`);
    log.info(
      `Packages: ${bold(filteredPkgs.map((pkg) => pkg.name).join(", "))}`,
    );

    if (!force) {
      const confirm = await Confirm.prompt({
        message: `Unlink ${filteredPkgs.length} package(s)?`,
      });

      if (!confirm) return Deno.exit(0);
    }

    for await (const pkg of filteredPkgs) {
      log.success(
        `Unlinked ${pkg.files.length} file(s) from package ${bold(pkg.name)}`,
      );

      if (verbose) {
        pkg.files.forEach((file) => {
          log.info(
            "Unlinked",
            join(configuration.target, file.directory, file.name),
            "->",
            join(file.directory, file.name),
          );
        });
        log.info("");
      }

      await packages.unlinkPackage(configuration, pkg);
    }
  });
