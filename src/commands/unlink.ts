import { Command } from "commander";
import * as config from "../tools/config";
import * as packages from "../tools/packages";
import * as log from "../tools/logging";
import { bold, yellow } from "../tools/logging";
import { confirm } from "../tools/prompt";
import { resolveSelection } from "./selection";

export interface UnlinkOptions {
  package?: string;
  verbose?: boolean;
  force?: boolean;
  profile?: string;
  all?: boolean;
}

export const unlinkPackages = async (
  configuration: config.DotConfig,
  pkgs: packages.DotPackage[],
  verbose = false,
): Promise<void> => {
  for (const pkg of pkgs) {
    const reports = await packages.unlinkPackage(configuration, pkg);

    const removed = reports.filter((r) => r.outcome === "removed");
    const skipped = reports.filter((r) => r.outcome.startsWith("skipped"));

    log.success(
      `Unlinked ${removed.length} file(s) from package ${bold(pkg.name)}`,
    );

    if (verbose) {
      for (const report of removed) log.info("Unlinked", report.target);
      log.info("");
    }

    // Never silently leave a file the user believes was unlinked.
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

export const runUnlink = async (options: UnlinkOptions = {}): Promise<void> => {
  const {
    package: requestedPkg,
    verbose = false,
    force = false,
    profile,
    all = false,
  } = options;

  const configuration = await config.get();

  const { selection, packages: selected } = await resolveSelection(
    configuration,
    { profile, all },
  ).catch(() => ({ selection: null, packages: [] as packages.DotPackage[] }));

  const filteredPkgs = requestedPkg
    ? selected.filter((pkg) => pkg.name === requestedPkg)
    : selected;

  if (filteredPkgs.length === 0) {
    log.info("No package to unlink");
    log.info(`Requested: ${bold(requestedPkg || "all")}`);
    return;
  }

  if (selection?.profile) log.info(`Profile: ${bold(selection.profile.name)}`);

  log.info(`Ready to unlink ${filteredPkgs.length} package(s)`);
  log.info(`Packages: ${bold(filteredPkgs.map((pkg) => pkg.name).join(", "))}`);

  if (!force) {
    const confirmed = await confirm({
      message: `Unlink ${filteredPkgs.length} package(s)?`,
      default: false,
      hint: "Re-run with --force to unlink without asking.",
    });

    if (!confirmed) return;
  }

  await unlinkPackages(configuration, filteredPkgs, verbose);
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
  .option("-p, --profile <name>", "Use a specific profile for this run")
  .option("--all", "Ignore profile filtering", false)
  .action((pkg: string | undefined, options: UnlinkOptions) =>
    runUnlink({ ...options, package: pkg }),
  );

export default unlinkCommand;
