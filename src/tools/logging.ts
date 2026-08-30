import pc from "picocolors";

export const success = (...messages: unknown[]): void =>
  console.log(messages.map((x) => pc.green(String(x))).join(" "));

export const error = (...messages: unknown[]): void =>
  console.log(messages.map((x) => pc.red(String(x))).join(" "));

export const info = (...messages: unknown[]): void => console.log(...messages);

export const bold = pc.bold;
export const blue = pc.blue;
export const dim = pc.dim;
export const yellow = pc.yellow;
