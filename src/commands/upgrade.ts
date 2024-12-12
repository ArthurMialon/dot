import { copy, readerFromStreamReader } from "@std/io";
import Dot from "../dot.ts";
import * as log from "../tools/logging.ts";
import { Command } from "@cliffy/command";
import { bold } from "@std/fmt/colors";
import * as github from "../tools/github.ts";

export default new Command()
  .description("Upgrade to latest version")
  .action(async () => {
    const latestRelease = await github.latestRelease();
    const latestVersion = latestRelease.tag_name.replace("v", "");

    const installScriptPath = `tmp_upgrade-${crypto.randomUUID()}.sh`;

    if (Dot.version === latestVersion) {
      log.success(`${Dot.title} is already up to date on`, bold(Dot.version));
      Deno.exit(0);
    }

    log.info("You're running version", bold(Dot.version));
    log.info("Found version", bold(latestVersion));
    log.info("Upgrading...");

    const fetchScript = new Deno.Command("curl", {
      args: ["-fsSL", Dot.installScript],
      stdin: "piped",
      stdout: "piped",
    }).spawn();

    // open a file and pipe the subprocess output to it.
    fetchScript.stdout.pipeTo(
      Deno.openSync(installScriptPath, { write: true, create: true }).writable,
    );

    // manually close stdin
    fetchScript.stdin.close();
    const status = await fetchScript.status;

    if (!status.success) {
      log.error("Cannot fetch installation script\n");
      log.info(bold(`Please visit the ${Dot.title} repository to upgrade:`));
      log.info(Dot.github);
      Deno.exit(1);
    }

    const install = new Deno.Command("sh", {
      args: [installScriptPath],
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    copy(readerFromStreamReader(install.stdout.getReader()), Deno.stdout);
    copy(readerFromStreamReader(install.stderr.getReader()), Deno.stderr);

    await install.status;

    await Deno.remove(installScriptPath);

    log.success(`Upgrade to ${bold(latestVersion)} complete!`);
  });
