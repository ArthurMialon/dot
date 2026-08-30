import { mkdir } from "node:fs/promises";
import Dot from "../dot";
import { exists } from "./fs";

export interface DotConfig {
  configPath: string;
  configDirectory: string;
  repo: string;
  target: string;
  initialized: boolean;

  /** Active profile name. null means no profile: every package is linked. */
  profile: string | null;
  /** Git remote URL for origin. null when unknown or local-only. */
  remote: string | null;
  /** Branch push/pull operate on. null means the checked-out branch. */
  branch: string | null;
}

export const defaultConfig: DotConfig = {
  initialized: false,

  // CLI configuration
  configPath: Dot.configPath,
  configDirectory: Dot.configDirectory,

  // dotfiles configuration
  repo: Dot.defaultRepo,
  target: Dot.defaultTarget,

  // Defaults are null so an existing config file, which get() merges over
  // defaultConfig, keeps behaving exactly as it did before these keys existed.
  profile: null,
  remote: null,
  branch: null,
};

export const get = async (
  options: { safe?: boolean } = {},
): Promise<DotConfig> => {
  if (!(await exists(Dot.configPath))) {
    await write(defaultConfig, true);
  }

  let merged: DotConfig;

  try {
    const content = await Bun.file(Dot.configPath).text();
    const parsed = JSON.parse(content) as Partial<DotConfig>;
    merged = { ...defaultConfig, ...parsed };
  } catch {
    throw new Error("Cannot read configuration");
  }

  if (!merged.initialized && !options.safe) {
    console.error(
      `It seems like the first time your run the ${Dot.title}, please run: dot init`,
    );
    process.exit(1);
  }

  return merged;
};

export const write = async (
  value: Partial<DotConfig>,
  init: boolean = false,
): Promise<void> => {
  if (!(await exists(Dot.configPath))) {
    await mkdir(Dot.configDirectory, { recursive: true });
  }

  const config = init ? value : await get();
  const merged = { ...config, ...value };

  await Bun.write(Dot.configPath, JSON.stringify(merged, null, 2));
};

export const initialize = (value: Partial<DotConfig>) => write(value, true);
