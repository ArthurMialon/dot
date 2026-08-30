import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  ManifestError,
  excludePackage,
  includePackage,
  loadManifest,
  resolveProfile,
  resolveTarget,
  selectPackages,
  type DotManifest,
} from "../src/tools/profiles";
import { createFixture, type Fixture } from "./helpers/fixture";

let fixture: Fixture;

const MANIFEST: DotManifest = {
  version: 2,
  profiles: {
    macbook: {
      description: "Work laptop",
      include: ["*"],
      exclude: ["docker"],
    },
    macmini: { include: ["*"], exclude: ["docker", "nvim"] },
    raspberrypi: {
      include: ["docker", "git", "zsh"],
      exclude: [],
      target: "/home/pi",
    },
  },
};

const ON_DISK = ["git", "zsh", "brew", "nvim", "docker"];

const writeManifest = (manifest: unknown) =>
  fixture.write("repo/dot.json", JSON.stringify(manifest, null, 2));

beforeEach(async () => {
  fixture = await createFixture("dot-profiles-");
});

afterEach(() => fixture.cleanup());

describe("loadManifest", () => {
  test("returns null when absent, so legacy repos are untouched", async () => {
    expect(await loadManifest(fixture.repo)).toBeNull();
  });

  test("a profile with no keys includes everything", async () => {
    await writeManifest({ version: 2, profiles: { mac: {} } });

    const manifest = (await loadManifest(fixture.repo))!;

    expect(manifest.profiles.mac.include).toEqual(["*"]);
    expect(manifest.profiles.mac.exclude).toEqual([]);
  });

  test("rejects malformed JSON with a helpful error", async () => {
    await fixture.write("repo/dot.json", "{ nope");

    expect(loadManifest(fixture.repo)).rejects.toThrow(ManifestError);
  });

  test("flags a commented manifest", async () => {
    await fixture.write("repo/dot.json", '// hi\n{"profiles":{}}');

    const error = await loadManifest(fixture.repo).catch((e: unknown) => e);
    expect((error as ManifestError).hint).toContain("comments");
  });

  test("rejects a future manifest version", async () => {
    await writeManifest({ version: 99, profiles: {} });

    expect(loadManifest(fixture.repo)).rejects.toThrow(/version 99/);
  });

  test("rejects a package name that escapes the repository", async () => {
    await writeManifest({ profiles: { a: { include: ["../evil"] } } });

    expect(loadManifest(fixture.repo)).rejects.toThrow(/invalid package name/);
  });

  test("accepts the wildcard as an include but not as an exclude", async () => {
    await writeManifest({ profiles: { a: { include: ["*"] } } });
    expect((await loadManifest(fixture.repo))!.profiles.a.include).toEqual([
      "*",
    ]);

    await writeManifest({ profiles: { a: { exclude: ["*"] } } });
    expect(loadManifest(fixture.repo)).rejects.toThrow(
      /only meaningful in "include"/,
    );
  });
});

// The v1 shape shipped in v1.5.0, so an existing repository must keep working.
describe("version 1 manifests", () => {
  test("folds common and packages into include", async () => {
    await writeManifest({
      version: 1,
      common: ["git", "zsh"],
      profiles: { mac: { packages: ["brew"] } },
    });

    const manifest = (await loadManifest(fixture.repo))!;

    expect(manifest.version).toBe(2);
    expect(manifest.profiles.mac.include).toEqual(["git", "zsh", "brew"]);
    expect(manifest.profiles.mac.exclude).toEqual([]);
  });

  test("resolves to the same packages it used to", async () => {
    await writeManifest({
      version: 1,
      common: ["git"],
      profiles: { mac: { packages: ["brew"] } },
    });

    const manifest = (await loadManifest(fixture.repo))!;

    expect(resolveProfile(manifest, "mac", ON_DISK).packages).toEqual([
      "git",
      "brew",
    ]);
  });

  test("refuses a manifest that mixes both shapes", async () => {
    await writeManifest({
      version: 1,
      common: ["git"],
      profiles: { mac: { packages: ["brew"], exclude: ["docker"] } },
    });

    expect(loadManifest(fixture.repo)).rejects.toThrow(/mixes the old/);
  });
});

describe("resolveProfile", () => {
  test("takes everything by default, minus the excludes", () => {
    const resolved = resolveProfile(MANIFEST, "macbook", ON_DISK);

    // sorted, so link order matches on every machine
    expect(resolved.packages).toEqual(["brew", "git", "nvim", "zsh"]);
    expect(resolved.includesAll).toBe(true);
  });

  test("a new package needs no manifest change", () => {
    const resolved = resolveProfile(MANIFEST, "macbook", [
      ...ON_DISK,
      "ghostty",
    ]);

    expect(resolved.packages).toContain("ghostty");
  });

  test("an explicit include takes only what it names", () => {
    const resolved = resolveProfile(MANIFEST, "raspberrypi", ON_DISK);

    expect(resolved.packages).toEqual(["docker", "git", "zsh"]);
    expect(resolved.includesAll).toBe(false);
  });

  test("reports an include naming something absent", () => {
    const resolved = resolveProfile(MANIFEST, "raspberrypi", ["git", "zsh"]);

    expect(resolved.packages).toEqual(["git", "zsh"]);
    expect(resolved.missing).toEqual(["docker"]);
  });

  // A typo'd exclude silently links what you meant to drop.
  test("reports an exclude that matches nothing", () => {
    const resolved = resolveProfile(MANIFEST, "macbook", ["git", "zsh"]);

    expect(resolved.staleExcludes).toEqual(["docker"]);
  });

  test("a wildcard include can never be missing", () => {
    expect(resolveProfile(MANIFEST, "macbook", []).missing).toEqual([]);
  });

  test("suggests a close name for an unknown profile", () => {
    try {
      resolveProfile(MANIFEST, "macbok", ON_DISK);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestError);
      expect((error as ManifestError).hint).toContain('Did you mean "macbook"');
    }
  });

  test("carries the profile target", () => {
    expect(resolveProfile(MANIFEST, "raspberrypi", ON_DISK).target).toBe(
      "/home/pi",
    );
  });
});

describe("resolveTarget", () => {
  test("expands ~ and environment variables", () => {
    process.env.DOT_TEST_TARGET = "/srv/home";

    expect(resolveTarget({ target: "$DOT_TEST_TARGET/x" })).toBe("/srv/home/x");
    expect(resolveTarget({ target: "${DOT_TEST_TARGET}" })).toBe("/srv/home");
    expect(resolveTarget({ target: "/home/pi" })).toBe("/home/pi");
    expect(resolveTarget({})).toBeUndefined();

    delete process.env.DOT_TEST_TARGET;
  });

  test("refuses an undefined variable rather than producing a bad path", () => {
    expect(() => resolveTarget({ target: "$DOT_NOT_SET_ANYWHERE/x" })).toThrow(
      ManifestError,
    );
  });
});

describe("selectPackages", () => {
  test("without a manifest, selects everything", async () => {
    const selection = await selectPackages(fixture.config, ON_DISK);

    expect(selection.mode).toBe("all");
    expect(selection.names).toBeNull();
  });

  test("--profile without a manifest is an error", () => {
    expect(
      selectPackages(fixture.config, ON_DISK, { profile: "macbook" }),
    ).rejects.toThrow(/profiles are not configured/);
  });

  test("with a manifest but no active profile, warns and selects everything", async () => {
    await writeManifest(MANIFEST);

    const selection = await selectPackages(fixture.config, ON_DISK);

    expect(selection.mode).toBe("all");
    expect(selection.warnings[0]).toContain("No active profile");
  });

  test("uses the active profile from config", async () => {
    await writeManifest(MANIFEST);

    const selection = await selectPackages(
      { ...fixture.config, profile: "raspberrypi" },
      ON_DISK,
    );

    expect(selection.mode).toBe("profile");
    expect(selection.names).toEqual(["docker", "git", "zsh"]);
  });

  test("--profile overrides the active profile", async () => {
    await writeManifest(MANIFEST);

    const selection = await selectPackages(
      { ...fixture.config, profile: "raspberrypi" },
      ON_DISK,
      { profile: "macmini" },
    );

    expect(selection.names).toEqual(["brew", "git", "zsh"]);
  });

  test("--all ignores the profile", async () => {
    await writeManifest(MANIFEST);

    const selection = await selectPackages(
      { ...fixture.config, profile: "raspberrypi" },
      ON_DISK,
      { all: true },
    );

    expect(selection.mode).toBe("all");
  });

  test("--profile and --all are mutually exclusive", async () => {
    await writeManifest(MANIFEST);

    expect(
      selectPackages(fixture.config, ON_DISK, {
        profile: "macbook",
        all: true,
      }),
    ).rejects.toThrow(/mutually exclusive/);
  });

  test("warns about a stale exclude", async () => {
    await writeManifest(MANIFEST);

    const selection = await selectPackages(
      { ...fixture.config, profile: "macbook" },
      ["git", "zsh"],
    );

    expect(selection.warnings.join(" ")).toContain('excludes package "docker"');
  });
});

describe("manifest write-back", () => {
  test("removing from a wildcard profile adds an exclude", async () => {
    await writeManifest(MANIFEST);

    await excludePackage(fixture.repo, "brew", "macbook");

    const manifest = (await loadManifest(fixture.repo))!;

    expect(manifest.profiles.macbook.exclude).toEqual(["docker", "brew"]);
    expect(manifest.profiles.macbook.include).toEqual(["*"]);
  });

  test("adding to a wildcard profile drops the exclude", async () => {
    await writeManifest(MANIFEST);

    await includePackage(fixture.repo, "docker", "macbook");

    expect(
      (await loadManifest(fixture.repo))!.profiles.macbook.exclude,
    ).toEqual([]);
  });

  // Never leave the manifest saying two things about one package.
  test("removing from an explicit profile drops it from include", async () => {
    await writeManifest(MANIFEST);

    await excludePackage(fixture.repo, "docker", "raspberrypi");

    const profile = (await loadManifest(fixture.repo))!.profiles.raspberrypi;

    expect(profile.include).toEqual(["git", "zsh"]);
    expect(profile.exclude).toEqual([]);
  });

  test("adding to an explicit profile extends include", async () => {
    await writeManifest(MANIFEST);

    await includePackage(fixture.repo, "brew", "raspberrypi");

    expect(
      (await loadManifest(fixture.repo))!.profiles.raspberrypi.include,
    ).toEqual(["docker", "git", "zsh", "brew"]);
  });

  test("is idempotent", async () => {
    await writeManifest(MANIFEST);

    await excludePackage(fixture.repo, "brew", "macbook");
    await excludePackage(fixture.repo, "brew", "macbook");

    expect(
      (await loadManifest(fixture.repo))!.profiles.macbook.exclude,
    ).toEqual(["docker", "brew"]);
  });

  test("rejects an unknown profile", () => {
    return writeManifest(MANIFEST).then(() =>
      expect(excludePackage(fixture.repo, "brew", "nope")).rejects.toThrow(
        /Unknown profile/,
      ),
    );
  });

  test("refuses to rewrite a manifest containing comments", async () => {
    await fixture.write(
      "repo/dot.json",
      "// keep me\n" + JSON.stringify(MANIFEST),
    );

    expect(excludePackage(fixture.repo, "brew", "macbook")).rejects.toThrow(
      /comments/,
    );
  });

  test("keeps a default profile as a one-liner and arrays inline", async () => {
    await writeManifest(MANIFEST);
    await includePackage(fixture.repo, "docker", "macbook");

    const raw = await Bun.file(`${fixture.repo}/dot.json`).text();

    expect(raw.endsWith("}\n")).toBe(true);
    // macbook now has no excludes and includes everything, so neither key is
    // written: only its description survives.
    expect(raw).not.toMatch(/"macbook": \{[^}]*"(include|exclude)"/s);
    expect(raw).toContain('"include": ["docker", "git", "zsh"]');
  });
});
