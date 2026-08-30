import { realpath } from "node:fs/promises";
import type { DotConfig } from "../tools/config";
import { exists } from "../tools/fs";
import { pathInput } from "./path";

const validatePath = async (value: string) =>
  (await exists(value)) || "This path does not exist";

export default async (configuration: DotConfig) => {
  // pathInput expands ~ and $VAR before validating, and returns the expanded
  // path, so realpath below always receives something the filesystem knows.
  const targetLocation = await realpath(
    await pathInput({
      message: "Target location for symlinks",
      default: configuration.target,
      validate: validatePath,
    }),
  );

  const dotfilesLocation = await realpath(
    await pathInput({
      message: "Dotfiles repository location",
      default: configuration.repo,
      validate: validatePath,
    }),
  );

  return {
    target: targetLocation,
    repo: dotfilesLocation,
  };
};
