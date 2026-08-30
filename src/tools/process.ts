export interface ExecResult {
  ok: boolean;
  code: number;
}

export interface CaptureResult extends ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Run a command with the terminal's stdio. Use whenever the user should see the
 * output live, or the child may need the TTY (git credentials, sudo, editors).
 */
export const exec = async (command: string[]): Promise<ExecResult> => {
  const proc = Bun.spawn(command, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const code = await proc.exited;

  return { ok: code === 0, code };
};

/** Run a command and capture its output. */
export const capture = async (command: string[]): Promise<CaptureResult> => {
  const proc = Bun.spawn(command, {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const code = await proc.exited;

  return { ok: code === 0, code, stdout, stderr };
};
