import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAIN = join(import.meta.dir, "..", "src", "main.ts");

// Ctrl+C can only be delivered to a prompt through a terminal, and Bun has no
// pty API, so the test drives one with python3 and skips where it is absent.
const python = Bun.which("python3");

const DRIVER = `
import os, pty, select, sys, time

home, main = sys.argv[1], sys.argv[2]
pid, fd = pty.fork()
if pid == 0:
    os.environ["HOME"] = home
    os.environ["NO_COLOR"] = "1"
    os.execvp("bun", ["bun", "run", main, "link"])

out, deadline, sent = b"", time.time() + 25, False
while time.time() < deadline:
    ready, _, _ = select.select([fd], [], [], 0.5)
    if ready:
        try:
            chunk = os.read(fd, 4096)
        except OSError:
            break
        if not chunk:
            break
        out += chunk
    elif not sent:
        os.write(fd, b"\\x03")   # Ctrl+C
        sent = True
    else:
        time.sleep(0.5)
        break

_, status = os.waitpid(pid, 0)
sys.stdout.write(out.decode(errors="replace"))
sys.stdout.write("\\n__EXIT__" + str(os.waitstatus_to_exitcode(status)))
`;

const interruptAtPrompt = async (home: string) => {
  const proc = Bun.spawn([python!, "-c", DRIVER, home, MAIN], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  const [text, exit] = output.split("__EXIT__");

  return { text: text ?? "", exitCode: Number((exit ?? "").trim()) };
};

const homeWithPackage = async (): Promise<string> => {
  const home = await mkdtemp(join(tmpdir(), "dot-interrupt-"));
  const repo = join(home, "dotfiles");

  await mkdir(join(repo, "zsh"), { recursive: true });
  await writeFile(join(repo, "zsh", ".zshrc"), "export ZSH=1\n");

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

describe.skipIf(!python)("Ctrl+C at a prompt", () => {
  test("exits cleanly with 130 and no stack trace", async () => {
    const { text, exitCode } = await interruptAtPrompt(await homeWithPackage());

    expect(text).toContain("Aborted.");

    // The regression: an unhandled ExitPromptError printed inquirer internals
    // and a Bun version banner.
    expect(text).not.toContain("ExitPromptError");
    expect(text).not.toContain("at createPrompt");
    expect(text).not.toMatch(/Bun v\d/);

    // 128 + SIGINT, so a cancelled run is not mistaken for success.
    expect(exitCode).toBe(130);
  }, 40_000);
});
