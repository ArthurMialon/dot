import Table from "cli-table3";
import Dot from "../../dot";
import * as config from "../../tools/config";
import * as packages from "../../tools/packages";
import * as log from "../../tools/logging";
import { bold, yellow } from "../../tools/logging";
import { loadManifest, resolveProfile } from "../../tools/profiles";

export const requireManifest = async (repo: string) => {
  const manifest = await loadManifest(repo);

  if (!manifest) {
    log.error(`This repository has no ${Dot.manifestFileName}.`);
    log.info(`Create one with: ${Dot.bin} profile init`);
    process.exit(1);
  }

  return manifest;
};

export const runProfileShow = async (): Promise<void> => {
  const configuration = await config.get();

  const manifest = await requireManifest(configuration.repo);

  if (!configuration.profile) {
    log.info("No active profile.");
    log.info(`Available: ${Object.keys(manifest.profiles).join(", ")}`);
    log.info(`Select one with: ${Dot.bin} profile use <name>`);
    return;
  }

  const onDisk = await packages.listPackageNames(configuration.repo);
  const profile = resolveProfile(manifest, configuration.profile, onDisk);

  const table = new Table({ head: ["Key", "Value"], style: { head: [] } });

  table.push(
    ["Profile", bold(profile.name)],
    ["Description", profile.description ?? "–"],
    ["Target", profile.target ?? configuration.target],
    ["Packages", profile.packages.join("\n") || "–"],
  );

  if (profile.missing.length) {
    table.push(["Missing", yellow(profile.missing.join("\n"))]);
  }

  log.info(table.toString());
};
