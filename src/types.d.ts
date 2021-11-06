export interface Arguments {
  [key: string]: any
}

type Getter = <T>() => T;

type FlagLoader = <T>() => T;

type FlagLoaderType<T> = () => () => T;

export interface Command {
  name: string;

  aliases?: string[];

  flags: { [key: string]: () => any };
  run: (args?: Arguments) => any | Promise<any>;
}
