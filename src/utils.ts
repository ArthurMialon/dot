export const hasCommand = async (
  command: string,
  args: string = "--version",
): Promise<boolean> => {
  const execute = new Deno.Command(command, {
    args: [args],
  });

  try {
    const { success } = await execute.output();
    return !!success;
  } catch {
    return false;
  }
};

export const copyWithCP = async (
  src: string,
  target: string,
) => {
  if (await (hasCommand("cp"))) {
    console.error("The command cp is not available.");
    Deno.exit(1);
  }

  const execute = new Deno.Command("cp", {
    args: [
      "-rf",
      src,
      target,
    ],
  });

  try {
    const { success } = await execute.output();
    return !!success;
  } catch {
    return false;
  }
};
