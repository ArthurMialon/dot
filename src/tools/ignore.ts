import { resolve } from "node:path";
import Dot from "../dot";
import { exists } from "./fs";

const DEFAULT_IGNORE_CONTENT = `
.git/
${Dot.ignoreFileName}
`;

interface IgnorePattern {
  pattern: string;
  negative: boolean;
  regex: RegExp;
}

export class IgnoreFile {
  private path: string;
  private content: string = DEFAULT_IGNORE_CONTENT;
  private loaded: boolean = false;
  private patterns: IgnorePattern[] = [];

  constructor(path: string) {
    this.path = path;
  }

  private async loadContent(): Promise<void> {
    if (!(await exists(this.path))) return;

    const content = await Bun.file(this.path).text();

    this.content = DEFAULT_IGNORE_CONTENT.concat(content);
  }

  private parseContent(): void {
    const lines = this.content.split("\n");

    for (let line of lines) {
      // Remove comments and trim whitespace
      line = line.replace(/#.*$/, "").trim();

      // Skip empty lines
      if (!line) continue;

      const negative = line.startsWith("!");
      if (negative) {
        line = line.slice(1);
      }

      // Convert gitignore pattern to regex
      let pattern = line
        // Remove leading and trailing slashes
        .replace(/^\/+|\/+$/g, "")
        // Replace special characters
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, "###")
        .replace(/\*/g, "[^/]*")
        .replace(/###/g, ".*")
        .replace(/\?/g, "[^/]");

      // If pattern doesn't start with /, it can match in any directory
      if (!line.startsWith("/")) {
        pattern = `(.*/${pattern}|${pattern})`;
      }

      this.patterns.push({
        pattern: line,
        negative,
        regex: new RegExp(`^${pattern}(?:$|/)`, "i"),
      });
    }

    this.loaded = true;
  }

  public async ignore(filePath: string): Promise<boolean> {
    if (!this.loaded) {
      await this.loadContent();
      this.parseContent();
    }

    const path = filePath
      .replace(/\\/g, "/") // Normalize path separators
      .replace(/^\.\//, ""); // Remove leading ./

    let shouldIgnore = false;

    for (const { regex, negative } of this.patterns) {
      if (regex.test(path)) {
        shouldIgnore = !negative;
      }
    }

    return shouldIgnore;
  }
}

const cache = new Map<string, IgnoreFile>();

/**
 * Cached per absolute path. The previous implementation cached a single
 * instance for the whole process (the constructor returned the first instance
 * ever built), so the first path won regardless of what was requested.
 */
export const getIgnoreFile = (path: string): IgnoreFile => {
  const key = resolve(path);

  let file = cache.get(key);

  if (!file) {
    file = new IgnoreFile(key);
    cache.set(key, file);
  }

  return file;
};
