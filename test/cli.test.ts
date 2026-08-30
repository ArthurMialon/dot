import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAIN = join(import.meta.dir, "..", "src", "main.ts");

const runCli = async (args: string[], home?: string) => {
  // A throwaway HOME so the real ~/.dot/config is never touched.
  home ??= await mkdtemp(join(tmpdir(), "dot-cli-home-"));

  const proc = Bun.spawn(["bun", "run", MAIN, ...args], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, HOME: home, DOT_VERSION: undefined },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  return { code: await proc.exited, stdout, stderr };
};

describe("cli wiring", () => {
  test("--help lists every command", async () => {
    const { code, stdout } = await runCli(["--help"]);

    expect(code).toBe(0);
    for (const name of [
      "init",
      "config",
      "list",
      "edit",
      "link",
      "unlink",
      "upgrade",
      "add",
      "status",
      "pull",
      "push",
    ]) {
      expect(stdout).toContain(name);
    }
  });

  test("--version reports the development version", async () => {
    const { code, stdout } = await runCli(["--version"]);

    expect(code).toBe(0);
    expect(stdout.trim()).toBe("0.0.0-dev");
  });

  test("link --help documents its argument and flags", async () => {
    const { code, stdout } = await runCli(["link", "--help"]);

    expect(code).toBe(0);
    expect(stdout).toContain("[package]");
    expect(stdout).toContain("-f, --force");
    expect(stdout).toContain("-v, --verbose");
  });

  test("aliases are registered", async () => {
    const { stdout } = await runCli(["--help"]);

    expect(stdout).toContain("l");
    expect(stdout).toContain("remove");
  });

  test("an unknown command fails", async () => {
    const { code } = await runCli(["definitely-not-a-command"]);

    expect(code).not.toBe(0);
  });

  test("bare invocation prints help and exits 0", async () => {
    const { code, stdout } = await runCli([]);

    expect(code).toBe(0);
    expect(stdout).toContain("Usage:");
  });
});

/** An initialized HOME with a one-package dotfiles repository. */
const initializedHome = async (): Promise<string> => {
  const home = await mkdtemp(join(tmpdir(), "dot-cli-init-"));

  await mkdir(join(home, "dotfiles", "zsh"), { recursive: true });
  await writeFile(join(home, "dotfiles", "zsh", ".zshrc"), "export ZSH=1\n");

  await mkdir(join(home, ".dot"), { recursive: true });
  await writeFile(
    join(home, ".dot", "config"),
    JSON.stringify({
      initialized: true,
      repo: join(home, "dotfiles"),
      target: home,
      configPath: join(home, ".dot", "config"),
      configDirectory: join(home, ".dot"),
    }),
  );

  return home;
};

describe("non-interactive safety", () => {
  // @inquirer/prompts waits forever on a non-TTY stdin, which would hang any
  // script, cron job or non-interactive SSH session.
  test("link without --force fails instead of hanging", async () => {
    const { code, stdout } = await runCli(["link"], await initializedHome());

    expect(code).toBe(1);
    expect(stdout).toContain("No interactive terminal available");
    expect(stdout).toContain("--force");
  });

  test("link --force works without a terminal", async () => {
    const home = await initializedHome();

    const { code, stdout } = await runCli(["link", "-f"], home);

    expect(code).toBe(0);
    expect(stdout).toContain("package zsh");
    expect(await Bun.file(join(home, ".zshrc")).text()).toBe("export ZSH=1\n");
  });
});
