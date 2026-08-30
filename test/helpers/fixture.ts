import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import type { DotConfig } from "../../src/tools/config";

export interface Fixture {
  root: string;
  repo: string;
  target: string;
  config: DotConfig;
  write: (relativePath: string, content: string) => Promise<string>;
  cleanup: () => Promise<void>;
}

/** A throwaway dotfiles repository plus an empty target directory. */
export const createFixture = async (prefix = "dot-test-"): Promise<Fixture> => {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const repo = join(root, "repo");
  const target = join(root, "target");

  await mkdir(repo, { recursive: true });
  await mkdir(target, { recursive: true });

  const write = async (relativePath: string, content: string) => {
    const full = join(root, relativePath);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
    return full;
  };

  return {
    root,
    repo,
    target,
    config: {
      repo,
      target,
      configPath: join(root, "config"),
      configDirectory: root,
      initialized: true,
    },
    write,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
};
