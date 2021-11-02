import { Command } from "/types.d.ts";

/**
 * Load requested commands
 * @param commands
 * @param command
 * @returns
 */
export const findCommand = (
  commands: Command[],
  command: string,
): Command | null => {
  return (
    commands.find((c) => {
      return [c.name, ...(c.aliases || [])].includes(command);
    }) || null
  );
};