import { green, red } from "@std/fmt/colors";

export const success = (...messages: any[]): void =>
  console.log(messages.map((x) => green(x.toString())).join(" "));

export const error = (...messages: any[]): void =>
  console.log(messages.map((x) => red(x.toString())).join(" "));

export const info = (...messages: any[]): void => console.log(...messages);
