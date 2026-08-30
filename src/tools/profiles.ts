import { homedir } from "node:os";
import { join } from "node:path";
import Dot from "../dot";
import type { DotConfig } from "./config";
import { exists } from "./fs";

export interface DotProfile {
  /** Free text shown by `dot profile list`. */
  description?: string;
  /** Package directories this profile activates, on top of `common`. */
  packages: string[];
  /** Symlink target for machines whose home is shaped differently. */
  target?: string;
}

export interface DotManifest {
  version: number;
  /** Packages linked by every profile. */
  common: string[];
  /** Insertion order is preserved and drives link order. */
  profiles: Record<string, DotProfile>;
}

export const MANIFEST_VERSION = 1;
export const COMMON_KEY = "common";

export class ManifestError extends Error {
  readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "ManifestError";
    this.hint = hint;
  }
}

export const manifestPath = (repo: string): string =>
  join(repo, Dot.manifestFileName);

export const hasManifest = (repo: string): Promise<boolean> =>
  exists(manifestPath(repo));

const SKELETON = `{
  "version": 1,
  "common": ["git", "zsh"],
  "profiles": {
    "macbook": { "packages": ["brew"] }
  }
}`;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const validatePackageNames = (names: string[], where: string): void => {
  for (const name of names) {
    if (!name || name.includes("/") || name.includes("\\") || name === "..") {
      throw new ManifestError(`${where}: invalid package name "${name}".`);
    }
  }
};

/** Returns null when the repository has no manifest (every existing setup). */
export const loadManifest = async (
  repo: string,
): Promise<DotManifest | null> => {
  const path = manifestPath(repo);

  if (!(await exists(path))) return null;

  const raw = await Bun.file(path).text();

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);

    throw new ManifestError(
      `${Dot.manifestFileName} is not valid JSON: ${detail}`,
      /\/\/|\/\*/.test(raw)
        ? `${Dot.manifestFileName} looks like it contains comments, which JSON does not support.`
        : `Fix it in ${path}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ManifestError(
      `${Dot.manifestFileName} must be an object with a "profiles" key.`,
      SKELETON,
    );
  }

  const manifest = parsed as Record<string, unknown>;

  const version = manifest.version ?? MANIFEST_VERSION;

  if (typeof version !== "number" || version > MANIFEST_VERSION) {
    const declared = typeof version === "number" ? version : "an invalid value";

    throw new ManifestError(
      `${Dot.manifestFileName} declares version ${declared}, but this ${Dot.title} understands version ${MANIFEST_VERSION}.`,
      `Run: ${Dot.bin} upgrade`,
    );
  }

  const common = manifest.common ?? [];

  if (!isStringArray(common)) {
    throw new ManifestError(`"common" must be an array of package names.`);
  }

  validatePackageNames(common, `"${COMMON_KEY}"`);

  const rawProfiles = manifest.profiles;

  if (
    typeof rawProfiles !== "object" ||
    rawProfiles === null ||
    Array.isArray(rawProfiles)
  ) {
    throw new ManifestError(
      `${Dot.manifestFileName} must be an object with a "profiles" key.`,
      SKELETON,
    );
  }

  const profiles: Record<string, DotProfile> = {};

  for (const [name, value] of Object.entries(
    rawProfiles as Record<string, unknown>,
  )) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new ManifestError(`Profile "${name}" must be an object.`);
    }

    const profile = value as Record<string, unknown>;
    const packages = profile.packages ?? [];

    if (!isStringArray(packages)) {
      throw new ManifestError(
        `Profile "${name}": "packages" must be an array of package names.`,
      );
    }

    validatePackageNames(packages, `Profile "${name}"`);

    if (profile.target !== undefined && typeof profile.target !== "string") {
      throw new ManifestError(`Profile "${name}": "target" must be a string.`);
    }

    if (
      profile.description !== undefined &&
      typeof profile.description !== "string"
    ) {
      throw new ManifestError(
        `Profile "${name}": "description" must be a string.`,
      );
    }

    profiles[name] = {
      packages,
      ...(typeof profile.target === "string" ? { target: profile.target } : {}),
      ...(typeof profile.description === "string"
        ? { description: profile.description }
        : {}),
    };
  }

  return { version: MANIFEST_VERSION, common, profiles };
};

export const listProfileNames = async (repo: string): Promise<string[]> => {
  const manifest = await loadManifest(repo);

  return manifest ? Object.keys(manifest.profiles) : [];
};

/** Expands ~ and $VAR / ${VAR} in a profile target. */
export const resolveTarget = (
  profile: Pick<DotProfile, "target">,
): string | undefined => {
  const target = profile.target;

  if (!target) return undefined;

  const expanded = target
    .replace(/^~(?=\/|$)/, homedir())
    .replace(
      /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
      (_match, braced: string | undefined, bare: string | undefined) => {
        const name = braced ?? bare ?? "";
        const value = process.env[name];

        if (value === undefined) {
          throw new ManifestError(
            `Profile target "${target}" refers to $${name}, which is not set.`,
          );
        }

        return value;
      },
    );

  return expanded;
};

const levenshtein = (a: string, b: string): number => {
  const rows = Array.from({ length: b.length + 1 }, (_, i) => [i]);

  for (let j = 0; j <= a.length; j++) rows[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      rows[i][j] =
        b[i - 1] === a[j - 1]
          ? rows[i - 1][j - 1]
          : 1 + Math.min(rows[i - 1][j - 1], rows[i][j - 1], rows[i - 1][j]);
    }
  }

  return rows[b.length][a.length];
};

export interface ResolvedProfile {
  name: string;
  description?: string;
  /** common first, then the profile's own packages, de-duplicated. */
  packages: string[];
  /** Declared packages with no directory on disk. */
  missing: string[];
  target?: string;
}

export const resolveProfile = (
  manifest: DotManifest,
  name: string,
  packagesOnDisk: string[],
): ResolvedProfile => {
  const profile = manifest.profiles[name];

  if (!profile) {
    const available = Object.keys(manifest.profiles);

    const suggestion = available.find(
      (candidate) => levenshtein(candidate, name) <= 2,
    );

    throw new ManifestError(
      `Unknown profile "${name}".`,
      [
        available.length
          ? `Available profiles: ${available.join(", ")}.`
          : `${Dot.manifestFileName} declares no profiles.`,
        suggestion ? `Did you mean "${suggestion}"?` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  const declared = [...new Set([...manifest.common, ...profile.packages])];

  return {
    name,
    ...(profile.description ? { description: profile.description } : {}),
    packages: declared.filter((pkg) => packagesOnDisk.includes(pkg)),
    missing: declared.filter((pkg) => !packagesOnDisk.includes(pkg)),
    ...(profile.target ? { target: resolveTarget(profile) } : {}),
  };
};

export interface PackageSelection {
  /** "all" means no filtering: link every package directory. */
  mode: "all" | "profile";
  names: string[] | null;
  profile: ResolvedProfile | null;
  warnings: string[];
}

export interface SelectOptions {
  profile?: string;
  all?: boolean;
}

/** The single entry point commands use to decide what to act on. */
export const selectPackages = async (
  configuration: DotConfig,
  packagesOnDisk: string[],
  options: SelectOptions = {},
): Promise<PackageSelection> => {
  const everything: PackageSelection = {
    mode: "all",
    names: null,
    profile: null,
    warnings: [],
  };

  if (options.all && options.profile) {
    throw new ManifestError("--profile and --all are mutually exclusive.");
  }

  if (options.all) return everything;

  const manifest = await loadManifest(configuration.repo);

  if (!manifest) {
    if (options.profile) {
      throw new ManifestError(
        `This repository has no ${Dot.manifestFileName}, so profiles are not configured.`,
        `Create one with: ${Dot.bin} profile init`,
      );
    }

    return everything;
  }

  const name = options.profile ?? configuration.profile;

  if (!name) {
    return {
      ...everything,
      warnings: [
        `No active profile. Linking every package. Select one with: ${Dot.bin} profile use <name>`,
      ],
    };
  }

  const profile = resolveProfile(manifest, name, packagesOnDisk);

  const warnings = profile.missing.map(
    (pkg) =>
      `Profile "${name}" references package "${pkg}", which does not exist in ${configuration.repo} (skipped).`,
  );

  if (profile.packages.length === 0) {
    warnings.push(`Profile "${name}" activates no packages.`);
  }

  return { mode: "profile", names: profile.packages, profile, warnings };
};

const serialize = (manifest: DotManifest): string =>
  `${JSON.stringify(manifest, null, 2)}\n`;

const assertNoComments = async (repo: string): Promise<void> => {
  const path = manifestPath(repo);

  if (!(await exists(path))) return;

  const raw = await Bun.file(path).text();

  if (/^\s*\/\/|\/\*/m.test(raw)) {
    throw new ManifestError(
      `${Dot.manifestFileName} contains comments, which would be lost by rewriting it.`,
      "Edit the file by hand instead.",
    );
  }
};

export const addPackageToProfile = async (
  repo: string,
  pkg: string,
  profileName: string,
): Promise<void> => {
  await assertNoComments(repo);

  const manifest = await loadManifest(repo);

  if (!manifest) {
    throw new ManifestError(
      `This repository has no ${Dot.manifestFileName}.`,
      `Create one with: ${Dot.bin} profile init`,
    );
  }

  if (profileName === COMMON_KEY) {
    if (!manifest.common.includes(pkg)) manifest.common.push(pkg);
  } else {
    const profile = manifest.profiles[profileName];

    if (!profile) {
      throw new ManifestError(
        `Unknown profile "${profileName}".`,
        `Available profiles: ${Object.keys(manifest.profiles).join(", ")}.`,
      );
    }

    if (!profile.packages.includes(pkg)) profile.packages.push(pkg);
  }

  await Bun.write(manifestPath(repo), serialize(manifest));
};

export const removePackageFromProfile = async (
  repo: string,
  pkg: string,
  profileName?: string,
): Promise<void> => {
  await assertNoComments(repo);

  const manifest = await loadManifest(repo);

  if (!manifest) {
    throw new ManifestError(`This repository has no ${Dot.manifestFileName}.`);
  }

  const drop = (list: string[]) => list.filter((name) => name !== pkg);

  if (!profileName || profileName === COMMON_KEY) {
    manifest.common = drop(manifest.common);
  }

  for (const [name, profile] of Object.entries(manifest.profiles)) {
    if (profileName && profileName !== COMMON_KEY && name !== profileName) {
      continue;
    }

    profile.packages = drop(profile.packages);
  }

  await Bun.write(manifestPath(repo), serialize(manifest));
};

/** Scaffold a manifest from the packages currently on disk. */
export const initManifest = async (
  repo: string,
  packagesOnDisk: string[],
  profileNames: string[],
): Promise<DotManifest> => {
  const manifest: DotManifest = {
    version: MANIFEST_VERSION,
    common: [...packagesOnDisk],
    profiles: Object.fromEntries(
      profileNames.map((name) => [name, { packages: [] }]),
    ),
  };

  await Bun.write(manifestPath(repo), serialize(manifest));

  return manifest;
};
