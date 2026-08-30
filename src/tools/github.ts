import Dot from "../dot";
import * as log from "./logging";

interface GitHubRelease {
  tag_name: string;
}

export const latestRelease = async (): Promise<GitHubRelease> => {
  const url = `https://api.github.com/repos/${Dot.owner}/${Dot.repository}/releases/latest`;

  let release: unknown;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      log.error(
        `Cannot fetch latest release from GitHub (HTTP ${response.status})`,
      );
      process.exit(1);
    }

    release = await response.json();
  } catch {
    log.error("Cannot fetch latest release from GitHub");
    process.exit(1);
  }

  const tagName = (release as Partial<GitHubRelease>)?.tag_name;

  if (typeof tagName !== "string") {
    log.error("Unexpected response from GitHub: no release tag found");
    process.exit(1);
  }

  return { tag_name: tagName };
};
