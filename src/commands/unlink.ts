import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import * as config from "../tools/config";
import * as packages from "../tools/packages";
import * as log from "../tools/logging";
import { bold, yellow } from "../tools/logging";

export interface UnlinkOptions {
  package?: string;
  verbose?: boolean;
  force?: boolean;
}

export const runUnlink = async (options: UnlinkOptions = {}): Promise<void> => {
  const { package: requestedPkg, verbose = false, force = false } = options;

  const configuration = await config.get();

  const pkgs = await packages.list(configuration.repo).catch(() => []);

  const filteredPkgs = pkgs.filter(
    (pkg) => !requestedPkg || pkg.name === requestedPkg,
  );

  if (filteredPkgs.length === 0) {
    log.info("No package to unlink");
    log.info(`Requested: ${bold(requestedPkg || "all")}`);
    return;
  }

  log.info(`Ready to unlink ${filteredPkgs.length} package(s)`);
  log.info(`Packages: ${bold(filteredPkgs.map((pkg) => pkg.name).join(", "))}`);

  if (!force) {
    const confirmed = await confirm({
      message: `Unlink ${filteredPkgs.length} package(s)?`,
      default: false,
    });

    if (!confirmed) return;
  }

  for (const pkg of filteredPkgs) {
    const reports = await packages.unlinkPackage(configuration, pkg);

    const removed = reports.filter((r) => r.outcome === "removed");
    const skipped = reports.filter((r) => r.outcome.startsWith("skipped"));

    log.success(
      `Unlinked ${removed.length} file(s) from package ${bold(pkg.name)}`,
    );

    if (verbose) {
      for (const report of removed) {
        log.info("Unlinked", report.target);
      }
      log.info("");
    }

    // Never silently leave a file the user thinks was unlinked.
    for (const report of skipped) {
      log.info(
        yellow("Skipped"),
        report.target,
        report.outcome === "skipped-not-symlink"
          ? "(not a symlink)"
          : "(symlink points elsewhere)",
      );
    }
  }
};

export const unlinkCommand = new Command("unlink")
  .description("Unlink your packages from target")
  .aliases(["remove", "u"])
  .argument("[package]", "Only unlink this package")
  .option("-v, --verbose", "Display all unlinked packages", false)
  .option(
    "-f, --force",
    "Unlink all the packages directly without prompt",
    false,
  )
  .action((pkg: string | undefined, options: UnlinkOptions) =>
    runUnlink({ ...options, package: pkg }),
  );

export default unlinkCommand;
