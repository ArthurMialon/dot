import { copy, readerFromStreamReader } from "@std/io";

export const clone = async (
  repository: string,
  targetFolder: string,
): Promise<boolean> => {
  const clone = new Deno.Command("git", {
    args: ["clone", repository, targetFolder],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  copy(readerFromStreamReader(clone.stdout.getReader()), Deno.stdout);
  copy(readerFromStreamReader(clone.stderr.getReader()), Deno.stderr);

  const { success } = await clone.status;

  return !!success;
};
