import { FlagLoaderType } from "/types.d.ts";

export const boolean: FlagLoaderType<boolean> = () => {
  return (): boolean => Boolean(true);
};

function getter<T>(arg: T): T {
  return arg;
}

export const string = () => {
  return () => "";
};

export const number: FlagLoaderType<number> = () => {
  return (): number => Number();
};
