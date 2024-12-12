import Dot from "../dot.ts";
import { exists } from "@std/fs";

const DEFAULT_IGNORE_CONTENT = `
.git/
${Dot.ignoreFileName}
`;

export class IgnoreFile {
  static instance?: IgnoreFile;

  private path: string;
  private content: string = DEFAULT_IGNORE_CONTENT;
  private loaded: boolean = false;

  private patterns: Array<{
    pattern: string;
    negative: boolean;
    regex: RegExp;
  }> = [];

  constructor(path: string) {
    this.path = path;

    if (!IgnoreFile.instance) {
      IgnoreFile.instance = this;
    }

    return IgnoreFile.instance;
  }

  async loadContent() {
    if (!(await exists(this.path))) return;

    const content = await Deno.readTextFile(this.path);

    this.content = DEFAULT_IGNORE_CONTENT.concat(content);
  }

  private parseContent(): void {
    if (this.loaded) return;

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
      return this.ignore(filePath);
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
