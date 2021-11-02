import yargs from "yargs";

import { Arguments, Command } from "/types.d.ts";

import { findCommand } from '/core/command.ts'
import { Install } from '/commands/install.ts'

const commands: Command[] = [Install];

async function main(args: string[]) {
  let inputArgs: Arguments = yargs(args).argv

  const command = inputArgs["_"][0];

  const foundCommand = findCommand(commands, command)

  if (!foundCommand) {
    return console.log(`Command ${command} not found`)
  }

  const load = foundCommand.flags.target()

  const target = load({})

  console.log(target)
}

main(Deno.args);
