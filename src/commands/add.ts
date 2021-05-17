import { exists } from "@std/fs";
import { dirname, join, relative } from "@std/path";
import { Command } from "@cliffy/command";
import { Confirm, Input } from "@cliffy/prompt";
import * as config from "../tools/config.ts";
import link from "./link.ts";
import { copyWithCP } from "../utils.ts";

export default new Command()
  .description("Add new files or folder to your dotfiles.")
  .alias("a")
  .option(
    "-f, --force",
    "Force apply to package without prompt",
    {
      default: false,
    },
  )
  .arguments("<path> [package]")
  .action(async ({ force }, path, requestedPkg) => {
    const configuration = await config.get();

    if (!(await exists(path))) {
      console.error(`The path ${path} does not exist.`);
      Deno.exit(1);
    }

    const requestedPath = await Deno.realPath(path);

    const pkgArg = await (requestedPkg || Input.prompt({
      message: "Enter the package name",
    }));

    if (!pkgArg) {
      console.error("You must provide a package name.");
      Deno.exit(1);
    }

    const pkg = pkgArg
      .trim()
      .replace("/", "-");

    const pkgPath = join(configuration.repo, pkg);

    console.log("About to copy all content from target to your dotfiles");
    console.log("Content:", requestedPath);
    console.log(
      "To:     ",
      join(pkgPath, relative(configuration.target, requestedPath)),
    );

    const confirm = force || (await Confirm.prompt({
      message: "Do you want to continue?",
    }));

    if (!confirm) {
      console.log("Aborted.");
      Deno.exit(0);
    }

    if (!(await exists(pkgPath))) {
      console.log("Create your package", pkg);
      await Deno.mkdir(pkgPath, { recursive: true });
    }

    const stat = await Deno.stat(requestedPath);

    // In case of file we need to ensure the folder exists
    if (stat.isFile) {
      const targetFolder = dirname(join(
        pkgPath,
        relative(configuration.target, requestedPath),
      ));

      if (!(await exists(targetFolder))) {
        await Deno.mkdir(targetFolder, { recursive: true });
      }
    }

    // Use `cp` to make sure we copy the content and not symlinks
    await copyWithCP(
      requestedPath,
      join(pkgPath, dirname(relative(configuration.target, requestedPath))),
    );

    await link.parse([
      pkg,
      "-f",
    ]);
  });
