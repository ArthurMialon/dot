import { exists } from "@std/fs";
import Dot from "../dot.ts";

export interface DotConfig {
  configPath: string;
  configDirectory: string;
  repo: string;
  target: string;
  initialized: boolean;
}

export const defaultConfig: DotConfig = {
  initialized: false,

  // CLI configuration
  configPath: Dot.configPath,
  configDirectory: Dot.configDirectory,

  // dotfiles configuration
  repo: Dot.defaultRepo,
  target: Dot.defaultTarget,
};

export const get = async (
  options: { safe?: boolean } = {},
): Promise<DotConfig> => {
  if (!(await exists(Dot.configPath))) {
    await write(defaultConfig, true);
  }

  try {
    const content = await Deno.readTextFile(Dot.configPath);
    const parsed = JSON.parse(content) as DotConfig;
    const merged = { ...defaultConfig, ...parsed };
    if (!merged.initialized && !options.safe) {
      throw new Error("NOT_INITIALIZED");
    }

    return merged;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_INITIALIZED") {
        const message =
          `It seems like the first time your run the ${Dot.title}, please run: dot init`;
        console.error(message);
        Deno.exit(1);
      }
    }

    throw new Error("Cannot read configuration");
  }
};

export const write = async (
  value: Partial<DotConfig>,
  init: boolean = false,
): Promise<void> => {
  if (!(await exists(Dot.configPath))) {
    await Deno.mkdir(Dot.configDirectory, { recursive: true });
    await Deno.create(Dot.configPath);
  }

  const config = init ? value : (await get());
  const merged = { ...config, ...value };

  await Deno.writeTextFile(Dot.configPath, JSON.stringify(merged, null, 2));
};

export const initialize = (
  value: Partial<DotConfig>,
) => write(value, true);

export const update = async <K extends keyof DotConfig>(
  key: K,
  value: DotConfig[K],
): Promise<DotConfig> => {
  const updated = { ...await get(), [key]: value };
  return updated;
};
