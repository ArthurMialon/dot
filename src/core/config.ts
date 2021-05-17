import { run } from "@oclif/command";
import * as fs from "fs";
import * as os from "os"
import * as path from 'path'

export interface Configuration {
  repo: string;
  install_script: string;
  owner?: string;
  target: string;
  [key: string]: any;
}

const env = (key: string) => process.env[key]

/**
 * Name of the configuration File 
 */
export const CONFIG_FILE_NAME = "config";

/**
 * Default name for the folder containing dotfiles
 */
export const TARGET_FOLDER = ".dotfiles"

/**
 * Default Configuration define for every users
 */
export const DEFAULT_CONFIGURATION = {
  repo: "dotfiles",
  install_script: "install.sh",
  target: "",
};

/**
 * Simple function to validate the configuratuon values
 * @param config 
 * @returns 
 */
export const validateConfig = (config: { [key: string]: any }): any[] | null => {
  const keys = Object.keys(config)

  const errors = keys.reduce((acc: string[], key) => {
    if (config[key]) return acc

    return acc.concat(`Missing value for ${key}`)
  }, [])

  return errors.length ? errors : null
}


/**
 * Export the fullpath of the configuration
 * @param path 
 * @returns 
 */
export const toFullPath = (path: string) => `${path}/${CONFIG_FILE_NAME}`;

/**
 * Merge the local environment with the configuration
 * @param configuration
 * @returns
 */
const withEnvironment = (configuration: Configuration) => {
  const owner = env('DOT_OWNER') || configuration.owner
  const repo = env('DOT_REPO') || configuration.repo || DEFAULT_CONFIGURATION.repo
  const target = env('DOT_TARGET') || configuration.target || path.resolve(os.homedir(), TARGET_FOLDER)

  return {
    ...DEFAULT_CONFIGURATION,
    ...configuration,
    owner,
    repo,
    target,
  };
};

/**
 * Initialize the Configuration file
 * @param path
 * @returns
 */
export const init = (path: string) => write(path, DEFAULT_CONFIGURATION);

/**
 * Write the whole Configuration file
 * @param path
 * @param content
 * @returns
 */
export const write = (path: string, content: Configuration) =>
  fs.promises.writeFile(toFullPath(path), JSON.stringify(content, null, 2), {
    encoding: "utf8",
  });

/**
 * Read the Configuration file
 * @param path
 * @returns
 */
export const read = async (path: string): Promise<Configuration> => {
  const configuration = JSON.parse(
    (await fs.promises.readFile(toFullPath(path), "utf8")) || "{}"
  );

  return withEnvironment(configuration);
};

/**
 * Update a specific value to the configuration file
 * @param path
 * @param key
 * @param value
 */
export const writeValue = async (
  path: string,
  key: keyof Configuration,
  value: any
) => {
  // read config
  const configuration = await read(path);

  // update JSON values
  const newConfiguration = { ...configuration, [key]: value };

  // write config
  await write(path, newConfiguration);
};
