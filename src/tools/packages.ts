import type { DotConfig } from "./config.ts";
import { dirname, join } from "@std/path";
import { exists } from "@std/fs";
import Dot from "../dot.ts";
import { IgnoreFile } from "../tools/ignore.ts";

interface SourceFile extends Deno.DirEntry {
  // targeted directory
  directory: string;
  // package name
  package: string;
  // full path of the source file
  fullPath: string;
}

interface DotPackage {
  name: string;
  files: SourceFile[];
}

const listSourceFiles = async (
  path: string,
  folder: string = "",
  subFolder: string = "",
): Promise<SourceFile[]> => {
  const ignoreFile = new IgnoreFile(join(path, Dot.ignoreFileName));
  const result: SourceFile[] = [];
  const packagePath = join(path, folder);
  const fullPath = join(packagePath, subFolder);

  for await (const dirEntry of Deno.readDir(fullPath)) {
    if (dirEntry.isFile) {
      if (await ignoreFile.ignore(dirEntry.name)) continue;

      result.push({
        ...dirEntry,
        directory: subFolder,
        package: folder,
        fullPath: join(fullPath, dirEntry.name),
      });
    } else {
      if (await ignoreFile.ignore(dirEntry.name)) continue;

      const sub = await listSourceFiles(
        path,
        folder,
        join(subFolder, dirEntry.name),
      );
      result.push(...sub);
    }
  }

  return result;
};

const getTargetLink = async (
  path: string,
): Promise<string | null> => {
  if (await exists(path)) return Deno.realPath(path);

  return null;
};

const getPackage = async (
  path: string,
  name: string,
): Promise<DotPackage> => {
  return {
    name,
    files: await listSourceFiles(path, name),
  };
};

export const list = async (path: string) => {
  const ignoreFile = new IgnoreFile(join(path, Dot.ignoreFileName));

  const dotPackages: DotPackage[] = [];

  for await (const dirEntry of Deno.readDir(path)) {
    if (dirEntry.isFile) continue;
    if (await ignoreFile.ignore(dirEntry.name)) continue;

    dotPackages.push(await getPackage(path, dirEntry.name));
  }

  return dotPackages;
};

export const linkPackage = async (
  config: DotConfig,
  dotPackage: DotPackage,
): Promise<void> => {
  const files = await listSourceFiles(config.repo, dotPackage.name);

  for await (const file of files) {
    const targetLinkPath = join(
      config.target,
      file.directory,
      file.name,
    );

    // Avoid throw if it's a symlink that doesn't point to valid file
    await Deno.remove(targetLinkPath).catch(() => {})
    await Deno.mkdir(dirname(targetLinkPath), { recursive: true });
    await Deno.symlink(file.fullPath, targetLinkPath);
  }
};

export const unlinkPackage = async (
  config: DotConfig,
  dotPackage: DotPackage,
): Promise<void> => {
  const files = await listSourceFiles(config.repo, dotPackage.name);

  for await (const file of files) {
    const targetLinkPath = join(
      config.target,
      file.directory,
      file.name,
    );

    await Deno.remove(targetLinkPath).catch(() => {})
  }
};
