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

/** A HOME whose dotfiles repository declares three machine profiles. */
const profiledHome = async (activeProfile?: string): Promise<string> => {
  const home = await mkdtemp(join(tmpdir(), "dot-cli-profile-"));
  const repo = join(home, "dotfiles");

  for (const pkg of ["git", "zsh", "brew", "docker"]) {
    await mkdir(join(repo, pkg), { recursive: true });
    await writeFile(join(repo, pkg, `.${pkg}rc`), `${pkg}\n`);
  }

  await writeFile(
    join(repo, "dot.json"),
    JSON.stringify(
      {
        version: 1,
        common: ["git", "zsh"],
        profiles: {
          macbook: { packages: ["brew"] },
          raspberrypi: { packages: ["docker"] },
        },
      },
      null,
      2,
    ),
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
      ...(activeProfile ? { profile: activeProfile } : {}),
    }),
  );

  return home;
};

const linked = async (home: string, name: string): Promise<boolean> =>
  Bun.file(join(home, name)).exists();

describe("profiles", () => {
  test("links only the packages of the active profile", async () => {
    const home = await profiledHome("raspberrypi");

    const { code } = await runCli(["link", "-f"], home);

    expect(code).toBe(0);
    expect(await linked(home, ".gitrc")).toBe(true);
    expect(await linked(home, ".zshrc")).toBe(true);
    expect(await linked(home, ".dockerrc")).toBe(true);
    expect(await linked(home, ".brewrc")).toBe(false);
  });

  test("switching profiles removes the links left by the previous one", async () => {
    const home = await profiledHome();

    await runCli(["profile", "use", "macbook", "-f"], home);
    expect(await linked(home, ".brewrc")).toBe(true);

    await runCli(["profile", "use", "raspberrypi", "-f"], home);

    expect(await linked(home, ".brewrc")).toBe(false);
    expect(await linked(home, ".dockerrc")).toBe(true);
    expect(await linked(home, ".gitrc")).toBe(true);
  });

  test("--dry-run changes nothing", async () => {
    const home = await profiledHome("macbook");

    const { stdout } = await runCli(
      ["profile", "use", "raspberrypi", "--dry-run"],
      home,
    );

    expect(stdout).toContain("Dry run");
    expect(await linked(home, ".dockerrc")).toBe(false);
  });

  // Out-of-profile and non-existent are different problems; the old code
  // reported both as "No package to link".
  test("refuses a package outside the profile, and says how to proceed", async () => {
    const home = await profiledHome("raspberrypi");

    const { code, stdout } = await runCli(["link", "brew", "-f"], home);

    expect(code).toBe(1);
    expect(stdout).toContain("not part of profile");
    expect(stdout).toContain("--all");
  });

  test("--all links a package outside the profile", async () => {
    const home = await profiledHome("raspberrypi");

    const { code } = await runCli(["link", "brew", "--all", "-f"], home);

    expect(code).toBe(0);
    expect(await linked(home, ".brewrc")).toBe(true);
  });

  test("reports a package that does not exist at all", async () => {
    const home = await profiledHome("raspberrypi");

    const { code, stdout } = await runCli(["link", "nope", "-f"], home);

    expect(code).toBe(1);
    expect(stdout).toContain("does not exist");
  });

  test("suggests a close profile name", async () => {
    const home = await profiledHome();

    const { code, stdout } = await runCli(
      ["profile", "use", "raspberypi", "-f"],
      home,
    );

    expect(code).toBe(1);
    expect(stdout).toContain('Did you mean "raspberrypi"');
  });

  // Every repository without a dot.json must behave exactly as before.
  test("a repository with no dot.json links everything", async () => {
    const home = await initializedHome();

    const { code, stdout } = await runCli(["link", "-f"], home);

    expect(code).toBe(0);
    expect(stdout).not.toContain("Profile:");
    expect(await linked(home, ".zshrc")).toBe(true);
  });

  test("--profile on a repository without dot.json explains why", async () => {
    const home = await initializedHome();

    const { code, stdout } = await runCli(
      ["link", "--profile", "macbook", "-f"],
      home,
    );

    expect(code).toBe(1);
    expect(stdout).toContain("profiles are not configured");
  });
});
