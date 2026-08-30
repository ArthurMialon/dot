import { join } from "node:path";
import { Command } from "commander";
import * as config from "../tools/config";
import * as packages from "../tools/packages";
import * as log from "../tools/logging";
import { bold, yellow } from "../tools/logging";
import { confirm } from "../tools/prompt";
import { isInteractive } from "../tools/prompt";
import { addPackageToProfile, ManifestError } from "../tools/profiles";
import { resolveSelection } from "./selection";

export interface LinkOptions {
  package?: string;
  verbose?: boolean;
  force?: boolean;
  profile?: string;
  all?: boolean;
  /** Unlink packages that are not part of the selected profile. */
  prune?: boolean;
}

export const runLink = async (options: LinkOptions = {}): Promise<void> => {
  const {
    package: requestedPkg,
    verbose = false,
    force = false,
    profile,
    all = false,
    prune = false,
  } = options;

  const configuration = await config.get();

  const { selection, packages: selected } = await resolveSelection(
    configuration,
    { profile, all },
  );

  let toLink = selected;

  if (requestedPkg) {
    toLink = await narrowToPackage(
      configuration,
      selection.names,
      selection.profile?.name,
      requestedPkg,
      force,
    );
  }

  if (toLink.length === 0) {
    log.info("No package to link");
    log.info(`Requested: ${bold(requestedPkg || "all")}`);
    return;
  }

  if (selection.profile) {
    log.info(`Profile: ${bold(selection.profile.name)}`);
  }

  log.info(`Ready to apply ${bold(toLink.length + " package(s)")}`);
  log.info(`Packages: ${bold(toLink.map((pkg) => pkg.name).join(", "))}`);

  if (!force) {
    const confirmed = await confirm({
      message: `Apply ${toLink.length} package(s)?`,
      default: false,
      hint: "Re-run with --force to apply without asking.",
    });

    if (!confirmed) return;
  }

  if (prune) await pruneOutsideSelection(configuration, toLink);

  for (const pkg of toLink) {
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

  if (profile && !all) {
    log.info(
      yellow("Note:"),
      `this did not remove links from other profiles. To switch permanently: dot profile use ${profile}`,
    );
  }
};

/**
 * A named package can be absent, or present but outside the active profile.
 * Those are different problems and must not both read as "no package to link".
 */
const narrowToPackage = async (
  configuration: config.DotConfig,
  selectedNames: string[] | null,
  profileName: string | undefined,
  requestedPkg: string,
  force: boolean,
): Promise<packages.DotPackage[]> => {
  const onDisk = await packages.listPackageNames(configuration.repo);

  if (!onDisk.includes(requestedPkg)) {
    log.error(
      `Package ${bold(requestedPkg)} does not exist in ${configuration.repo}.`,
    );
    log.info(`Available packages: ${onDisk.join(", ")}`);
    process.exit(1);
  }

  const inSelection = !selectedNames || selectedNames.includes(requestedPkg);

  if (!inSelection && profileName) {
    if (force || !isInteractive()) {
      log.error(
        `Package ${bold(requestedPkg)} is not part of profile ${bold(profileName)}.`,
      );
      log.info(
        `Use --all to link it anyway, or: dot profile add ${requestedPkg} --profile ${profileName}`,
      );
      process.exit(1);
    }

    log.info(
      yellow("⚠"),
      `Package ${bold(requestedPkg)} exists but is not part of profile ${bold(profileName)}.`,
    );

    const anyway = await confirm({
      message: "Link it anyway?",
      default: false,
    });

    if (!anyway) return [];

    const record = await confirm({
      message: `Also add "${requestedPkg}" to profile "${profileName}" in dot.json?`,
      default: false,
    });

    if (record) {
      await addPackageToProfile(
        configuration.repo,
        requestedPkg,
        profileName,
      ).catch((error: unknown) => {
        if (error instanceof ManifestError) log.error(error.message);
        else throw error;
      });
    }
  }

  return packages.list(configuration.repo, { names: [requestedPkg] });
};

/** Remove managed links for packages outside the selection. */
const pruneOutsideSelection = async (
  configuration: config.DotConfig,
  keeping: packages.DotPackage[],
): Promise<void> => {
  const keep = new Set(keeping.map((pkg) => pkg.name));

  const stale = (await packages.listPackageNames(configuration.repo)).filter(
    (name) => !keep.has(name),
  );

  if (stale.length === 0) return;

  log.info(`Pruning links from ${bold(stale.join(", "))}`);

  for (const pkg of await packages.list(configuration.repo, { names: stale })) {
    const reports = await packages.unlinkPackage(configuration, pkg);
    const removed = reports.filter((r) => r.outcome === "removed").length;

    if (removed > 0) {
      log.success(`Unlinked ${removed} file(s) from ${bold(pkg.name)}`);
    }
  }
};

export const linkCommand = new Command("link")
  .description("Link your packages to target")
  .alias("l")
  .argument("[package]", "Only link this package")
  .option("-v, --verbose", "Display all linked packages", false)
  .option("-f, --force", "Force apply packages without prompt", false)
  .option("-p, --profile <name>", "Use a specific profile for this run")
  .option("--all", "Ignore profile filtering", false)
  .option("--prune", "Unlink packages outside the selection first", false)
  .action((pkg: string | undefined, options: LinkOptions) =>
    runLink({ ...options, package: pkg }),
  );

export default linkCommand;
