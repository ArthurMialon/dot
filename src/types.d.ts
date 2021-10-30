export interface Arguments {
  from: string;
  to: string;
  body: string;
  sid: string;
  apikey: string;
  secret: string;
}

export interface Command {
  name: string;

  aliases?: string[];

  arguments: Arguments;
  run: (args: Arguments) => any | Promise<any>;
}
