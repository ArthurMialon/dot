import {
  lstat,
  mkdir,
  readdir,
  readlink,
  symlink,
  unlink,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { DotConfig } from "./config";
import Dot from "../dot";
import { getIgnoreFile, type IgnoreFile } from "./ignore";

export interface SourceFile {
  // file name
  name: string;
  // targeted directory, relative to the package root
  directory: string;
  // package name
  package: string;
  // full path of the source file
  fullPath: string;
}

export interface DotPackage {
  name: string;
  files: SourceFile[];
}

export type UnlinkOutcome =
  "removed" | "absent" | "skipped-not-symlink" | "skipped-foreign";

export interface UnlinkReport {
  file: SourceFile;
  target: string;
  outcome: UnlinkOutcome;
}

/** The path a source file is linked to inside the target directory. */
export const targetPathFor = (target: string, file: SourceFile): string =>
  join(target, file.directory, file.name);

const listSourceFiles = async (
  path: string,
  folder: string = "",
  subFolder: string = "",
  ignoreFile: IgnoreFile = getIgnoreFile(join(path, Dot.ignoreFileName)),
): Promise<SourceFile[]> => {
  const result: SourceFile[] = [];
  const packagePath = join(path, folder);
  const fullPath = join(packagePath, subFolder);

  for (const dirEntry of await readdir(fullPath, { withFileTypes: true })) {
    if (await ignoreFile.ignore(dirEntry.name)) continue;

    if (dirEntry.isDirectory()) {
      result.push(
        ...(await listSourceFiles(
          path,
          folder,
          join(subFolder, dirEntry.name),
          ignoreFile,
        )),
      );
      continue;
    }

    result.push({
      name: dirEntry.name,
      directory: subFolder,
      package: folder,
      fullPath: join(fullPath, dirEntry.name),
    });
  }

  return result;
};

const getPackage = async (path: string, name: string): Promise<DotPackage> => {
  return {
    name,
    files: await listSourceFiles(path, name),
  };
};

/** Package directory names, without walking their contents. */
export const listPackageNames = async (path: string): Promise<string[]> => {
  const ignoreFile = getIgnoreFile(join(path, Dot.ignoreFileName));

  const names: string[] = [];

  for (const dirEntry of await readdir(path, { withFileTypes: true })) {
    if (!dirEntry.isDirectory()) continue;
    if (await ignoreFile.ignore(dirEntry.name)) continue;

    names.push(dirEntry.name);
  }

  return names;
};

export const list = async (
  path: string,
  filter?: { names: string[] | null },
): Promise<DotPackage[]> => {
  const names = await listPackageNames(path);

  // When a filter is given, honour its order so linking is deterministic and
  // identical across machines instead of depending on the filesystem.
  const selected = filter?.names
    ? filter.names.filter((name) => names.includes(name))
    : names;

  const dotPackages: DotPackage[] = [];

  for (const name of selected) {
    dotPackages.push(await getPackage(path, name));
  }

  return dotPackages;
};

/** True when `target` is a symlink resolving to `expectedSource`. */
const isManagedLink = async (
  target: string,
  expectedSource: string,
): Promise<boolean> => {
  try {
    const stats = await lstat(target);

    if (!stats.isSymbolicLink()) return false;

    const destination = await readlink(target);

    return resolve(dirname(target), destination) === resolve(expectedSource);
  } catch {
    return false;
  }
};

export const linkPackage = async (
  config: DotConfig,
  dotPackage: DotPackage,
): Promise<void> => {
  const files = await listSourceFiles(config.repo, dotPackage.name);

  for (const file of files) {
    const targetLinkPath = targetPathFor(config.target, file);

    // Avoid throwing on a symlink that points at a missing file.
    await unlink(targetLinkPath).catch(() => {});
    await mkdir(dirname(targetLinkPath), { recursive: true });
    await symlink(file.fullPath, targetLinkPath);
  }
};

/**
 * Only removes symlinks this package owns. The previous implementation removed
 * whatever sat at the target path, so a real ~/.zshrc was destroyed by
 * `dot unlink zsh`.
 */
export const unlinkPackage = async (
  config: DotConfig,
  dotPackage: DotPackage,
): Promise<UnlinkReport[]> => {
  const files = await listSourceFiles(config.repo, dotPackage.name);

  const reports: UnlinkReport[] = [];

  for (const file of files) {
    const target = targetPathFor(config.target, file);

    reports.push({
      file,
      target,
      outcome: await removeManagedLink(target, file.fullPath),
    });
  }

  return reports;
};

const removeManagedLink = async (
  target: string,
  source: string,
): Promise<UnlinkOutcome> => {
  let stats;

  try {
    stats = await lstat(target);
  } catch {
    return "absent";
  }

  if (!stats.isSymbolicLink()) return "skipped-not-symlink";

  if (!(await isManagedLink(target, source))) return "skipped-foreign";

  try {
    await unlink(target);
    return "removed";
  } catch {
    return "absent";
  }
};
