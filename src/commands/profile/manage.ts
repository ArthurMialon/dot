import { Command } from "commander";
import Dot from "../../dot";
import * as config from "../../tools/config";
import * as packages from "../../tools/packages";
import * as log from "../../tools/logging";
import { bold } from "../../tools/logging";
import { confirm, input, isInteractive } from "../../tools/prompt";
import {
  COMMON_KEY,
  addPackageToProfile,
  hasManifest,
  initManifest,
  removePackageFromProfile,
} from "../../tools/profiles";
import { requireManifest } from "./show";

export interface ProfileMemberOptions {
  profile?: string;
  common?: boolean;
}

/** Which manifest bucket a package should be recorded in. */
export const resolveBucket = (
  configuration: config.DotConfig,
  options: ProfileMemberOptions,
): string => {
  if (options.common) return COMMON_KEY;

  const name = options.profile ?? configuration.profile;

  if (!name) {
    log.error("No profile given and no active profile.");
    log.info(
      `Use --profile <name>, or --common, or: ${Dot.bin} profile use <name>`,
    );
    process.exit(1);
  }

  return name;
};

export const runProfileAdd = async (
  pkg: string,
  options: ProfileMemberOptions = {},
): Promise<void> => {
  const configuration = await config.get();

  await requireManifest(configuration.repo);

  const bucket = resolveBucket(configuration, options);

  await addPackageToProfile(configuration.repo, pkg, bucket);

  log.success(`Added ${bold(pkg)} to ${bold(bucket)}`);
};

export const runProfileRemove = async (
  pkg: string,
  options: ProfileMemberOptions = {},
): Promise<void> => {
  const configuration = await config.get();

  await requireManifest(configuration.repo);

  const bucket = options.common
    ? COMMON_KEY
    : (options.profile ?? configuration.profile ?? undefined);

  await removePackageFromProfile(configuration.repo, pkg, bucket);

  log.success(`Removed ${bold(pkg)} from ${bold(bucket ?? "every profile")}`);
};

export const runProfileInit = async (): Promise<void> => {
  const configuration = await config.get();

  if (await hasManifest(configuration.repo)) {
    log.error(
      `${Dot.manifestFileName} already exists in ${configuration.repo}.`,
    );
    process.exit(1);
  }

  const onDisk = await packages.listPackageNames(configuration.repo);

  log.info(
    `Creating ${bold(Dot.manifestFileName)} with ${onDisk.length} package(s) in ${bold(COMMON_KEY)}.`,
  );

  const names = isInteractive()
    ? await input({
        message: "Profile names (comma separated)",
        default: "macbook, macmini, raspberrypi",
      })
    : "";

  const profiles = names
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (isInteractive()) {
    const confirmed = await confirm({
      message: `Create ${Dot.manifestFileName}?`,
      default: false,
    });

    if (!confirmed) {
      log.info("Aborted.");
      return;
    }
  }

  await initManifest(configuration.repo, onDisk, profiles);

  log.success(`Created ${bold(Dot.manifestFileName)}`);
  log.info(
    `Move packages into a profile with: ${Dot.bin} profile add <package> --profile <name>`,
  );
};

export const profileAddCommand = new Command("add")
  .description("Record a package in a profile")
  .argument("<package>", "Package name")
  .option("-p, --profile <name>", "Profile to add it to")
  .option("--common", "Add it to the common packages instead", false)
  .action((pkg: string, options: ProfileMemberOptions) =>
    runProfileAdd(pkg, options),
  );

export const profileRemoveCommand = new Command("remove")
  .description("Remove a package from a profile")
  .argument("<package>", "Package name")
  .option("-p, --profile <name>", "Profile to remove it from")
  .option("--common", "Remove it from the common packages", false)
  .action((pkg: string, options: ProfileMemberOptions) =>
    runProfileRemove(pkg, options),
  );

export const profileInitCommand = new Command("init")
  .description(`Create a ${Dot.manifestFileName} from the packages on disk`)
  .action(runProfileInit);
