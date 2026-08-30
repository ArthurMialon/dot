import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAIN = join(import.meta.dir, "..", "src", "main.ts");

const runCli = async (args: string[]) => {
  // A throwaway HOME so the real ~/.dot/config is never touched.
  const home = await mkdtemp(join(tmpdir(), "dot-cli-home-"));

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
