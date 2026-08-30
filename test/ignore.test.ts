import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { IgnoreFile } from "../src/tools/ignore";

const roots: string[] = [];

const ignoreFileWith = async (content?: string): Promise<IgnoreFile> => {
  const root = await mkdtemp(join(tmpdir(), "dot-ignore-"));
  roots.push(root);

  const path = join(root, ".dotignore");

  if (content !== undefined) await writeFile(path, content);

  return new IgnoreFile(path);
};

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((r) => rm(r, { recursive: true, force: true })),
  );
});

describe("IgnoreFile", () => {
  test("always ignores .git and the ignore file itself", async () => {
    const ignore = await ignoreFileWith();

    expect(await ignore.ignore(".git")).toBe(true);
    expect(await ignore.ignore(".dotignore")).toBe(true);
    expect(await ignore.ignore(".zshrc")).toBe(false);
  });

  test("matches glob patterns", async () => {
    const ignore = await ignoreFileWith("*.md\n");

    expect(await ignore.ignore("README.md")).toBe(true);
    expect(await ignore.ignore("readme.txt")).toBe(false);
  });

  test("matches directory patterns", async () => {
    const ignore = await ignoreFileWith("scripts/\n");

    expect(await ignore.ignore("scripts")).toBe(true);
    expect(await ignore.ignore("src")).toBe(false);
  });

  test("skips comments and blank lines", async () => {
    const ignore = await ignoreFileWith("# a comment\n\n*.log\n");

    expect(await ignore.ignore("comment")).toBe(false);
    expect(await ignore.ignore("debug.log")).toBe(true);
  });

  test("honours negation, last match wins", async () => {
    const ignore = await ignoreFileWith("*.md\n!keep.md\n");

    expect(await ignore.ignore("README.md")).toBe(true);
    expect(await ignore.ignore("keep.md")).toBe(false);
  });

  test("supports the ? wildcard", async () => {
    const ignore = await ignoreFileWith("f?o\n");

    expect(await ignore.ignore("foo")).toBe(true);
    expect(await ignore.ignore("fo")).toBe(false);
  });

  // Regression: the constructor used to return a process-wide singleton, so the
  // first path ever constructed won for every later instance.
  test("two instances keep their own patterns", async () => {
    const a = await ignoreFileWith("*.md\n");
    const b = await ignoreFileWith("*.log\n");

    expect(await a.ignore("README.md")).toBe(true);
    expect(await a.ignore("debug.log")).toBe(false);

    expect(await b.ignore("debug.log")).toBe(true);
    expect(await b.ignore("README.md")).toBe(false);
  });
});
