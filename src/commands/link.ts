import { join } from "node:path";
import { Command } from "commander";
import { confirm } from "../tools/prompt";
import * as config from "../tools/config";
import * as packages from "../tools/packages";
import * as log from "../tools/logging";
import { bold } from "../tools/logging";

export interface LinkOptions {
  package?: string;
  verbose?: boolean;
  force?: boolean;
}

export const runLink = async (options: LinkOptions = {}): Promise<void> => {
  const { package: requestedPkg, verbose = false, force = false } = options;

  const configuration = await config.get();

  const pkgs = await packages.list(configuration.repo);

  const filteredPkgs = pkgs.filter(
    (pkg) => !requestedPkg || pkg.name === requestedPkg,
  );

  if (filteredPkgs.length === 0) {
    log.info("No package to link");
    log.info(`Requested: ${bold(requestedPkg || "all")}`);
    return;
  }

  log.info(`Ready to apply ${bold(filteredPkgs.length + " package(s)")}`);
  log.info(`Packages: ${bold(filteredPkgs.map((pkg) => pkg.name).join(", "))}`);

  if (!force) {
    const confirmed = await confirm({
      message: `Apply ${filteredPkgs.length} package(s)?`,
      default: false,
      hint: "Re-run with --force to apply without asking.",
    });

    if (!confirmed) return;
  }

  for (const pkg of filteredPkgs) {
    log.success(
      `Set ${pkg.files.length} file(s) from package ${bold(pkg.name)}`,
    );

    if (verbose) {
      for (const file of pkg.files) {
        log.info(
          packages.targetPathFor(configuration.target, file),
          "->",
          join(file.directory, file.name),
        );
      }
      log.info("");
    }

    await packages.linkPackage(configuration, pkg);
  }
};

export const linkCommand = new Command("link")
  .description("Link your packages to target")
  .alias("l")
  .argument("[package]", "Only link this package")
  .option("-v, --verbose", "Display all linked packages", false)
  .option("-f, --force", "Force apply packages without prompt", false)
  .action((pkg: string | undefined, options: LinkOptions) =>
    runLink({ ...options, package: pkg }),
  );

export default linkCommand;
