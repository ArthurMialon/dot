import { Command } from "commander";
import Dot from "../dot";
import * as config from "../tools/config";
import * as packages from "../tools/packages";
import * as log from "../tools/logging";
import { listProfileNames } from "../tools/profiles";

const ZSH_SCRIPT = `#compdef ${Dot.bin}

_${Dot.bin}() {
  local -a candidates
  local previous="\${words[CURRENT-1]}"

  if [[ "$previous" == "-p" || "$previous" == "--profile" ]]; then
    candidates=(\${(f)"$(${Dot.bin} __complete profiles 2>/dev/null)"})
  elif (( CURRENT == 2 )); then
    candidates=(\${(f)"$(${Dot.bin} __complete commands 2>/dev/null)"})
  else
    case "\${words[2]}" in
      link|l|unlink|u|remove|edit|open)
        candidates=(\${(f)"$(${Dot.bin} __complete packages 2>/dev/null)"}) ;;
      profile)
        if (( CURRENT == 3 )); then
          candidates=(list use add remove init)
        elif [[ "\${words[3]}" == "use" ]]; then
          candidates=(\${(f)"$(${Dot.bin} __complete profiles 2>/dev/null)"})
        elif [[ "\${words[3]}" == "add" || "\${words[3]}" == "remove" ]]; then
          candidates=(\${(f)"$(${Dot.bin} __complete packages 2>/dev/null)"})
        fi ;;
      remote)     (( CURRENT == 3 )) && candidates=(set branch) ;;
      config)     (( CURRENT == 3 )) && candidates=(edit) ;;
      completion) (( CURRENT == 3 )) && candidates=(zsh bash) ;;
    esac
  fi

  (( \${#candidates} )) && compadd -- $candidates
}

compdef _${Dot.bin} ${Dot.bin}
`;

const BASH_SCRIPT = `_${Dot.bin}_completion() {
  local current previous candidates
  COMPREPLY=()
  current="\${COMP_WORDS[COMP_CWORD]}"
  previous="\${COMP_WORDS[COMP_CWORD-1]}"
  candidates=""

  if [[ "$previous" == "-p" || "$previous" == "--profile" ]]; then
    candidates="$(${Dot.bin} __complete profiles 2>/dev/null)"
  elif (( COMP_CWORD == 1 )); then
    candidates="$(${Dot.bin} __complete commands 2>/dev/null)"
  else
    case "\${COMP_WORDS[1]}" in
      link|l|unlink|u|remove|edit|open)
        candidates="$(${Dot.bin} __complete packages 2>/dev/null)" ;;
      profile)
        if (( COMP_CWORD == 2 )); then
          candidates="list use add remove init"
        elif [[ "\${COMP_WORDS[2]}" == "use" ]]; then
          candidates="$(${Dot.bin} __complete profiles 2>/dev/null)"
        elif [[ "\${COMP_WORDS[2]}" == "add" || "\${COMP_WORDS[2]}" == "remove" ]]; then
          candidates="$(${Dot.bin} __complete packages 2>/dev/null)"
        fi ;;
      remote)     (( COMP_CWORD == 2 )) && candidates="set branch" ;;
      config)     (( COMP_CWORD == 2 )) && candidates="edit" ;;
      completion) (( COMP_CWORD == 2 )) && candidates="zsh bash" ;;
    esac
  fi

  COMPREPLY=( $(compgen -W "$candidates" -- "$current") )
}

complete -F _${Dot.bin}_completion ${Dot.bin}
`;

export const runCompletion = (shell: string): void => {
  if (shell === "zsh") return log.info(ZSH_SCRIPT);
  if (shell === "bash") return log.info(BASH_SCRIPT);

  log.error(`Unsupported shell "${shell}". Supported: zsh, bash.`);
  process.exit(1);
};

/**
 * Feeds the completion scripts. Runs on every Tab press, so it must stay quiet
 * and quick: any problem (no config, missing repo, invalid dot.json) prints
 * nothing and still exits 0, otherwise error text lands in the user's prompt.
 */
export const runComplete = async (
  what: string,
  commandNames: string[],
): Promise<void> => {
  try {
    if (what === "commands") {
      log.info(commandNames.join("\n"));
      return;
    }

    const configuration = await config.get({ safe: true });

    if (!configuration.initialized) return;

    if (what === "packages") {
      const names = await packages.listPackageNames(configuration.repo);
      if (names.length) log.info(names.join("\n"));
      return;
    }

    if (what === "profiles") {
      const names = await listProfileNames(configuration.repo);
      if (names.length) log.info(names.join("\n"));
    }
  } catch {
    // Deliberately silent.
  }
};

export const completionCommand = new Command("completion")
  .description("Print the shell completion script")
  .argument("<shell>", "zsh or bash")
  .addHelpText(
    "after",
    `\nAdd to your shell rc:\n  eval "$(${Dot.bin} completion zsh)"`,
  )
  .action((shell: string) => runCompletion(shell));

export const completeCommand = new Command("__complete")
  .description("Internal: list completion candidates")
  .argument("<what>", "commands, packages or profiles")
  .action(async (what: string, _options: unknown, command: Command) => {
    const names = (command.parent?.commands ?? [])
      .map((cmd) => cmd.name())
      .filter((name) => !name.startsWith("__"));

    await runComplete(what, names);
  });
