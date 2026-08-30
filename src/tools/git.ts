import { capture, exec } from "./process";

const git = (repository: string, ...args: string[]): string[] => [
  "git",
  "-C",
  repository,
  ...args,
];

export const clone = async (
  repository: string,
  targetFolder: string,
  branch?: string,
): Promise<boolean> => {
  const args = ["git", "clone"];

  if (branch) args.push("--branch", branch);

  args.push(repository, targetFolder);

  const { ok } = await exec(args);

  return ok;
};

export const status = async (repository: string): Promise<boolean> => {
  const { ok } = await exec(git(repository, "status", "--short"));

  return ok;
};

export const hasChange = async (repository: string): Promise<boolean> => {
  const { stdout } = await capture(git(repository, "status", "--short"));

  return stdout.trim().length > 0;
};

export const add = async (repository: string): Promise<boolean> => {
  const { ok } = await exec(git(repository, "add", "."));

  return ok;
};

export const commit = async (
  repository: string,
  message: string,
): Promise<boolean> => {
  const { ok } = await exec(git(repository, "commit", "-m", message));

  return ok;
};

export const getCurrentBranch = async (repository: string): Promise<string> => {
  const { stdout } = await capture(
    git(repository, "rev-parse", "--abbrev-ref", "HEAD"),
  );

  return stdout.trim();
};

export const push = async (
  repository: string,
  branch: string,
): Promise<boolean> => {
  const { ok } = await exec(git(repository, "push", "origin", branch));

  return ok;
};

export const pull = async (
  repository: string,
  branch: string,
): Promise<boolean> => {
  const { ok } = await exec(git(repository, "pull", "origin", branch));

  return ok;
};

/**
 * Reads the raw configured URL rather than `git remote get-url`, which applies
 * `url.<base>.insteadOf` rewrites. Comparing a rewritten URL against the one we
 * stored would report drift forever for anyone using those rules.
 */
export const getRemoteUrl = async (
  repository: string,
  name: string = "origin",
): Promise<string | null> => {
  const { ok, stdout } = await capture(
    git(repository, "config", "--get", `remote.${name}.url`),
  );

  const url = stdout.trim();

  return ok && url ? url : null;
};

export const setRemoteUrl = async (
  repository: string,
  url: string,
  name: string = "origin",
): Promise<boolean> => {
  const existing = await getRemoteUrl(repository, name);

  const { ok } = await exec(
    existing
      ? git(repository, "remote", "set-url", name, url)
      : git(repository, "remote", "add", name, url),
  );

  return ok;
};

export const branchExists = async (
  repository: string,
  branch: string,
): Promise<boolean> => {
  const { ok } = await capture(
    git(repository, "rev-parse", "--verify", `refs/heads/${branch}`),
  );

  return ok;
};

export const isRepository = async (path: string): Promise<boolean> => {
  const { ok, stdout } = await capture(
    git(path, "rev-parse", "--is-inside-work-tree"),
  );

  return ok && stdout.trim() === "true";
};
