import Dot from "../dot.ts";
import * as log from "../tools/logging.ts";

interface GitHubRelease {
  tag_name: string;
}

export const latestRelease = async (): Promise<GitHubRelease> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${Dot.owner}/${Dot.repository}/releases/latest`,
    );

    const release = await response.json();

    return release as GitHubRelease;
  } catch {
    log.error("Cannot fetch latest release from GitHub");
    Deno.exit(1);
  }
};
