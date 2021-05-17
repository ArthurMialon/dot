import { Configuration } from "./config";

export const ownerPrompter = (config: Configuration) => ({
  message: "Repository owner",
  name: "owner",
  type: "input",
  ...(config.owner ? { default: () => config.owner } : {}),
  validate: (value: string) => value.length > 1 || "Owner should be longer",
});

export const repositoryPrompter = (config: Configuration) => ({
  message: "Repository",
  name: "repo",
  type: "input",
  default: () => config.repo,
  validate: (value: string) =>
    value.length > 1 || "Repository should be longer",
});

export const installScriptPrompter = (config: Configuration) => ({
  message: "Repository",
  name: "install_script",
  type: "input",
  default: () => config.install_script,
  validate: (value: string) =>
    value.length > 1 || "Install script should be longer",
});

export const targetPrompter = (config: Configuration) => ({
  message: "Target",
  name: "target",
  type: "input",
  default: () => config.target,
  validate: (value: string) =>
    value.length > 1 || "Target script should be longer",
});
