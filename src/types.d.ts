export interface Arguments {
  [key: string]: any
}

export interface ArgumentsDefinition {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'list'
  }
}

interface FlagsDefinition {
  [key: string]: Function
}

type FlagLoaderType<T> = (args: Arguments) => T

export interface Command {
  name: string;

  aliases?: string[];

  flags: FlagsDefinition;
  run: (args?: Arguments) => any | Promise<any>;
}
