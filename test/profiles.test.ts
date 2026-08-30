import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  COMMON_KEY,
  ManifestError,
  addPackageToProfile,
  loadManifest,
  removePackageFromProfile,
  resolveProfile,
  resolveTarget,
  selectPackages,
} from "../src/tools/profiles";
import { createFixture, type Fixture } from "./helpers/fixture";

let fixture: Fixture;

const MANIFEST = {
  version: 1,
  common: ["git", "zsh"],
  profiles: {
    macbook: { description: "Work laptop", packages: ["brew", "nvim"] },
    macmini: { packages: ["brew"] },
    raspberrypi: { packages: ["docker"], target: "/home/pi" },
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
    await writeManifest({ profiles: { a: { packages: ["../evil"] } } });

    expect(loadManifest(fixture.repo)).rejects.toThrow(/invalid package name/);
  });
});

describe("resolveProfile", () => {
  test("unions common with the profile, in order", () => {
    const resolved = resolveProfile(MANIFEST, "macbook", ON_DISK);

    expect(resolved.packages).toEqual(["git", "zsh", "brew", "nvim"]);
    expect(resolved.missing).toEqual([]);
    expect(resolved.description).toBe("Work laptop");
  });

  test("reports packages declared but missing on disk", () => {
    const resolved = resolveProfile(MANIFEST, "macbook", ["git", "brew"]);

    expect(resolved.packages).toEqual(["git", "brew"]);
    expect(resolved.missing).toEqual(["zsh", "nvim"]);
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
    expect(selection.names).toEqual(["git", "zsh", "docker"]);
  });

  test("--profile overrides the active profile", async () => {
    await writeManifest(MANIFEST);

    const selection = await selectPackages(
      { ...fixture.config, profile: "raspberrypi" },
      ON_DISK,
      { profile: "macmini" },
    );

    expect(selection.names).toEqual(["git", "zsh", "brew"]);
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
});

describe("manifest write-back", () => {
  test("adds a package to a profile and to common", async () => {
    await writeManifest(MANIFEST);

    await addPackageToProfile(fixture.repo, "ghostty", "macbook");
    await addPackageToProfile(fixture.repo, "starship", COMMON_KEY);

    const manifest = (await loadManifest(fixture.repo))!;

    expect(manifest.profiles.macbook.packages).toEqual([
      "brew",
      "nvim",
      "ghostty",
    ]);
    expect(manifest.common).toEqual(["git", "zsh", "starship"]);
  });

  test("is idempotent", async () => {
    await writeManifest(MANIFEST);

    await addPackageToProfile(fixture.repo, "brew", "macbook");
    await addPackageToProfile(fixture.repo, "brew", "macbook");

    expect(
      (await loadManifest(fixture.repo))!.profiles.macbook.packages,
    ).toEqual(["brew", "nvim"]);
  });

  test("removes a package everywhere", async () => {
    await writeManifest(MANIFEST);

    await removePackageFromProfile(fixture.repo, "brew");

    const manifest = (await loadManifest(fixture.repo))!;

    expect(manifest.profiles.macbook.packages).toEqual(["nvim"]);
    expect(manifest.profiles.macmini.packages).toEqual([]);
  });

  test("refuses to rewrite a manifest containing comments", async () => {
    await fixture.write(
      "repo/dot.json",
      "// keep me\n" + JSON.stringify(MANIFEST),
    );

    expect(
      addPackageToProfile(fixture.repo, "ghostty", "macbook"),
    ).rejects.toThrow(/comments/);
  });

  test("writes 2-space JSON with a trailing newline", async () => {
    await writeManifest(MANIFEST);
    await addPackageToProfile(fixture.repo, "ghostty", "macbook");

    const raw = await Bun.file(`${fixture.repo}/dot.json`).text();

    expect(raw.endsWith("}\n")).toBe(true);
    expect(raw).toContain('\n  "common": [');
  });
});
