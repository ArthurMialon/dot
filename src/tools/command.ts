import { Command } from "commander";

import { closest } from "./text";

/**
 * Report a mistyped subcommand the way commander does for a command group that
 * has no action of its own, suggestion included. Exits the process.
 */
const unknownCommand = (command: Command, name: string): never => {
  const candidates = command
    .createHelp()
    .visibleCommands(command)
    .flatMap((sub) => (sub.alias() ? [sub.name(), sub.alias()] : [sub.name()]));

  const suggestion = closest(name, candidates);

  command.error(
    `error: unknown command '${name}'` +
      (suggestion ? `\n(Did you mean ${suggestion}?)` : ""),
    { code: "commander.unknownCommand" },
  );

  // command.error() always exits; this only tells TypeScript so.
  process.exit(1);
};

/**
 * Give a command group (`dot`, `dot profile`, …) the action it runs when invoked
 * bare, while still reporting a name it does not know as an unknown command.
 *
 * Commander only reports "unknown command" for a group with no action of its
 * own, so a group that has one used to receive the mistyped name as a stray
 * argument and complain about the count rather than the name:
 *
 *     $ dot profiles
 *     error: too many arguments. Expected 0 arguments but got 1: profiles.
 *
 * Excess arguments are accepted at parse time so the action can report them
 * itself. Call this after the group's subcommands are registered, so the
 * suggestion can see them.
 */
export const groupAction = (
  command: Command,
  run: () => void | Promise<void>,
): Command =>
  command
    .allowExcessArguments()
    .showHelpAfterError()
    .action((_options, self: Command) => {
      const [name] = self.args;

      if (name !== undefined) unknownCommand(self, name);

      return run();
    });
