import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import Dot from "../dot";
import * as log from "../tools/logging";
import { bold } from "../tools/logging";
import * as github from "../tools/github";
import { exec } from "../tools/process";

export const runUpgrade = async (): Promise<void> => {
  const latestRelease = await github.latestRelease();
  const latestVersion = latestRelease.tag_name.replace(/^v/, "");

  if (Dot.version === latestVersion) {
    log.success(`${Dot.title} is already up to date on`, bold(Dot.version));
    return;
  }

  log.info("You're running version", bold(Dot.version));
  log.info("Found version", bold(latestVersion));
  log.info("Upgrading...");

  const installScriptPath = join(
    tmpdir(),
    `dot-upgrade-${crypto.randomUUID()}.sh`,
  );

  const response = await fetch(Dot.installScript);

  if (!response.ok) {
    log.error("Cannot fetch installation script\n");
    log.info(bold(`Please visit the ${Dot.title} repository to upgrade:`));
    log.info(Dot.github);
    process.exit(1);
  }

  await Bun.write(installScriptPath, response);

  try {
    // inherit stdio so the installer's own prompts stay visible
    await exec(["sh", installScriptPath]);
  } finally {
    await rm(installScriptPath, { force: true });
  }

  log.success(`Upgrade to ${bold(latestVersion)} complete!`);
};

export const upgradeCommand = new Command("upgrade")
  .description("Upgrade to latest version")
  .action(runUpgrade);

export default upgradeCommand;
