import { join } from "node:path";
import { Command } from "commander";
import Table from "cli-table3";
import * as config from "../tools/config";
import * as packages from "../tools/packages";
import * as log from "../tools/logging";
import { bold, dim, yellow } from "../tools/logging";
import { loadManifest, type DotManifest } from "../tools/profiles";
import { resolveSelection } from "./selection";

export interface ListOptions {
  verbose?: boolean;
  profile?: string;
  all?: boolean;
}

/** Which profiles (and `common`) a package belongs to. */
const membership = (manifest: DotManifest, name: string): string[] => {
  const owners: string[] = [];

  if (manifest.common.includes(name)) owners.push("common");

  for (const [profileName, profile] of Object.entries(manifest.profiles)) {
    if (profile.packages.includes(name)) owners.push(profileName);
  }

  return owners;
};

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
    const owners = membership(manifest, pkg.name);

    rows.push([
      ...renderRow(pkg, verbose, owners, activeProfile ?? undefined),
      owners.length === 0 ? dim("unassigned") : "",
    ]);
  }

  // Declared in the manifest but with no directory on disk.
  if (all) {
    const declared = new Set([
      ...manifest.common,
      ...Object.values(manifest.profiles).flatMap((p) => p.packages),
    ]);

    for (const name of declared) {
      if (onDisk.includes(name)) continue;

      rows.push([
        name,
        membership(manifest, name).join(", "),
        "–",
        yellow("missing"),
      ]);
    }
  }

  // Only show the status column when something actually needs flagging.
  const withStatus = rows.some((row) => row[3] !== "");

  const table = new Table({
    head: withStatus
      ? ["Package", "Profiles", filesColumn, ""]
      : ["Package", "Profiles", filesColumn],
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
  owners?: string[],
  activeProfile?: string,
): string[] => {
  const files = verbose
    ? pkg.files.map((file) => join(file.directory, file.name)).join("\n")
    : String(pkg.files.length);

  if (!owners) return [bold(pkg.name), files];

  const labels = owners.map((owner) =>
    owner === activeProfile ? `${owner} ✓` : owner,
  );

  return [bold(pkg.name), labels.join(", ") || "–", files];
};

export const listCommand = new Command("list")
  .description("List your packages")
  .option("-v, --verbose", "Display files too", false)
  .option("-p, --profile <name>", "List the packages of a specific profile")
  .option("--all", "List every package, ignoring profiles", false)
  .action((options: ListOptions) => runList(options));

export default listCommand;
