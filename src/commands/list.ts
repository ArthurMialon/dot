import { join } from "node:path";
import { Command } from "commander";
import Table from "cli-table3";
import * as config from "../tools/config";
import * as packages from "../tools/packages";
import * as log from "../tools/logging";
import { bold, dim, yellow } from "../tools/logging";
import {
  ALL,
  loadManifest,
  resolveProfile,
  type DotManifest,
} from "../tools/profiles";
import { resolveSelection } from "./selection";

export interface ListOptions {
  verbose?: boolean;
  profile?: string;
  all?: boolean;
}

/**
 * Which profiles do NOT link a package. Since a profile takes everything by
 * default, the exceptions are the interesting part: listing the profiles that
 * include a package would just repeat every profile name on every row.
 */
const excludedFrom = (
  manifest: DotManifest,
  name: string,
  onDisk: string[],
): string[] =>
  Object.keys(manifest.profiles).filter(
    (profileName) =>
      !resolveProfile(manifest, profileName, onDisk).packages.includes(name),
  );

export const runList = async (options: ListOptions = {}): Promise<void> => {
  const { verbose = false, profile, all = false } = options;

  const configuration = await config.get();

  const manifest = await loadManifest(configuration.repo);

  const { selection, packages: selected } = await resolveSelection(
    configuration,
    { profile, all },
  );

  const filesColumn = verbose ? "Files" : "# Files";

  // Without a manifest the table stays exactly as it was.
  if (!manifest) {
    const table = new Table({
      head: ["Packages", filesColumn],
      style: { head: [] },
    });

    for (const pkg of selected) table.push(renderRow(pkg, verbose));

    log.info(table.toString());
    return;
  }

  // Mark the machine's profile even when --all widens the view past it.
  const activeProfile = selection.profile?.name ?? configuration.profile;

  const onDisk = await packages.listPackageNames(configuration.repo);
  const shown = all || !selection.names ? onDisk : selection.names;

  const rows: string[][] = [];

  for (const pkg of await packages.list(configuration.repo, { names: shown })) {
    const excluded = excludedFrom(manifest, pkg.name, onDisk);

    rows.push([
      ...renderRow(pkg, verbose, excluded),
      activeProfile && excluded.includes(activeProfile) ? dim("excluded") : "",
    ]);
  }

  // Named by an explicit include but with no directory on disk.
  if (all) {
    const declared = new Set(
      Object.values(manifest.profiles).flatMap((profile) =>
        profile.include.filter((name) => name !== ALL),
      ),
    );

    for (const name of declared) {
      if (onDisk.includes(name)) continue;

      rows.push([name, "–", "–", yellow("missing")]);
    }
  }

  // Only show the status column when something actually needs flagging.
  const withStatus = rows.some((row) => row[3] !== "");

  const table = new Table({
    head: withStatus
      ? ["Package", "Excluded from", filesColumn, ""]
      : ["Package", "Excluded from", filesColumn],
    style: { head: [] },
  });

  for (const row of rows) table.push(withStatus ? row : row.slice(0, 3));

  log.info(table.toString());

  if (selection.profile) {
    const fileCount = selected.reduce((sum, p) => sum + p.files.length, 0);

    log.info(
      `Profile: ${bold(selection.profile.name)} — ${selected.length} package(s), ${fileCount} file(s)`,
    );
  }
};

const renderRow = (
  pkg: packages.DotPackage,
  verbose: boolean,
  excludedFromProfiles?: string[],
): string[] => {
  const files = verbose
    ? pkg.files.map((file) => join(file.directory, file.name)).join("\n")
    : String(pkg.files.length);

  if (!excludedFromProfiles) return [bold(pkg.name), files];

  // No marker for the active profile: the status column already says
  // "excluded", and repeating it in two places reads as two facts.
  return [bold(pkg.name), excludedFromProfiles.join(", ") || "–", files];
};

export const listCommand = new Command("list")
  .description("List your packages")
  .option("-v, --verbose", "Display files too", false)
  .option("-p, --profile <name>", "List the packages of a specific profile")
  .option("--all", "List every package, ignoring profiles", false)
  .action((options: ListOptions) => runList(options));

export default listCommand;
