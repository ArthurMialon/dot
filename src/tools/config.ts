import { exists } from "@std/fs";

const CONFIG_DIR = `${Deno.env.get("HOME")}/.dot`;
const CONFIG_PATH = `${CONFIG_DIR}/config`;

const DEFAULT_REPO = `${Deno.env.get("HOME")}/dotfiles`;
const DEFAULT_TARGET = `${Deno.env.get("HOME")}`;

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
  configPath: CONFIG_PATH,
  configDirectory: CONFIG_DIR,

  // dotfiles configuration
  repo: DEFAULT_REPO,
  target: DEFAULT_TARGET,
};

export const get = async (
  options: { safe?: boolean } = {},
): Promise<DotConfig> => {
  if (!(await exists(CONFIG_PATH))) {
    await write(defaultConfig, true);
  }

  try {
    const content = await Deno.readTextFile(CONFIG_PATH);
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
          "It seems like the first time your run the Dot CLI, please run: dot init";
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
  if (!(await exists(CONFIG_PATH))) {
    await Deno.mkdir(CONFIG_DIR, { recursive: true });
    await Deno.create(CONFIG_PATH);
  }

  const config = init ? value : (await get());
  const merged = { ...config, ...value };

  await Deno.writeTextFile(CONFIG_PATH, JSON.stringify(merged, null, 2));
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
