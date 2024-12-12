# Dot.

👉 A CLI to manage your Dotfiles built with [Deno 2](https://deno.com/) and
[Cliffy](https://cliffy.io/) inspired by
[GNU Stow](https://www.gnu.org/software/stow/)

## Installation

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

Dot CLI automatically symlinked all files to your `$HOME` directory
(or any directory you want to target). It follows the structure inside each
package.

Example for the **ZSH** package:

```bash
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

**Remote repository:**

```bash
dot init git@github.com:<USERNAME>/dotfiles.git
```

**Local repository**

```bash
dot init
```

`dot init` setup the **dotfiles location** and the **target** (default:
`$HOME`).

The Dot CLI will ask you to set the paths to your dotfiles repository and the
target directory. Then it reads the packages and files from your dotfiles
repository and link them to the target directory.

## Commands

You can use the `--help` flag everywhere to get more information about the
command.

### Init

Basic setup. Ask you to set locations to your dotfiles and the target location.

```bash
dot init
```

**With arguments:** You can clone your dotfiles repository and link all packages.

```bash
dot init git@github.com:ArthurMialon/dotfiles.git
```

### Link

Link all packages to your `$HOME` directory (can be update with configuration).

**Basic:**

```bash
dot unlink
```

**Aliases:**

- `dot l`

**Options:**

- `-v, --verbose` is used to show more information about the process.
- `-f, --force` to avoid prompt

**With arguments:** Link only a specific pacakge.

```bash
dot link zsh
```

### Unlink

Since `dot link` create symlink for all your pacakges, you can use `dot unlink`
to remove the symlinks.

**Basic:**

```bash
dot unlink
```

**Aliases:**

- `dot u`
- `dot remove`

**Options:**

- `-v, --verbose` is used to show more information about the process.
- `-f, --force` to avoid prompt

**With arguments:** Link only a specific pacakge.

```bash
dot unlink zsh
```

### Config

Show the current configuration.

**Basic:**

```bash
dot config
```

Edit the current configuration (source and target).

```bash
dot config edit
```

### Add

Add new files or folder to your dotfiles. It adds the requested files to your
packages and update to symlink.

**Basic:**

```bash
dot add .
```

Add a the current folder to a specific package (if not exist, the package will
be created).

```bash
dot add . zsh
```

Add a specific to a specific package (if not exist, the package will be
created).

```bash
dot add .zshrc zsh
```

### Edit

Open the dotfiles repository in your default editor.

**Basic:**

```bash
dot edit
```

**Aliases:**

- `dot open`

### Upgrade

You can upgrade the Dot CLI with the following command.

```bash
dot upgrade
```

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

- Add upgrade commande
- Add colors
- Improve bundle size
