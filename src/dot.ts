import { homedir } from "node:os";
import { join } from "node:path";

interface DotCLI {
  title: string;
  bin: string;
  description: string;
  repository: string;
  owner: string;
  github: string;
  version: string;
  configDirectory: string;
  configPath: string;
  defaultRepo: string;
  defaultTarget: string;
  ignoreFileName: string;
  manifestFileName: string;
  installScript: string;
}

const HOME = homedir();

const CONFIG_DIR = join(HOME, ".dot");
const CONFIG_PATH = join(CONFIG_DIR, "config");

const DEFAULT_REPO = join(HOME, "dotfiles");
const DEFAULT_TARGET = HOME;

const owner = "arthurmialon";
const repository = "dot";

const installScript = `https://raw.githubusercontent.com/${owner}/${repository}/main/install.sh`;

// Replaced at build time by `bun build --define process.env.DOT_VERSION=...`
const version = process.env.DOT_VERSION ?? "0.0.0-dev";

const Dot: DotCLI = {
  title: "Dot CLI",
  description: "Easily manage your dotfiles.",
  bin: "dot",
  repository,
  owner,
  github: `https://github.com/${owner}/${repository}`,
  installScript,
  version,
  configPath: CONFIG_PATH,
  configDirectory: CONFIG_DIR,
  defaultRepo: DEFAULT_REPO,
  defaultTarget: DEFAULT_TARGET,
  ignoreFileName: ".dotignore",
  manifestFileName: "dot.json",
};

export default Dot;
