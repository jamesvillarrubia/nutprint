// src/cli/setup-statusline.ts
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
function defaultNutprintCommand() {
  return `node ${join(homedir(), ".claude", "almonds", "statusline.js")}`;
}
function defaultWrapperPath() {
  return join(homedir(), ".claude", "almonds", "statusline-wrapper.sh");
}
function planSetup(settings, nutprintCommand) {
  const current = settings.statusLine?.command;
  if (!current) return { status: "configured" };
  if (current.includes(nutprintCommand)) return { status: "already-configured" };
  return { status: "conflict", existingCommand: current };
}
function applyDirectSetup(settings, nutprintCommand) {
  return { ...settings, statusLine: { type: "command", command: nutprintCommand } };
}
function buildChainWrapper(existingCommand, nutprintCommand) {
  return `#!/usr/bin/env bash
${existingCommand}
printf ' \xB7 '
${nutprintCommand}
`;
}
function readSettings(settingsPath) {
  if (!existsSync(settingsPath)) return {};
  return JSON.parse(readFileSync(settingsPath, "utf8"));
}
function writeSettings(settingsPath, settings) {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}
`, "utf8");
}
function runSetup(settingsPath, nutprintCommand, chain, wrapperPath = defaultWrapperPath()) {
  const settings = readSettings(settingsPath);
  const plan = planSetup(settings, nutprintCommand);
  if (plan.status === "already-configured") return plan;
  if (plan.status === "conflict" && !chain) return plan;
  if (existsSync(settingsPath)) {
    copyFileSync(settingsPath, `${settingsPath}.bak`);
  }
  if (plan.status === "conflict" && chain) {
    mkdirSync(dirname(wrapperPath), { recursive: true });
    writeFileSync(wrapperPath, buildChainWrapper(plan.existingCommand, nutprintCommand), "utf8");
    chmodSync(wrapperPath, 493);
    writeSettings(settingsPath, applyDirectSetup(settings, `bash ${wrapperPath}`));
    return { status: "configured" };
  }
  writeSettings(settingsPath, applyDirectSetup(settings, nutprintCommand));
  return { status: "configured" };
}
function main() {
  const chain = process.argv.includes("--chain");
  const settingsPath = join(homedir(), ".claude", "settings.json");
  const result = runSetup(settingsPath, defaultNutprintCommand(), chain);
  process.stdout.write(JSON.stringify(result));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export {
  applyDirectSetup,
  buildChainWrapper,
  defaultNutprintCommand,
  defaultWrapperPath,
  planSetup,
  runSetup
};
