import Table from "cli-table3";
import * as config from "../../tools/config";
import * as packages from "../../tools/packages";
import * as log from "../../tools/logging";
import { bold } from "../../tools/logging";
import { resolveProfile } from "../../tools/profiles";
import { requireManifest } from "./show";

export const runProfileList = async (): Promise<void> => {
  const configuration = await config.get();

  const manifest = await requireManifest(configuration.repo);
  const onDisk = await packages.listPackageNames(configuration.repo);

  const table = new Table({
    head: ["", "Profile", "Description", "Packages"],
    style: { head: [] },
  });

  for (const name of Object.keys(manifest.profiles)) {
    const profile = resolveProfile(manifest, name, onDisk);

    table.push([
      configuration.profile === name ? "✓" : "",
      configuration.profile === name ? bold(name) : name,
      profile.description ?? "–",
      String(profile.packages.length),
    ]);
  }

  log.info(table.toString());
};
