import { Command } from "commander";
import { runProfileShow } from "./show";
import { runProfileList } from "./list";
import { profileUseCommand } from "./use";
import {
  profileAddCommand,
  profileInitCommand,
  profileRemoveCommand,
} from "./manage";

const profileListCommand = new Command("list")
  .description("List the profiles declared in dot.json")
  .action(runProfileList);

export const profileCommand = new Command("profile")
  .description("Manage the profile used on this machine")
  .action(runProfileShow)
  .addCommand(profileListCommand)
  .addCommand(profileUseCommand)
  .addCommand(profileAddCommand)
  .addCommand(profileRemoveCommand)
  .addCommand(profileInitCommand);

export default profileCommand;
