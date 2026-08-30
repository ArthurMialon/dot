import {
  confirm as inquirerConfirm,
  input as inquirerInput,
  select as inquirerSelect,
} from "@inquirer/prompts";
import * as log from "./logging";

/**
 * @inquirer/prompts waits forever when stdin is not a TTY, so a prompt reached
 * from a script, a cron job or a non-interactive SSH session would hang instead
 * of failing. Every prompt goes through these wrappers, which refuse to guess
 * and tell the user which flag would have avoided the question.
 */
export const isInteractive = (): boolean =>
  Boolean(process.stdin.isTTY && process.stdout.isTTY);

const bail = (message: string, hint?: string): never => {
  log.error(message);
  log.info("No interactive terminal available.");
  if (hint) log.info(hint);
  process.exit(1);
};

export interface ConfirmOptions {
  message: string;
  default?: boolean;
  /** What the user should pass to answer this without a prompt. */
  hint?: string;
}

export const confirm = async (options: ConfirmOptions): Promise<boolean> => {
  if (!isInteractive()) {
    return bail(`Cannot ask: ${options.message}`, options.hint);
  }

  return inquirerConfirm({
    message: options.message,
    default: options.default ?? false,
  });
};

export interface InputOptions {
  message: string;
  default?: string;
  validate?: (value: string) => boolean | string | Promise<boolean | string>;
  hint?: string;
}

export const input = async (options: InputOptions): Promise<string> => {
  if (!isInteractive()) {
    // A default is a complete answer; anything else needs a human.
    if (options.default !== undefined) return options.default;

    return bail(`Cannot ask: ${options.message}`, options.hint);
  }

  return inquirerInput({
    message: options.message,
    default: options.default,
    validate: options.validate,
  });
};

export interface SelectOptions<T> {
  message: string;
  choices: { name: string; value: T; description?: string }[];
  default?: T;
  hint?: string;
}

export const select = async <T>(options: SelectOptions<T>): Promise<T> => {
  if (!isInteractive()) {
    return bail(`Cannot ask: ${options.message}`, options.hint);
  }

  return inquirerSelect({
    message: options.message,
    choices: options.choices,
    default: options.default,
  });
};
