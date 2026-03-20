#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "./src/cli.js";
import { installRuntimeConfig, loadSkillConfig } from "./src/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillDir = dirname(__dirname);

try {
  const config = await loadSkillConfig({
    skillDir,
    configPath: process.argv.includes("--config")
      ? process.argv[process.argv.indexOf("--config") + 1]
      : join(skillDir, "config.json"),
  });
  installRuntimeConfig(config);
  await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
