import { Command } from "commander";
import Dot from "../../dot";
import * as config from "../../tools/config";
import * as log from "../../tools/logging";
import { bold } from "../../tools/logging";
import { confirm, input, isInteractive } from "../../tools/prompt";
import {
  excludePackage,
  hasManifest,
  includePackage,
  initManifest,
} from "../../tools/profiles";
import { requireManifest } from "./show";

export interface ProfileMemberOptions {
  profile?: string;
}

/** The profile an add or remove applies to. */
export const resolveProfileName = (
  configuration: config.DotConfig,
  options: ProfileMemberOptions,
): string => {
  const name = options.profile ?? configuration.profile;

  if (!name) {
    log.error("No profile given and no active profile.");
    log.info(`Use --profile <name>, or: ${Dot.bin} profile use <name>`);
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

  const profile = resolveProfileName(configuration, options);

  await includePackage(configuration.repo, pkg, profile);

  log.success(`${bold(pkg)} is now part of ${bold(profile)}`);
};

export const runProfileRemove = async (
  pkg: string,
  options: ProfileMemberOptions = {},
): Promise<void> => {
  const configuration = await config.get();

  await requireManifest(configuration.repo);

  const profile = resolveProfileName(configuration, options);

  await excludePackage(configuration.repo, pkg, profile);

  log.success(`${bold(pkg)} is now kept out of ${bold(profile)}`);
};

export const runProfileInit = async (): Promise<void> => {
  const configuration = await config.get();

  if (await hasManifest(configuration.repo)) {
    log.error(
      `${Dot.manifestFileName} already exists in ${configuration.repo}.`,
    );
    process.exit(1);
  }

  log.info(
    `Creating ${bold(Dot.manifestFileName)}. Every profile starts by linking all your packages.`,
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

  await initManifest(configuration.repo, profiles);

  log.success(`Created ${bold(Dot.manifestFileName)}`);
  log.info(
    `Keep a package off a machine with: ${Dot.bin} profile remove <package> --profile <name>`,
  );
};

export const profileAddCommand = new Command("add")
  .description("Link a package on this profile again")
  .argument("<package>", "Package name")
  .option("-p, --profile <name>", "Profile to change")
  .action((pkg: string, options: ProfileMemberOptions) =>
    runProfileAdd(pkg, options),
  );

export const profileRemoveCommand = new Command("remove")
  .description("Keep a package out of a profile")
  .argument("<package>", "Package name")
  .option("-p, --profile <name>", "Profile to change")
  .action((pkg: string, options: ProfileMemberOptions) =>
    runProfileRemove(pkg, options),
  );

export const profileInitCommand = new Command("init")
  .description(`Create a ${Dot.manifestFileName}`)
  .action(runProfileInit);
