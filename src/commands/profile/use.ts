import { Command } from "commander";
import * as config from "../../tools/config";
import * as packages from "../../tools/packages";
import * as log from "../../tools/logging";
import { bold, dim, yellow } from "../../tools/logging";
import { confirm } from "../../tools/prompt";
import { resolveProfile } from "../../tools/profiles";
import { unlinkPackages } from "../unlink";
import { requireManifest } from "./show";

export interface ProfileUseOptions {
  force?: boolean;
  dryRun?: boolean;
  unlink?: boolean;
}

export const runProfileUse = async (
  name: string,
  options: ProfileUseOptions = {},
): Promise<void> => {
  const { force = false, dryRun = false, unlink = true } = options;

  const configuration = await config.get();

  const manifest = await requireManifest(configuration.repo);
  const onDisk = await packages.listPackageNames(configuration.repo);

  // Throws ManifestError with a did-you-mean when the name is unknown.
  const next = resolveProfile(manifest, name, onDisk);

  const nextNames = new Set(next.packages);

  // Everything not in the new profile is stale, whatever the previous profile
  // was. This also covers a machine linked with --all, a profile deleted from
  // the manifest, and the very first switch when no profile was ever set.
  const stale = unlink ? onDisk.filter((pkg) => !nextNames.has(pkg)) : [];

  const previous = configuration.profile;
  const target = next.target ?? configuration.target;

  log.info(
    `Switching profile ${bold(previous ?? "none")} → ${bold(next.name)}`,
  );
  log.info(`  link    ${next.packages.join(", ") || "–"}`);
  log.info(`  unlink  ${stale.join(", ") || "–"}`);

  if (target !== configuration.target) {
    log.info(`  target  ${configuration.target} → ${bold(target)}`);
  }

  for (const missing of next.missing) {
    log.info(
      yellow("⚠"),
      `Profile "${next.name}" references package "${missing}", which does not exist (skipped).`,
    );
  }

  if (dryRun) {
    log.info(dim("\nDry run: nothing was changed."));
    return;
  }

  if (!force) {
    const confirmed = await confirm({
      message: `Switch to profile "${next.name}"?`,
      default: false,
      hint: "Re-run with --force to switch without asking.",
    });

    if (!confirmed) {
      log.info("Aborted.");
      return;
    }
  }

  if (stale.length) {
    const stalePackages = await packages.list(configuration.repo, {
      names: stale,
    });

    await unlinkPackages(configuration, stalePackages);
  }

  // Written after the unlink and before the link, so an interrupted run leaves
  // the config consistent with what was actually removed.
  await config.write({ profile: next.name, target });

  const updated = await config.get();

  for (const pkg of await packages.list(configuration.repo, {
    names: next.packages,
  })) {
    log.success(
      `Set ${pkg.files.length} file(s) from package ${bold(pkg.name)}`,
    );

    await packages.linkPackage(updated, pkg);
  }

  log.success(`\nProfile is now ${bold(next.name)}`);
};

export const profileUseCommand = new Command("use")
  .description("Switch to another profile, relinking your dotfiles")
  .argument("<name>", "Profile name")
  .option("-f, --force", "Switch without prompting", false)
  .option("--dry-run", "Show what would change and stop", false)
  .option("--no-unlink", "Keep links from the previous profile")
  .action((name: string, options: ProfileUseOptions) =>
    runProfileUse(name, options),
  );

export default profileUseCommand;
