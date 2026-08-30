import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  lstat,
  readFile,
  readlink,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { list, linkPackage, unlinkPackage } from "../src/tools/packages";
import { createFixture, type Fixture } from "./helpers/fixture";

let fixture: Fixture;

beforeEach(async () => {
  fixture = await createFixture("dot-packages-");

  await fixture.write("repo/.dotignore", "*.md\n");
  await fixture.write("repo/zsh/.zshrc", "export ZSH=1\n");
  await fixture.write("repo/zsh/.config/zsh/functions.zsh", "fn() {}\n");
  await fixture.write("repo/git/.gitconfig", "[user]\n");
  await fixture.write("repo/git/README.md", "ignored\n");
});

afterEach(() => fixture.cleanup());

const packageNamed = async (name: string) => {
  const pkgs = await list(fixture.repo);
  const pkg = pkgs.find((p) => p.name === name);
  if (!pkg) throw new Error(`package ${name} not found`);
  return pkg;
};

describe("list", () => {
  test("finds packages and applies .dotignore", async () => {
    const pkgs = await list(fixture.repo);

    expect(pkgs.map((p) => p.name).sort()).toEqual(["git", "zsh"]);

    const git = pkgs.find((p) => p.name === "git")!;
    expect(git.files.map((f) => f.name)).toEqual([".gitconfig"]);

    const zsh = pkgs.find((p) => p.name === "zsh")!;
    expect(zsh.files.length).toBe(2);
  });

  // Regression: SourceFile used to be built by spreading a directory entry.
  // node's Dirent keeps isFile() on the prototype, so a spread silently dropped
  // every field except name/path/parentPath.
  test("reports directory and fullPath for nested files", async () => {
    const zsh = await packageNamed("zsh");

    const nested = zsh.files.find((f) => f.name === "functions.zsh")!;
    expect(nested.directory).toBe(join(".config", "zsh"));
    expect(nested.fullPath).toBe(
      join(fixture.repo, "zsh", ".config", "zsh", "functions.zsh"),
    );

    const root = zsh.files.find((f) => f.name === ".zshrc")!;
    expect(root.directory).toBe("");
    expect(root.package).toBe("zsh");
  });

  test("honours the filter order", async () => {
    const pkgs = await list(fixture.repo, { names: ["zsh", "git"] });
    expect(pkgs.map((p) => p.name)).toEqual(["zsh", "git"]);

    const only = await list(fixture.repo, { names: ["git"] });
    expect(only.map((p) => p.name)).toEqual(["git"]);
  });
});

describe("linkPackage", () => {
  test("creates symlinks mirroring the package tree", async () => {
    await linkPackage(fixture.config, await packageNamed("zsh"));

    const top = join(fixture.target, ".zshrc");
    expect((await lstat(top)).isSymbolicLink()).toBe(true);
    expect(await readlink(top)).toBe(join(fixture.repo, "zsh", ".zshrc"));
    expect(await readFile(top, "utf8")).toBe("export ZSH=1\n");

    const nested = join(fixture.target, ".config", "zsh", "functions.zsh");
    expect((await lstat(nested)).isSymbolicLink()).toBe(true);
  });

  test("is idempotent", async () => {
    const zsh = await packageNamed("zsh");

    await linkPackage(fixture.config, zsh);
    await linkPackage(fixture.config, zsh);

    expect((await lstat(join(fixture.target, ".zshrc"))).isSymbolicLink()).toBe(
      true,
    );
  });
});

describe("unlinkPackage", () => {
  test("removes the symlinks it created and keeps the directories", async () => {
    const zsh = await packageNamed("zsh");

    await linkPackage(fixture.config, zsh);
    const reports = await unlinkPackage(fixture.config, zsh);

    expect(reports.every((r) => r.outcome === "removed")).toBe(true);
    expect(await Bun.file(join(fixture.target, ".zshrc")).exists()).toBe(false);
    expect(
      (await stat(join(fixture.target, ".config", "zsh"))).isDirectory(),
    ).toBe(true);
  });

  // Regression: the previous implementation removed whatever sat at the target
  // path, so a real ~/.zshrc was destroyed by `dot unlink zsh`.
  test("never deletes a real file", async () => {
    const realFile = join(fixture.target, ".zshrc");
    await writeFile(realFile, "precious\n");

    const reports = await unlinkPackage(
      fixture.config,
      await packageNamed("zsh"),
    );

    expect(await readFile(realFile, "utf8")).toBe("precious\n");
    expect(reports.find((r) => r.file.name === ".zshrc")?.outcome).toBe(
      "skipped-not-symlink",
    );
  });

  test("leaves a symlink owned by something else alone", async () => {
    const foreign = join(fixture.target, ".zshrc");
    const elsewhere = await fixture.write("elsewhere/.zshrc", "other\n");
    await symlink(elsewhere, foreign);

    const reports = await unlinkPackage(
      fixture.config,
      await packageNamed("zsh"),
    );

    expect((await lstat(foreign)).isSymbolicLink()).toBe(true);
    expect(await readlink(foreign)).toBe(elsewhere);
    expect(reports.find((r) => r.file.name === ".zshrc")?.outcome).toBe(
      "skipped-foreign",
    );
  });

  test("reports absent targets", async () => {
    const reports = await unlinkPackage(
      fixture.config,
      await packageNamed("git"),
    );

    expect(reports.map((r) => r.outcome)).toEqual(["absent"]);
  });
});
