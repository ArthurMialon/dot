import { mkdir, realpath, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { Command } from "commander";
import { confirm, input } from "../tools/prompt";
import * as config from "../tools/config";
import * as log from "../tools/logging";
import { bold } from "../tools/logging";
import { copyContents, exists } from "../tools/fs";
import { runLink } from "./link";

export interface AddOptions {
  force?: boolean;
}

export const runAdd = async (
  path: string,
  requestedPkg: string | undefined,
  options: AddOptions = {},
): Promise<void> => {
  const { force = false } = options;

  const configuration = await config.get();

  if (!(await exists(path))) {
    log.error(`The path ${path} does not exist.`);
    process.exit(1);
  }

  const requestedPath = await realpath(path);

  log.info(
    "Adding",
    bold(requestedPath),
    "to your dotfiles",
    requestedPkg ? `in ${bold(requestedPkg)}` : "",
  );

  const pkgArg =
    requestedPkg ?? (await input({ message: "Enter the package name" }));

  if (!pkgArg) {
    log.error("You must provide a package name.");
    process.exit(1);
  }

  const pkg = pkgArg.trim().replaceAll("/", "-");

  const pkgPath = join(configuration.repo, pkg);
  const target = join(pkgPath, relative(configuration.target, requestedPath));

  log.info("About to copy all content from target to your dotfiles");
  log.info("Content:", bold(requestedPath));
  log.info("To:     ", bold(target));

  const confirmed =
    force ||
    (await confirm({
      message: "Do you want to continue?",
      default: false,
      hint: "Re-run with --force to add without asking.",
    }));

  if (!confirmed) {
    log.info("Aborted.");
    return;
  }

  if (!(await exists(pkgPath))) {
    log.info("Creation of your package", bold(pkg));
    await mkdir(pkgPath, { recursive: true });
  }

  const stats = await stat(requestedPath);

  // In case of a file we need to ensure the folder exists
  if (stats.isFile()) {
    await mkdir(dirname(target), { recursive: true });
  }

  const copied = await copyContents(requestedPath, target);

  if (!copied) {
    log.error("Failed to copy", bold(requestedPath), "to", bold(target));
    process.exit(1);
  }

  await runLink({ package: pkg, force: true });
};

export const addCommand = new Command("add")
  .description("Add new files or folder to your dotfiles.")
  .alias("a")
  .argument("<path>", "File or folder to add")
  .argument("[package]", "Package it belongs to")
  .option("-f, --force", "Force apply to package without prompt", false)
  .action((path: string, pkg: string | undefined, options: AddOptions) =>
    runAdd(path, pkg, options),
  );

export default addCommand;
