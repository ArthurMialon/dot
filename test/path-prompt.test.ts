import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { completePath } from "../src/prompt/path";
import { PathExpansionError, expandPath } from "../src/tools/fs";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "dot-path-"));

  for (const dir of ["dotfiles", "dot-test", "documents", ".hidden"]) {
    await mkdir(join(root, dir), { recursive: true });
  }

  await writeFile(join(root, "dotfile.txt"), "not a directory\n");
  await symlink(join(root, "dotfiles"), join(root, "linked"));
});

afterEach(() => rm(root, { recursive: true, force: true }));

describe("expandPath", () => {
  test("leaves an absolute path alone", () => {
    expect(expandPath("/etc/hosts")).toBe("/etc/hosts");
  });

  test("expands environment variables in both forms", () => {
    process.env.DOT_TEST_DIR = "/srv/data";

    expect(expandPath("$DOT_TEST_DIR/x")).toBe("/srv/data/x");
    expect(expandPath("${DOT_TEST_DIR}")).toBe("/srv/data");

    delete process.env.DOT_TEST_DIR;
  });

  // Substituting an empty string would turn $NOPE/config into /config.
  test("refuses an unset variable", () => {
    expect(() => expandPath("$DOT_UNSET_VAR/x")).toThrow(PathExpansionError);
  });

  test("only expands a bare leading tilde", () => {
    expect(expandPath("~notauser/x")).toBe("~notauser/x");
  });
});

describe("completePath", () => {
  test("lists the directories of a trailing-slash path", async () => {
    const { candidates } = await completePath(`${root}/`);

    expect(candidates).toEqual(["documents", "dot-test", "dotfiles", "linked"]);
  });

  test("completes a unique match and appends the separator", async () => {
    const { value, candidates } = await completePath(`${root}/dotf`);

    expect(value).toBe(`${root}/dotfiles/`);
    expect(candidates).toEqual([]);
  });

  test("completes to the longest common prefix when ambiguous", async () => {
    const { value, candidates } = await completePath(`${root}/do`);

    expect(value).toBe(`${root}/do`);
    expect(candidates).toEqual(["documents", "dot-test", "dotfiles"]);
  });

  test("offers directories only, never files", async () => {
    const { candidates, value } = await completePath(`${root}/dotfile`);

    expect(candidates).toEqual([]);
    // dotfile.txt is a file, so only dotfiles/ can complete
    expect(value).toBe(`${root}/dotfiles/`);
  });

  test("follows a symlink that points at a directory", async () => {
    const { value } = await completePath(`${root}/link`);

    expect(value).toBe(`${root}/linked/`);
  });

  test("hides dotted entries until a dot is typed", async () => {
    const visible = await completePath(`${root}/`);
    expect(visible.candidates).not.toContain(".hidden");

    const hidden = await completePath(`${root}/.`);
    expect(hidden.value).toBe(`${root}/.hidden/`);
  });

  test("leaves the input untouched when nothing matches", async () => {
    const { value, candidates } = await completePath(`${root}/zzz`);

    expect(value).toBe(`${root}/zzz`);
    expect(candidates).toEqual([]);
  });

  test("does not throw on an unreadable directory", async () => {
    const { value } = await completePath("/definitely/not/here/x");

    expect(value).toBe("/definitely/not/here/x");
  });
});
