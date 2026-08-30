import { readdir, stat } from "node:fs/promises";
import {
  createPrompt,
  isBackspaceKey,
  isEnterKey,
  isTabKey,
  makeTheme,
  useEffect,
  useKeypress,
  usePrefix,
  useState,
  type Theme,
} from "@inquirer/core";
import type { PartialDeep } from "@inquirer/type";
import { PathExpansionError, expandPath } from "../tools/fs";
import { isInteractive } from "../tools/prompt";
import * as log from "../tools/logging";
import { dim } from "../tools/logging";

export interface PathPromptConfig {
  message: string;
  default?: string;
  /** Receives the expanded path. Return true, or an error message. */
  validate?: (value: string) => boolean | string | Promise<boolean | string>;
  hint?: string;
  theme?: PartialDeep<Theme>;
}

const longestCommonPrefix = (values: string[]): string => {
  if (values.length === 0) return "";

  let prefix = values[0];

  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }

  return prefix;
};

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    // stat, not lstat: a symlink pointing at a directory is still a directory
    // worth offering, and dotfiles trees are full of them.
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
};

interface Completion {
  value: string;
  candidates: string[];
}

/**
 * Shell-style completion over directories. Splits the input into the directory
 * being listed and the fragment being completed, so `~/dot` lists `~` for
 * entries starting with `dot`.
 */
export const completePath = async (input: string): Promise<Completion> => {
  const cut = input.lastIndexOf("/");
  const dirPart = cut === -1 ? "" : input.slice(0, cut + 1);
  const fragment = input.slice(dirPart.length);

  let searchDir: string;

  try {
    searchDir = expandPath(dirPart === "" ? "." : dirPart);
  } catch {
    return { value: input, candidates: [] };
  }

  let entries;

  try {
    entries = await readdir(searchDir, { withFileTypes: true });
  } catch {
    return { value: input, candidates: [] };
  }

  // Hidden entries only once the user has shown interest by typing a dot.
  const showHidden = fragment.startsWith(".");

  const matching = entries
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(fragment))
    .filter((name) => showHidden || !name.startsWith("."))
    .sort();

  const directories: string[] = [];

  for (const name of matching) {
    if (await isDirectory(`${searchDir.replace(/\/$/, "")}/${name}`)) {
      directories.push(name);
    }
  }

  if (directories.length === 0) return { value: input, candidates: [] };

  // A single match completes all the way and adds the separator, so repeated
  // Tab walks down the tree.
  if (directories.length === 1) {
    return { value: `${dirPart}${directories[0]}/`, candidates: [] };
  }

  return {
    value: `${dirPart}${longestCommonPrefix(directories)}`,
    candidates: directories,
  };
};

const MAX_CANDIDATES = 24;

const renderCandidates = (candidates: string[]): string => {
  if (candidates.length === 0) return "";

  const shown = candidates.slice(0, MAX_CANDIDATES);
  const rest = candidates.length - shown.length;

  return dim(
    `  ${shown.map((name) => `${name}/`).join("   ")}${rest > 0 ? `   … and ${rest} more` : ""}`,
  );
};

const pathPrompt = createPrompt<string, PathPromptConfig>((config, done) => {
  const theme = makeTheme(config.theme);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [value, setValue] = useState("");
  const [errorMsg, setError] = useState<string | undefined>();
  const [candidates, setCandidates] = useState<string[]>([]);
  const prefix = usePrefix({ status, theme });

  const validate = async (input: string): Promise<true | string> => {
    let expanded: string;

    try {
      expanded = expandPath(input);
    } catch (error) {
      return error instanceof PathExpansionError
        ? error.message
        : "This path cannot be resolved";
    }

    if (!config.validate) return true;

    const result = await config.validate(expanded);

    return result === true ? true : result || "This path is not valid";
  };

  useKeypress(async (key, rl) => {
    if (status !== "idle") return;

    if (isEnterKey(key)) {
      const answer = value.trim();

      setStatus("loading");

      const isValid = await validate(answer);

      if (isValid === true) {
        setStatus("done");
        done(expandPath(answer));
        return;
      }

      // Put the text back so the user can fix it instead of retyping it.
      rl.write(answer);
      setError(isValid);
      setStatus("idle");
      return;
    }

    if (isTabKey(key)) {
      rl.clearLine(0); // drop the literal tab readline just inserted

      const completion = await completePath(value);

      rl.write(completion.value);
      setValue(completion.value);
      setCandidates(completion.candidates);
      setError(undefined);
      return;
    }

    if (isBackspaceKey(key)) {
      setValue(rl.line);
      setCandidates([]);
      setError(undefined);
      return;
    }

    setValue(rl.line);
    setCandidates([]);
    setError(undefined);
  });

  // Prefill the default so Tab is useful from the first keystroke and Enter
  // still accepts it unchanged.
  useEffect((rl) => {
    if (config.default) {
      rl.write(config.default);
      setValue(config.default);
    }
  }, []);

  const message = theme.style.message(config.message, status);

  const rendered = status === "done" ? theme.style.answer(value) : value;

  const below = errorMsg
    ? theme.style.error(errorMsg)
    : renderCandidates(candidates);

  return [`${prefix} ${message} ${rendered}`, below];
});

/** Path input with Tab completion. Falls back to the default without a TTY. */
export const pathInput = async (config: PathPromptConfig): Promise<string> => {
  if (!isInteractive()) {
    if (config.default !== undefined) return expandPath(config.default);

    log.error(`Cannot ask: ${config.message}`);
    log.info("No interactive terminal available.");
    if (config.hint) log.info(config.hint);
    process.exit(1);
  }

  return pathPrompt(config);
};

export default pathInput;
