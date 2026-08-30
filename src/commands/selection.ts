import type { DotConfig } from "../tools/config";
import * as packages from "../tools/packages";
import {
  selectPackages,
  type PackageSelection,
  type SelectOptions,
} from "../tools/profiles";
import * as log from "../tools/logging";
import { yellow } from "../tools/logging";

export interface ResolvedSelection {
  selection: PackageSelection;
  packages: packages.DotPackage[];
}

/**
 * Resolves which packages a command should act on, combining the active
 * profile (or --profile / --all) with an optional package positional.
 */
export const resolveSelection = async (
  configuration: DotConfig,
  options: SelectOptions = {},
): Promise<ResolvedSelection> => {
  const onDisk = await packages.listPackageNames(configuration.repo);

  const selection = await selectPackages(configuration, onDisk, options);

  for (const warning of selection.warnings) {
    log.info(yellow("⚠"), warning);
  }

  const resolved = await packages.list(
    configuration.repo,
    selection.names ? { names: selection.names } : undefined,
  );

  return { selection, packages: resolved };
};

export const describeSelection = (selection: PackageSelection): string =>
  selection.profile
    ? `Profile: ${selection.profile.name}`
    : "All packages (no profile filter)";
