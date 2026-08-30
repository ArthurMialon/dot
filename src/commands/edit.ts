import { join } from "node:path";
import { Command } from "commander";
import * as config from "../tools/config";
import * as packages from "../tools/packages";
import * as log from "../tools/logging";
import { bold, yellow } from "../tools/logging";
import { exec } from "../tools/process";
import { resolveSelection } from "./selection";

export interface EditOptions {
  profile?: string;
  all?: boolean;
}

export const runEdit = async (
  requestedPkg?: string,
  options: EditOptions = {},
): Promise<void> => {
  const configuration = await config.get();

  const editor = process.env.EDITOR;

  if (!editor) {
    log.error("Please, set the EDITOR environment variable.");
    log.info("Example with Vim: export EDITOR=vim");
    process.exit(1);
  }

  const { selection } = await resolveSelection(configuration, {
    profile: options.profile,
    all: options.all,
  });

  if (selection.profile) {
    log.info(
      `Editing ${bold(configuration.repo)} (profile: ${bold(selection.profile.name)}, ${selection.profile.packages.length} packages)`,
    );
  }

  let path = configuration.repo;

  if (requestedPkg) {
    const onDisk = await packages.listPackageNames(configuration.repo);

    if (!onDisk.includes(requestedPkg)) {
      log.error(
        `Package ${bold(requestedPkg)} does not exist in ${configuration.repo}.`,
      );
      log.info(`Available packages: ${onDisk.join(", ")}`);
      process.exit(1);
    }

    if (selection.names && !selection.names.includes(requestedPkg)) {
      log.info(
        yellow("⚠"),
        `Package ${bold(requestedPkg)} is not part of profile ${bold(selection.profile?.name ?? "")}.`,
      );
    }

    path = join(configuration.repo, requestedPkg);
  }

  // inherit stdio so terminal editors can take over the TTY
  await exec([editor, path]);
};

export const editCommand = new Command("edit")
  .description("Open the dotfiles in your editor.")
  .alias("open")
  .argument("[package]", "Open only this package")
  .option("-p, --profile <name>", "Use a specific profile for this run")
  .option("--all", "Ignore profile filtering", false)
  .action((pkg: string | undefined, options: EditOptions) =>
    runEdit(pkg, options),
  );

export default editCommand;
