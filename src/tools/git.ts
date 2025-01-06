import { copy, readerFromStreamReader } from "@std/io";
import * as log from "../tools/logging.ts";

export const clone = async (
  repository: string,
  targetFolder: string,
): Promise<boolean> => {
  const command = new Deno.Command("git", {
    args: ["clone", repository, targetFolder],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  copy(readerFromStreamReader(command.stdout.getReader()), Deno.stdout);
  copy(readerFromStreamReader(command.stderr.getReader()), Deno.stderr);

  const { success } = await command.status;

  return !!success;
};

const statusCommand = (repository: string) => {
  return new Deno.Command("git", {
    args: ["-C", repository, "status", "--short"],
    stdout: "piped",
    stderr: "piped",
  }).spawn();
};

export const status = async (
  repository: string,
): Promise<boolean> => {
  const command = statusCommand(repository);

  copy(readerFromStreamReader(command.stdout.getReader()), Deno.stdout);
  copy(readerFromStreamReader(command.stderr.getReader()), Deno.stderr);

  const { success } = await command.status;

  return !!success;
};

export const hasChange = async (
  repository: string,
): Promise<boolean> => {
  const command = statusCommand(repository);

  const output = await command.output();

  const status = new TextDecoder().decode(output.stdout);

  return !!Number(status.trim().length);
};

export const add = async (
  repository: string,
): Promise<boolean> => {
  const command = new Deno.Command("git", {
    args: ["-C", repository, "add", "."],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  copy(readerFromStreamReader(command.stdout.getReader()), Deno.stdout);
  copy(readerFromStreamReader(command.stderr.getReader()), Deno.stderr);

  const { success } = await command.status;

  return !!success;
};

export const commit = async (
  repository: string,
  message: string,
): Promise<boolean> => {
  const command = new Deno.Command("git", {
    args: ["-C", repository, "commit", "-m", message],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  copy(readerFromStreamReader(command.stdout.getReader()), Deno.stdout);
  copy(readerFromStreamReader(command.stderr.getReader()), Deno.stderr);

  const { success } = await command.status;

  return !!success;
};

export const getCurrentBranch = async (repository: string) => {
  const command = new Deno.Command("git", {
    args: ["-C", repository, "rev-parse", "--abbrev-ref", "HEAD"],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const output = await command.output();

  const branch = new TextDecoder().decode(output.stdout);

  return branch.trim();
};

export const push = async (
  repository: string,
  branch: string,
): Promise<boolean> => {
  const command = new Deno.Command("git", {
    args: ["-C", repository, "push", "origin", branch],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  copy(readerFromStreamReader(command.stdout.getReader()), Deno.stdout);
  copy(readerFromStreamReader(command.stderr.getReader()), Deno.stderr);

  const { success } = await command.status;

  return !!success;
};

export const pull = async (
  repository: string,
  branch: string,
): Promise<boolean> => {
  const command = new Deno.Command("git", {
    args: ["-C", repository, "pull", "origin", branch],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  copy(readerFromStreamReader(command.stdout.getReader()), Deno.stdout);
  copy(readerFromStreamReader(command.stderr.getReader()), Deno.stderr);

  const { success } = await command.status;

  return !!success;
};
