import { realpath } from "node:fs/promises";
import { Command } from "commander";
import { confirm, select, isInteractive } from "../tools/prompt";
import Dot from "../dot";
import * as config from "../tools/config";
import * as log from "../tools/logging";
import { blue, bold } from "../tools/logging";
import * as git from "../tools/git";
import { exists } from "../tools/fs";
import { loadManifest, resolveProfile, resolveTarget } from "../tools/profiles";
import * as packages from "../tools/packages";
import { hostname } from "node:os";
import configEditPrompt from "../prompt/config-edit";
import { runList } from "./list";
import { runLink } from "./link";

export interface InitOptions {
  path?: string;
  branch?: string;
  profile?: string;
  target?: string;
  yes?: boolean;
}

/** Normalise a hostname so "Arthurs-MacBook-Pro.local" matches "macbook". */
const normalizeHost = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\.(local|lan)$/, "")
    .split(".")[0]
    .replace(/[^a-z0-9]/g, "");

/**
 * Profile choice is always explicit: macbook and macmini are both darwin, so
 * only the hostname discriminates, and hostnames change. It preselects the
 * likely answer but never applies one silently.
 */
const chooseProfile = async (
  repo: string,
  options: InitOptions,
): Promise<{ profile: string; target?: string } | null> => {
  const manifest = await loadManifest(repo);

  if (!manifest) return null;

  const names = Object.keys(manifest.profiles);

  if (names.length === 0) return null;

  const onDisk = await packages.listPackageNames(repo);

  if (options.profile) {
    const resolved = resolveProfile(manifest, options.profile, onDisk);
    return { profile: resolved.name, target: resolved.target };
  }

  if (!isInteractive()) return null;

  const host = normalizeHost(hostname());
  const match = names.find(
    (name) => host.includes(name.toLowerCase()) || name.toLowerCase() === host,
  );

  const chosen = await select({
    message: "Which profile is this machine?",
    choices: names.map((name) => ({
      name: match === name ? `${name} (matches this hostname)` : name,
      value: name,
      description: manifest.profiles[name].description,
    })),
    default: match,
  });

  return {
    profile: chosen,
    target: resolveTarget(manifest.profiles[chosen]),
  };
};

export const runInit = async (
  remoteRepository: string | undefined,
  options: InitOptions = {},
): Promise<void> => {
  log.info(blue(`👋 Welcome to ${Dot.title}.`));
  log.info(
    "👉 Setup starts with location of your dotfiles repository and the target location.\n",
  );

  // Avoid throwing if the config is not initialized yet
  const configuration = await config.get({ safe: true });

  if (remoteRepository) {
    const destination = options.path ?? Dot.defaultRepo;

    log.info("Remote repository", bold(remoteRepository));
    log.info("Cloning into", bold(destination));

    const confirmClone =
      options.yes ||
      (await confirm({
        message: "Clone it as your dotfiles repository?",
        default: false,
        hint: "Re-run with --yes to accept the defaults.",
      }));

    if (!confirmClone) {
      log.info("Aborted");
      return;
    }

    const reused = await reuseExistingClone(destination, remoteRepository);

    if (reused === "conflict") {
      log.error(`${destination} already exists and is not this repository.`);
      log.info(
        `Pick another location with: ${Dot.bin} init <url> --path <dir>`,
      );
      process.exit(1);
    }

    if (reused === "clone") {
      const cloned = await git.clone(
        remoteRepository,
        destination,
        options.branch,
      );

      if (!cloned) {
        log.error(`Failed to clone repository ${remoteRepository}`);
        process.exit(1);
      }
    }

    configuration.repo = await realpath(destination);
  }

  const chosen = await chooseProfile(configuration.repo, options);

  if (chosen) {
    log.info("Profile:", bold(chosen.profile));

    if (chosen.target) {
      log.info("Profile target:", bold(chosen.target));
      configuration.target = chosen.target;
    }
  }

  if (options.target) configuration.target = options.target;

  const configPrompt =
    options.yes || !isInteractive()
      ? { target: configuration.target, repo: configuration.repo }
      : await configEditPrompt(configuration);

  const remote = await git.getRemoteUrl(configPrompt.repo);
  const currentBranch = await git.getCurrentBranch(configPrompt.repo);
  const branch = options.branch ?? (currentBranch || null);

  await config.initialize({
    target: configPrompt.target,
    repo: configPrompt.repo,
    initialized: true,
    remote,
    branch,
    profile: chosen?.profile ?? null,
  });

  if (remote) log.info("Remote:", bold(remote));
  if (branch) log.info("Branch:", bold(branch));

  log.success(`\n💪 ${Dot.title} initialized successfully!`);

  await runList();

  const confirmed =
    options.yes ||
    (await confirm({
      message: "Do you want to link your dotfiles?",
      default: false,
      hint: "Re-run with --yes to link without asking.",
    }));

  if (!confirmed) {
    log.success(`Link your dotfiles later, with: ${Dot.bin} link`);
    return;
  }

  await runLink({ force: true });

  const configurationReady = await config.get();

  log.success(
    "\nYour dotfiles are now linked to your target",
    bold(configurationReady.target),
  );
};

/**
 * Never clone on top of existing content: reuse the directory when it already
 * is this repository, otherwise let the caller bail out.
 */
const reuseExistingClone = async (
  destination: string,
  remoteRepository: string,
): Promise<"clone" | "reuse" | "conflict"> => {
  if (!(await exists(destination))) return "clone";

  if (!(await git.isRepository(destination))) return "conflict";

  const origin = await git.getRemoteUrl(destination);

  if (origin !== remoteRepository) return "conflict";

  log.info("Already cloned, reusing", bold(destination));

  return "reuse";
};

export const initCommand = new Command("init")
  .description(`Initialize ${Dot.title} with valid configuration.`)
  .argument("[repository]", "Remote repository to clone")
  .option("--path <dir>", `Clone destination (default: ${Dot.defaultRepo})`)
  .option("-b, --branch <name>", "Branch to clone and record")
  .option("-p, --profile <name>", "Profile to activate, skipping the prompt")
  .option("-t, --target <path>", "Symlink target, skipping the prompt")
  .option("-y, --yes", "Accept the defaults without prompting", false)
  .action((repository: string | undefined, options: InitOptions) =>
    runInit(repository, options),
  );

export default initCommand;
