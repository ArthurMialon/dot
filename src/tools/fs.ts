import { cp, stat } from "node:fs/promises";
import { homedir } from "node:os";

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

/** Raised when a path refers to an environment variable that is not set. */
export class PathExpansionError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`$${variable} is not set.`);
    this.name = "PathExpansionError";
    this.variable = variable;
  }
}

/**
 * Expand `~`, `$VAR` and `${VAR}`. A prompt has no shell behind it, so a typed
 * `~/dotfiles` would otherwise be handed to stat() verbatim and rejected as
 * missing. Throws rather than substituting an empty string, which would turn
 * `$NOPE/config` into an absolute path at the filesystem root.
 */
export const expandPath = (value: string): string =>
  value
    .replace(/^~(?=\/|$)/, homedir())
    .replace(
      /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
      (_match, braced: string | undefined, bare: string | undefined) => {
        const name = braced ?? bare ?? "";
        const resolved = process.env[name];

        if (resolved === undefined) throw new PathExpansionError(name);

        return resolved;
      },
    );
