# Dot.

👉 A CLI to manage your Dotfiles built with [Bun](https://bun.sh/) and
[Commander](https://github.com/tj/commander.js) inspired by
[GNU Stow](https://www.gnu.org/software/stow/)

## Table of Contents

- [Demo](#demo)
- [Installation](#installation)
- [Concepts](#concepts)
  - [Profiles](#profiles)
- [Features](#features)
- [Getting Started](#getting-started)
- [Commands](#commands)
  - [Init](#init)
  - [Link](#link)
  - [Unlink](#unlink)
  - [Profile](#profile)
  - [Remote](#remote)
  - [Config](#config)
  - [Add](#add)
  - [Edit](#edit)
  - [Status](#status)
  - [Push](#push)
  - [Pull](#pull)
  - [Upgrade](#upgrade)
  - [Completion](#completion)
- [Ignore](#ignore-folder-and-files)
- [Upgrading from 0.x](#upgrading-from-0x)
- [Development](#development)

## Demo

https://github.com/user-attachments/assets/f6ea3f99-7115-408a-bc6d-23a0f29378b4

## Installation

`curl -fsSL https://raw.githubusercontent.com/arthurmialon/dot/main/install.sh | sh`

> Linux and macOS, on x64 and arm64. A Raspberry Pi needs a **64-bit** OS.

## Concepts

**Dot CLI automatically creates symlinks for you.**

Setup your own dotfiles repository and manage it with this CLI. You can build a
simple structure with packages and files.

Examples of structure:

```
# Dotfiles repository
├── aws (package)
│   └── .aws
│       ├── cli
│       │   └── alias
│       ├── config
├── brew (package)
│   └── Brewfile
├── git (package)
│   ├── .gitconfig
│   └── .gitignore
├── npm (package)
│   └── .npmrc
├── starship (package)
│   └── .config
│       └── starship.toml
├── vim (package)
│   └── .vimrc
├── zed (package)
│   └── .config
│       └── zed
│           ├── keymap.json
│           └── settings.json
└── zsh (package)
    ├── .config
    │   └── zsh
    │       └── functions.zsh
    └── .zshrc
```

Dot CLI automatically symlinked all files to your `$HOME` directory (or any
directory you want to target). It follows the structure inside each package.

Example for the **ZSH** package:

```bash
# Symlinked files
~/.zshrc -> dotfiles/zsh/.zshrc
~/.config/zsh/functions.zsh -> dotfiles/zsh/.config/zsh/functions.zsh
```

### Profiles

One dotfiles repository, several machines. Declare a `dot.json` at its root:

```json
{
  "version": 1,
  "common": ["git", "zsh", "starship", "vim"],
  "profiles": {
    "macbook": {
      "description": "Work MacBook Pro",
      "packages": ["aws", "brew", "npm", "zed"]
    },
    "macmini": {
      "description": "Home Mac Mini",
      "packages": ["brew", "npm", "zed"]
    },
    "raspberrypi": {
      "description": "Raspberry Pi 5, headless",
      "target": "/home/pi",
      "packages": ["docker"]
    }
  }
}
```

Every profile links the `common` packages **plus** its own, so a package shared
by two machines is written once and listed in both. A profile may set its own
`target`, which is applied when you select it.

Pick one per machine:

```bash
dot init git@github.com:me/dotfiles.git --profile raspberrypi --yes  # at install
dot profile                     # which profile is this machine on?
dot profile list                # every profile and its package count
dot profile use macbook         # switch, unlinking what is no longer needed
dot link --profile macmini      # one-shot, nothing is persisted
dot list --all                  # every package and the profiles it belongs to
```

**No `dot.json`? Nothing changes** — every package is linked, exactly as before.
Create one from what you already have with `dot profile init`.

## Features

- Link all your dotfiles automatically to any directory (default is `$HOME`)
- Target a profile per machine (MacBook, Mac Mini, Raspberry Pi…) so each one
  only links the packages it needs
- Unlink your dotfiles with a simple command so you can easily switch between
  configurations
- Add new files or folders to your dotfiles from a local directory
- Remember your remote and branch so `push` and `pull` always use the right one
- Quickly open your editor to edit your dotfiles

## Getting Started

**Remote repository:**

```bash
dot init git@github.com:<USERNAME>/dotfiles.git
```

It is cloned into `~/dotfiles` (override with `--path`).

**Local repository**

```bash
dot init
```

`dot init` sets up the **dotfiles location** and the **target** (default:
`$HOME`), records the remote and branch, and — when the repository has a
`dot.json` — asks which profile this machine is.

Path prompts complete with **Tab** and understand `~` and `$VAR`.

## Commands

You can use the `--help` flag everywhere to get more information about the
command.

---

### Init

Basic setup. Asks you to set locations to your dotfiles and the target location.

```bash
dot init
```

**With arguments:** clone your dotfiles repository and link its packages.

```bash
dot init git@github.com:ArthurMialon/dotfiles.git
```

**Options:**

- `--path <dir>` clone destination (default: `~/dotfiles`)
- `-b, --branch <name>` branch to clone and record
- `-p, --profile <name>` profile to activate, skipping the prompt
- `-t, --target <path>` symlink target, skipping the prompt
- `-y, --yes` accept the defaults without prompting

Unattended install, for a headless machine:

```bash
dot init git@github.com:me/dotfiles.git --profile raspberrypi --yes
```

---

### Link

Link the packages of your active profile to your `$HOME` directory (can be
changed with the configuration).

**Basic:**

```bash
dot link
```

**Aliases:** `dot l`

**Options:**

- `-v, --verbose` show more information about the process
- `-f, --force` skip the prompt
- `-p, --profile <name>` use a specific profile for this run
- `--all` ignore profile filtering
- `--prune` unlink packages outside the selection first

**With arguments:** link only a specific package.

```bash
dot link zsh
```

---

### Unlink

Since `dot link` creates symlinks for your packages, you can use `dot unlink`
to remove them.

```bash
dot unlink
```

**Aliases:** `dot u`, `dot remove`

**Options:** `-v, --verbose`, `-f, --force`, `-p, --profile <name>`, `--all`

> `unlink` only ever removes symlinks that point into your dotfiles repository.
> A real file, or a symlink managed by something else, is reported and left
> alone.

---

### Profile

```bash
dot profile                    # the active profile and its packages
dot profile list               # every profile declared in dot.json
dot profile use <name>         # switch profile and relink
dot profile add <package>      # record a package in a profile
dot profile remove <package>   # remove a package from a profile
dot profile init               # create dot.json from the packages on disk
```

`dot profile use` prints what it will link and unlink before doing anything.
Use `--dry-run` to stop there, `-f` to skip the confirmation, and
`--no-unlink` to keep the links from the previous profile.

`profile add` and `profile remove` accept `-p, --profile <name>` or `--common`.

---

### Remote

```bash
dot remote                              # configured remote and branch
dot remote set <url> [-b <branch>]      # update git origin and remember it
dot remote branch <name>                # change the branch push/pull use
```

`push` and `pull` use the configured branch when there is one, otherwise the
branch you have checked out. If the two differ, `push` warns before continuing,
because pushing the configured branch would not include your current work.

---

### Config

Show the current configuration.

```bash
dot config
```

Edit it (dotfiles location and target).

```bash
dot config edit
```

The configuration lives in `~/.dot/config`:

```json
{
  "initialized": true,
  "repo": "/home/pi/dotfiles",
  "target": "/home/pi",
  "profile": "raspberrypi",
  "remote": "git@github.com:arthurmialon/dotfiles.git",
  "branch": "main"
}
```

---

### Add

Add new files or folders to your dotfiles. It copies them into a package and
updates the symlink.

```bash
dot add .              # the current folder
dot add . zsh          # into a specific package (created if missing)
dot add .zshrc zsh
```

**Options:** `-f, --force`, `-p, --profile <name>`, `--common`, `--no-profile`

When the repository has a `dot.json`, a brand new package is recorded in a
profile, otherwise it would be created and then never linked.

---

### Edit

Open the dotfiles repository in your default editor.

```bash
dot edit
dot edit zsh       # open a single package
```

**Aliases:** `dot open`

---

### Status

Check the status of your dotfiles repository.

```bash
dot status
```

---

### Push

Push updates to your remote dotfiles repository.

```bash
dot push
```

---

### Pull

Pull updates from your remote dotfiles repository and link the files.

```bash
dot pull
```

---

### Upgrade

```bash
dot upgrade
```

---

### Completion

Shell completion for sub-commands, package names and profile names.

```bash
# zsh — add to ~/.zshrc
eval "$(dot completion zsh)"

# bash — add to ~/.bashrc
eval "$(dot completion bash)"
```

```
$ dot link <TAB>
brew   docker   git   nvim   zsh

$ dot profile use <TAB>
macbook   macmini   raspberrypi
```

Package and profile names are read from your repository as you press Tab, so
they stay current without regenerating anything.

---

## Ignore folder and files

Create a `.dotignore` file to avoid linking some files or folders. It follows
the same rules as `.gitignore`. By default it always ignores the `.git` folder
and the `.dotignore` file.

```text
# Example

# Ignore all files with the extension .md
*.md

# Ignore the script
scripts/
```

`dot.json` at the repository root is a manifest, not a package, so it is never
linked.

## Upgrading from 0.x

- `dot init <url>` now clones into `~/dotfiles` instead of the current working
  directory. Pass `--path ./dotfiles` for the old behaviour.
- `dot unlink` no longer deletes a real file that sits where a symlink was
  expected. It reports it and moves on.
- Prompts fail with an explanation instead of hanging when there is no terminal,
  so `--force` / `--yes` are required in scripts and cron jobs.
- Ctrl+C at a prompt now prints `Aborted.` and exits 130 instead of a stack
  trace.
- Everything else is unchanged: `~/.dot/config` keeps its format and gains three
  optional keys, and a repository without `dot.json` behaves exactly as before.

## Development

Requires [Bun](https://bun.sh/).

```bash
bun install
bun run dev --help     # run from source
bun test               # test suite
bun run typecheck      # tsc --noEmit
bun run lint           # eslint
bun run format         # prettier

# compile a binary for the current platform
COMPILE_TARGET=bun-linux-x64 COMPILE_NAME=dot-linux-x64 bun run build
```

Releases are built by GitHub Actions for `darwin-arm64`, `darwin-x64`,
`linux-x64` and `linux-arm64`, and published as GitHub Release binaries that
`install.sh` and `dot upgrade` download.
