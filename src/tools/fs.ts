import { cp, stat } from "node:fs/promises";

/**
 * Matches the semantics of `@std/fs.exists`: follows symlinks and answers for
 * directories too. `Bun.file(path).exists()` returns false for a directory, so
 * it cannot be used here.
 */
export const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Copy a file or directory, resolving symlinks so the dotfiles repository
 * always stores real content rather than links back into the target.
 */
export const copyContents = async (
  source: string,
  target: string,
): Promise<boolean> => {
  try {
    await cp(source, target, {
      recursive: true,
      dereference: true,
      force: true,
    });
    return true;
  } catch {
    return false;
  }
};
