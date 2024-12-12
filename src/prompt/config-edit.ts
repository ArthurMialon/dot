import { exists } from "@std/fs";
import { Input } from "@cliffy/prompt";
import { DotConfig } from "../tools/config.ts";
import * as log from "../tools/logging.ts";

const validatePath = async (value: string) => {
  if (!(await exists(value))) {
    log.info("\nThis path does not exist");
    return false;
  }
  return true;
};

export default async (configuration: DotConfig) => {
  const targetLocationPrompt = await Input.prompt({
    message: "Target location for symlinks",
    default: configuration.target,
    validate: validatePath,
  });

  const targetLocation = await Deno.realPath(targetLocationPrompt);

  const dotfilesLocationPrompt = await Input.prompt({
    message: "Dotfiles repository location",
    default: configuration.repo,
    validate: validatePath,
  });

  const dotfilesLocation = await Deno.realPath(dotfilesLocationPrompt);

  return {
    target: targetLocation,
    repo: dotfilesLocation,
  };
};
