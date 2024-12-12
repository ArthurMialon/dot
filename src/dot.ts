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
  installScript: string;
}

const CONFIG_DIR = `${Deno.env.get("HOME")}/.dot`;
const CONFIG_PATH = `${CONFIG_DIR}/config`;

const DEFAULT_REPO = `${Deno.env.get("HOME")}/dotfiles`;
const DEFAULT_TARGET = `${Deno.env.get("HOME")}`;

const owner = "arthurmialon";
const repository = "dot";

const installScript =
  `https://raw.githubusercontent.com/${owner}/${repository}/main/install.sh`;

const Dot: DotCLI = {
  title: "Dot CLI",
  description: "Easily manage your dotfiles.",
  bin: "dot",
  repository,
  owner,
  github: `https://github.com/${owner}/${repository}`,
  installScript,
  version: "__VERSION__",
  configPath: CONFIG_PATH,
  configDirectory: CONFIG_DIR,
  defaultRepo: DEFAULT_REPO,
  defaultTarget: DEFAULT_TARGET,
  ignoreFileName: ".dotignore",
};

export default Dot;
