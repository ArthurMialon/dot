import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAIN = join(import.meta.dir, "..", "src", "main.ts");

const runCli = async (args: string[], home: string) => {
  const proc = Bun.spawn(["bun", "run", MAIN, ...args], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, HOME: home, DOT_VERSION: undefined, NO_COLOR: "1" },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  return { code: await proc.exited, stdout, stderr };
};

const emptyHome = () => mkdtemp(join(tmpdir(), "dot-compl-empty-"));

const populatedHome = async (manifest?: string): Promise<string> => {
  const home = await mkdtemp(join(tmpdir(), "dot-compl-"));
  const repo = join(home, "dotfiles");

  for (const pkg of ["git", "zsh", "brew"]) {
    await mkdir(join(repo, pkg), { recursive: true });
    await writeFile(join(repo, pkg, `.${pkg}rc`), `${pkg}\n`);
  }

  await writeFile(
    join(repo, "dot.json"),
    manifest ??
      JSON.stringify({
        version: 1,
        common: ["git", "zsh"],
        profiles: {
          macbook: { packages: ["brew"] },
          macmini: { packages: [] },
        },
      }),
  );

  await mkdir(join(home, ".dot"), { recursive: true });
  await writeFile(
    join(home, ".dot", "config"),
    JSON.stringify({
      initialized: true,
      repo,
      target: home,
      configPath: join(home, ".dot", "config"),
      configDirectory: join(home, ".dot"),
    }),
  );

  return home;
};

describe("completion scripts", () => {
  test("zsh script registers the completion", async () => {
    const { code, stdout } = await runCli(
      ["completion", "zsh"],
      await emptyHome(),
    );

    expect(code).toBe(0);
    expect(stdout).toContain("compdef _dot dot");
    expect(stdout).toContain("__complete packages");
  });

  test("bash script registers the completion", async () => {
    const { code, stdout } = await runCli(
      ["completion", "bash"],
      await emptyHome(),
    );

    expect(code).toBe(0);
    expect(stdout).toContain("complete -F _dot_completion dot");
  });

  test("an unsupported shell fails loudly", async () => {
    const { code, stdout } = await runCli(
      ["completion", "fish"],
      await emptyHome(),
    );

    expect(code).toBe(1);
    expect(stdout).toContain("Unsupported shell");
  });
});

describe("__complete", () => {
  test("lists commands without needing any config", async () => {
    const { code, stdout } = await runCli(
      ["__complete", "commands"],
      await emptyHome(),
    );

    expect(code).toBe(0);
    expect(stdout.split("\n")).toContain("link");
    expect(stdout.split("\n")).toContain("profile");
    // The helper itself must never be offered.
    expect(stdout).not.toContain("__complete");
  });

  test("lists packages and profiles", async () => {
    const home = await populatedHome();

    const packages = await runCli(["__complete", "packages"], home);
    expect(packages.stdout.trim().split("\n").sort()).toEqual([
      "brew",
      "git",
      "zsh",
    ]);

    const profiles = await runCli(["__complete", "profiles"], home);
    expect(profiles.stdout.trim().split("\n")).toEqual(["macbook", "macmini"]);
  });

  // Runs on every Tab press: any noise here lands in the user's prompt.
  test("stays silent and exits 0 when nothing is initialised", async () => {
    const home = await emptyHome();

    for (const what of ["packages", "profiles"]) {
      const { code, stdout, stderr } = await runCli(["__complete", what], home);

      expect(code).toBe(0);
      expect(stdout.trim()).toBe("");
      expect(stderr.trim()).toBe("");
    }
  });

  test("stays silent when dot.json is malformed", async () => {
    const home = await populatedHome("{ this is not json");

    const { code, stdout, stderr } = await runCli(
      ["__complete", "profiles"],
      home,
    );

    expect(code).toBe(0);
    expect(stdout.trim()).toBe("");
    expect(stderr.trim()).toBe("");
  });

  test("is hidden from the help output", async () => {
    const { stdout } = await runCli(["--help"], await emptyHome());

    expect(stdout).toContain("completion");
    expect(stdout).not.toContain("__complete");
  });
});
