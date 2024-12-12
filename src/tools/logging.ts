import { green, red } from "@std/fmt/colors";

// deno-lint-ignore no-explicit-any
export const success = (...messages: any[]): void =>
  console.log(messages.map((x) => green(x.toString())).join(" "));

// deno-lint-ignore no-explicit-any
export const error = (...messages: any[]): void =>
  console.log(messages.map((x) => red(x.toString())).join(" "));

// deno-lint-ignore no-explicit-any
export const info = (...messages: any[]): void => console.log(...messages);
