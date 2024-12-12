# Dot.

👉 A CLI to manage your Dotfiles built with [Deno 2](https://deno.com/) and
[Cliffy](https://cliffy.io/) inspired by
[GNU Stow](https://www.gnu.org/software/stow/)

## Install

`curl -fsSL https://raw.githubusercontent.com/arthurmialon/dot/main/install.sh | bash`

## Concepts

**Dot CLI automatically creates symlinks for you.**

Setup your own dotfiles repository and manage it with this CLI. You can build a
simple structure with packages and files.

Examples of structure:

```
# Dotfiles repository
├── aws (package)
│   └── .aws
│       ├── cli
│       │   └── alias
│       ├── config
│       └── credentials
├── brew (package)
│   └── Brewfile
├── git (package)
│   ├── .gitconfig
│   └── .gitignore
├── npm (package)
│   └── .npmrc
├── starship (package)
│   └── .config
│       └── starship.toml
├── vim (package)
│   └── .vimrc
├── zed (package)
│   └── .config
│       └── zed
│           ├── keymap.json
│           └── settings.json
└── zsh (package)
    ├── .config
    │   └── zsh
    │       └── functions.zsh
    └── .zshrc
```

With `dot link` the files are automatically symlinked to your `$HOME` directory
(or any directory you want to target). It follows the structure inside each
package.

Example for the **ZSH** package:

```shell
# Symlinked files
~/.zshrc -> dotfiles/zsh/.zshrc
~/.config/zsh/functions.zsh -> dotfiles/zsh/.config/zsh/functions.zsh
```

## Features

- Link all your dotfiles automatically to any directory (default is `$HOME`)
- Unlink your dotfiles with a simple command so you can easily switch between
  configurations
- Add new files or folders to your dotfiles from local directory
- Quickly open editor to edit your dotfiles

## Getting Started

Run `dot init` to setup your **dotfiles location** and the **target** (default:
`$HOME`).

The Dot CLI will ask you to set the paths to your dotfiles repository and the
target directory. Then it reads the packages and files from your dotfiles
repository and link them to the target directory.

## Commands

You can use the `--help` flag everywhere to get more information about the
command.

### Init

Basic setup. Ask you to set locations to your dotfiles and the target location.

```shell
$ dot init
```

**With arguments:** Clone your dotfiles repository and link all packages.

```shell
$ dot init git@github.com:ArthurMialon/dotfiles.git
```

Or use the local directory.

```shell
$ dot init ./
```

### Link

Link all packages to your `$HOME` directory (can be update with configuration).

**Basic:**

```shell
$ dot unlink
```

**Aliases:**

- `dot l`

**Options:**

- `-v, --verbose` is used to show more information about the process.
- `-f, --force` to avoid prompt

**With arguments:** Link only a specific pacakge.

```shell
$ dot link zsh
```

### Unlink

Since `dot link` create symlink for all your pacakges, you can use `dot unlink`
to remove the symlinks.

**Basic:**

```shell
$ dot unlink
```

**Aliases:**

- `dot u`
- `dot remove`

**Options:**

- `-v, --verbose` is used to show more information about the process.
- `-f, --force` to avoid prompt

**With arguments:** Link only a specific pacakge.

```shell
$ dot unlink zsh
```

### Config

Show the current configuration.

**Basic:**

```shell
$ dot config
```

Edit the current configuration (source and target).

```shell
$ dot config edit
```

### Add

Add new files or folder to your dotfiles. It adds the requested files to your
packages and update to symlink.

**Basic:**

```shell
$ dot add .
```

Add a the current folder to a specific package (if not exist, the package will
be created).

```shell
$ dot add . zsh
```

Add a specific to a specific package (if not exist, the package will be
created).

```shell
$ dot add .zshrc zsh
```

### Edit

Open the dotfiles repository in your default editor.

**Basic:**

```shell
$ dot edit
```

**Aliases:**

- `dot open`

### Ignore

Create a `.dotignore` file to avoid link some files or folders. It follows the
same rules as `.gitignore`. By default it always ignore the `.git` folder and
the `.dotignore` file.

```text
# Example

# Ignore all files with the extension .md
*.md

# Ignore the script
scripts/
```

## Todo

- Add colors
- Improve bundle size
- Deploy for multiple platforms
