import { realpath } from "node:fs/promises";
import { input } from "@inquirer/prompts";
import type { DotConfig } from "../tools/config";
import { exists } from "../tools/fs";

const validatePath = async (value: string) =>
  (await exists(value)) || "This path does not exist";

export default async (configuration: DotConfig) => {
  const targetLocationPrompt = await input({
    message: "Target location for symlinks",
    default: configuration.target,
    validate: validatePath,
  });

  const targetLocation = await realpath(targetLocationPrompt);

  const dotfilesLocationPrompt = await input({
    message: "Dotfiles repository location",
    default: configuration.repo,
    validate: validatePath,
  });

  const dotfilesLocation = await realpath(dotfilesLocationPrompt);

  return {
    target: targetLocation,
    repo: dotfilesLocation,
  };
};
