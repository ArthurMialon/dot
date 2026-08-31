import { join } from "node:path";
import Dot from "../dot";
import type { DotConfig } from "./config";
import { PathExpansionError, exists, expandPath } from "./fs";
import { closest } from "./text";

export interface DotProfile {
  /** Free text shown by `dot profile list`. */
  description?: string;
  /**
   * Packages this profile links, or ["*"] for every package in the repository.
   * Absent means ["*"]: a profile opts out, it does not opt in, so a new folder
   * is linked everywhere without touching the manifest.
   */
  include: string[];
  /** Packages removed from the include set. Always wins over include. */
  exclude: string[];
  /** Symlink target for machines whose home is shaped differently. */
  target?: string;
}

export interface DotManifest {
  version: number;
  /** Insertion order is preserved and drives link order. */
  profiles: Record<string, DotProfile>;
}

export const MANIFEST_VERSION = 2;

/** The only pattern. Everything else is a literal package name. */
export const ALL = "*";

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
  "version": 2,
  "profiles": {
    "macbook": { "exclude": ["docker"] },
    "raspberrypi": { "include": ["docker", "git"] }
  }
}`;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const validatePackageNames = (
  names: string[],
  where: string,
  { allowAll = false }: { allowAll?: boolean } = {},
): void => {
  for (const name of names) {
    if (name === ALL) {
      if (allowAll) continue;

      // Otherwise "*" would be read as a package literally named "*", match
      // nothing, and silently do the opposite of what was meant.
      throw new ManifestError(
        `${where}: "${ALL}" is only meaningful in "include".`,
        `To link nothing, use "include": [].`,
      );
    }

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
  const isLegacy = version === 1;

  if (typeof version !== "number" || version > MANIFEST_VERSION) {
    const declared = typeof version === "number" ? version : "an invalid value";

    throw new ManifestError(
      `${Dot.manifestFileName} declares version ${declared}, but this ${Dot.title} understands version ${MANIFEST_VERSION}.`,
      `Run: ${Dot.bin} upgrade`,
    );
  }

  // Version 1 shape: a root "common" list plus "packages" per profile. Both
  // fold into "include", so an existing manifest keeps working untouched.
  const legacyCommon = manifest.common ?? [];

  if (!isStringArray(legacyCommon)) {
    throw new ManifestError(`"common" must be an array of package names.`);
  }

  validatePackageNames(legacyCommon, `"common"`);

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

    const legacyPackages = profile.packages ?? [];

    if (!isStringArray(legacyPackages)) {
      throw new ManifestError(
        `Profile "${name}": "packages" must be an array of package names.`,
      );
    }

    validatePackageNames(legacyPackages, `Profile "${name}"`);

    const hasLegacyKeys =
      isLegacy || legacyCommon.length > 0 || legacyPackages.length > 0;

    if (
      hasLegacyKeys &&
      (profile.include !== undefined || profile.exclude !== undefined)
    ) {
      throw new ManifestError(
        `Profile "${name}" mixes the old "packages" key with "include"/"exclude".`,
        `Keep only "include" and "exclude", and drop "common" and "packages".`,
      );
    }

    const rawInclude =
      profile.include ??
      (hasLegacyKeys ? [...legacyCommon, ...legacyPackages] : [ALL]);

    if (!isStringArray(rawInclude)) {
      throw new ManifestError(
        `Profile "${name}": "include" must be an array of package names.`,
      );
    }

    validatePackageNames(rawInclude, `Profile "${name}" include`, {
      allowAll: true,
    });

    const rawExclude = profile.exclude ?? [];

    if (!isStringArray(rawExclude)) {
      throw new ManifestError(
        `Profile "${name}": "exclude" must be an array of package names.`,
      );
    }

    validatePackageNames(rawExclude, `Profile "${name}" exclude`);

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
      include: [...new Set(rawInclude)],
      exclude: [...new Set(rawExclude)],
      ...(typeof profile.target === "string" ? { target: profile.target } : {}),
      ...(typeof profile.description === "string"
        ? { description: profile.description }
        : {}),
    };
  }

  return { version: MANIFEST_VERSION, profiles };
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

  try {
    return expandPath(target);
  } catch (error) {
    if (error instanceof PathExpansionError) {
      throw new ManifestError(
        `Profile target "${target}" refers to $${error.variable}, which is not set.`,
      );
    }

    throw error;
  }
};

export interface ResolvedProfile {
  name: string;
  description?: string;
  /** The packages this profile links, after applying exclude. */
  packages: string[];
  /** Names in include that have no directory on disk. */
  missing: string[];
  /** Names in exclude that match nothing — usually a typo. */
  staleExcludes: string[];
  /** True when include is ["*"], i.e. the profile takes everything by default. */
  includesAll: boolean;
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

    const suggestion = closest(name, available);

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

  const includesAll = profile.include.includes(ALL);

  // "*" is sorted so link order is identical on every machine, rather than
  // following whatever order the filesystem hands back.
  const declared = includesAll ? [...packagesOnDisk].sort() : profile.include;

  const excluded = new Set(profile.exclude);

  const packages = declared
    .filter((pkg) => packagesOnDisk.includes(pkg))
    .filter((pkg) => !excluded.has(pkg));

  return {
    name,
    ...(profile.description ? { description: profile.description } : {}),
    packages,
    // Only an explicit include can name something that is not there; "*"
    // cannot be wrong.
    missing: includesAll
      ? []
      : profile.include.filter((pkg) => !packagesOnDisk.includes(pkg)),
    // A typo here silently links what you meant to drop, so say so.
    staleExcludes: profile.exclude.filter(
      (pkg) => !packagesOnDisk.includes(pkg),
    ),
    includesAll,
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

  for (const pkg of profile.staleExcludes) {
    warnings.push(
      `Profile "${name}" excludes package "${pkg}", which does not exist in ${configuration.repo}.`,
    );
  }

  if (profile.packages.length === 0) {
    warnings.push(`Profile "${name}" activates no packages.`);
  }

  return { mode: "profile", names: profile.packages, profile, warnings };
};

const inlineArray = (values: string[]): string =>
  `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;

/**
 * Keeps package arrays on one line. JSON.stringify would put every package on
 * its own line, so the first write-back would reformat the whole manifest and
 * adding one package would not read as a one-line diff.
 */
const serialize = (manifest: DotManifest): string => {
  const entries = Object.entries(manifest.profiles);

  const profiles = entries.map(([name, profile], index) => {
    const fields: string[] = [];

    if (profile.description !== undefined) {
      fields.push(
        `      "description": ${JSON.stringify(profile.description)}`,
      );
    }

    if (profile.target !== undefined) {
      fields.push(`      "target": ${JSON.stringify(profile.target)}`);
    }

    // Omit the defaults so a profile that takes everything stays a one-liner.
    if (!(profile.include.length === 1 && profile.include[0] === ALL)) {
      fields.push(`      "include": ${inlineArray(profile.include)}`);
    }

    if (profile.exclude.length > 0) {
      fields.push(`      "exclude": ${inlineArray(profile.exclude)}`);
    }

    const comma = index === entries.length - 1 ? "" : ",";

    // A profile with nothing but defaults renders as {}.
    if (fields.length === 0) return `    ${JSON.stringify(name)}: {}${comma}`;

    return `    ${JSON.stringify(name)}: {\n${fields.join(",\n")}\n    }${comma}`;
  });

  return [
    "{",
    `  "version": ${manifest.version},`,
    '  "profiles": {',
    ...profiles,
    "  }",
    "}",
    "",
  ].join("\n");
};

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

const loadForWrite = async (repo: string): Promise<DotManifest> => {
  await assertNoComments(repo);

  const manifest = await loadManifest(repo);

  if (!manifest) {
    throw new ManifestError(
      `This repository has no ${Dot.manifestFileName}.`,
      `Create one with: ${Dot.bin} profile init`,
    );
  }

  return manifest;
};

const profileOf = (manifest: DotManifest, name: string): DotProfile => {
  const profile = manifest.profiles[name];

  if (!profile) {
    throw new ManifestError(
      `Unknown profile "${name}".`,
      `Available profiles: ${Object.keys(manifest.profiles).join(", ")}.`,
    );
  }

  return profile;
};

const without = (list: string[], pkg: string) =>
  list.filter((name) => name !== pkg);

/**
 * Make a package part of a profile. With the default include of ["*"] that just
 * means dropping it from exclude; with an explicit list it is added there.
 */
export const includePackage = async (
  repo: string,
  pkg: string,
  profileName: string,
): Promise<void> => {
  const manifest = await loadForWrite(repo);
  const profile = profileOf(manifest, profileName);

  profile.exclude = without(profile.exclude, pkg);

  if (!profile.include.includes(ALL) && !profile.include.includes(pkg)) {
    profile.include.push(pkg);
  }

  await Bun.write(manifestPath(repo), serialize(manifest));
};

/**
 * Keep a package out of a profile. Under the default include it becomes an
 * exclude; under an explicit list it is simply dropped from that list, so the
 * manifest never carries both statements about the same package.
 */
export const excludePackage = async (
  repo: string,
  pkg: string,
  profileName: string,
): Promise<void> => {
  const manifest = await loadForWrite(repo);
  const profile = profileOf(manifest, profileName);

  if (profile.include.includes(ALL)) {
    if (!profile.exclude.includes(pkg)) profile.exclude.push(pkg);
  } else {
    profile.include = without(profile.include, pkg);
    profile.exclude = without(profile.exclude, pkg);
  }

  await Bun.write(manifestPath(repo), serialize(manifest));
};

/**
 * Scaffold a manifest. Every profile starts empty, which means "link
 * everything" — you subtract from there instead of enumerating.
 */
export const initManifest = async (
  repo: string,
  profileNames: string[],
): Promise<DotManifest> => {
  const manifest: DotManifest = {
    version: MANIFEST_VERSION,
    profiles: Object.fromEntries(
      profileNames.map((name) => [name, { include: [ALL], exclude: [] }]),
    ),
  };

  await Bun.write(manifestPath(repo), serialize(manifest));

  return manifest;
};
