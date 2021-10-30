import { parse } from "flags/mod.ts";
import yargs from "yargs";

import { Arguments, Command } from "/types.d.ts";

const commands = [];

async function main(args: string[]) {
  let inputArgs: Arguments = yargs(args)
    .alias("f", "from")
    .alias("t", "to")
    .alias("b", "body")
    .alias("i", "sid")
    .alias("k", "apikey")
    .alias("s", "secret").argv;

  console.log("test");

  const command = "_";
  console.log(inputArgs);
}

main(Deno.args);
