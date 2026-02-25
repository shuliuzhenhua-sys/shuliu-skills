import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { readFile, writeFile } from "node:fs/promises";
import type { CliArgs, VideoTask } from "./types";
import * as lnapi from "./providers/lnapi";

function printUsage(): void {
  console.log(`Usage:
  npx -y bun scripts/main.ts --prompt "A video prompt" --output video.mp4
  npx -y bun scripts/main.ts --prompt "Animate this" --image input.jpg --output video.mp4

Options:
  -p, --prompt <text>       Prompt text
  --promptfiles <files...>  Read prompt from files (concatenated)
  --image <path>            Input image path or URL (for image-to-video)
  --output <path>           Output video path (required)
  --model <id>              Model ID (default: sora-2)
  --seconds <10|15>         Duration in seconds (default: 10)
  --size <WxH>              Resolution (1280x720, 720x1280, 720x720) (default: 720x1280)
  --poll <ms>               Polling interval in ms (default: 5000)
  --json                    JSON output
  -h, --help                Show help

Environment variables:
  LNAPI_KEY                 API Key for lnapi.com
`);
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    prompt: null,
    promptFiles: [],
    image: null,
    output: null,
    model: "sora-2",
    seconds: "10",
    size: "720x1280",
    poll: 5000,
    json: false,
    help: false,
  };

  const positional: string[] = [];

  const takeMany = (i: number): { items: string[]; next: number } => {
    const items: string[] = [];
    let j = i + 1;
    while (j < argv.length) {
      const v = argv[j]!;
      if (v.startsWith("-")) break;
      items.push(v);
      j++;
    }
    return { items, next: j - 1 };
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;

    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }

    if (a === "--json") {
      out.json = true;
      continue;
    }

    if (a === "--prompt" || a === "-p") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.prompt = v;
      continue;
    }

    if (a === "--promptfiles") {
      const { items, next } = takeMany(i);
      if (items.length === 0) throw new Error("Missing files for --promptfiles");
      out.promptFiles.push(...items);
      i = next;
      continue;
    }

    if (a === "--image") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --image");
      out.image = v;
      continue;
    }

    if (a === "--output") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --output");
      out.output = v;
      continue;
    }

    if (a === "--model") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --model");
      out.model = v;
      continue;
    }

    if (a === "--seconds") {
      const v = argv[++i];
      if (v !== "10" && v !== "15") throw new Error(`Invalid seconds: ${v}`);
      out.seconds = v;
      continue;
    }

    if (a === "--size") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --size");
      out.size = v;
      continue;
    }

    if (a === "--poll") {
      const v = Number(argv[++i]);
      if (!Number.isInteger(v) || v <= 0) throw new Error("Invalid --poll, must be a positive integer");
      out.poll = v;
      continue;
    }

    if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    }

    positional.push(a);
  }

  if (!out.prompt && out.promptFiles.length === 0 && positional.length > 0) {
    out.prompt = positional.join(" ");
  }

  return out;
}

async function loadEnvFile(p: string): Promise<Record<string, string>> {
  try {
    const content = await readFile(p, "utf8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

async function loadEnv(): Promise<void> {
  const home = homedir();
  const cwd = process.cwd();

  const homeEnv = await loadEnvFile(path.join(home, ".shuliu-skills", ".env"));
  const cwdEnv = await loadEnvFile(path.join(cwd, ".shuliu-skills", ".env"));

  for (const [k, v] of Object.entries(homeEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(cwdEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

async function readPromptFromFiles(files: string[]): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    parts.push(await readFile(f, "utf8"));
  }
  return parts.join("\n\n");
}

async function readPromptFromStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;
  try {
    const t = await Bun.stdin.text();
    const v = t.trim();
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

async function getImageAsBase64(imagePath: string): Promise<string> {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath; // Return URL directly
  }

  const fullPath = path.resolve(imagePath);
  const data = await readFile(fullPath);
  const ext = path.extname(fullPath).toLowerCase().replace(".", "");
  const mimeType = ext === "jpg" ? "jpeg" : ext;
  
  return `data:image/${mimeType};base64,${data.toString("base64")}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  await loadEnv();

  let prompt: string | null = args.prompt;
  if (!prompt && args.promptFiles.length > 0) prompt = await readPromptFromFiles(args.promptFiles);
  if (!prompt) prompt = await readPromptFromStdin();
  
  if (!prompt) {
    console.error("Error: Prompt is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!args.output) {
    console.error("Error: Output path is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const request = {
    model: args.model,
    prompt: prompt,
    seconds: args.seconds,
    size: args.size,
    image: args.image ? await getImageAsBase64(args.image) : undefined,
  };

  if (!args.json) {
    console.log(`Starting video generation...`);
    console.log(`Prompt: ${prompt}`);
    if (request.image) console.log(`Image input provided`);
  }

  const task = await lnapi.createVideoTask(request);
  
  if (!args.json) {
    console.log(`Task created: ${task.id}`);
  }

  let currentStatus = task.status;
  let finalTask = task;

  while (currentStatus === "queued" || currentStatus === "in_progress") {
    if (!args.json) {
      const progress = finalTask.progress ?? 0;
      process.stdout.write(`Status: ${currentStatus} (Progress: ${progress}%) \r`);
    }
    
    await new Promise((resolve) => setTimeout(resolve, args.poll));
    
    finalTask = await lnapi.getTaskStatus(task.id);
    currentStatus = finalTask.status;
  }

  if (!args.json) {
    console.log(`\nFinal Status: ${currentStatus}`);
  }

  if (currentStatus === "completed" && finalTask.video_url) {
    if (!args.json) {
      console.log(`Downloading video from ${finalTask.video_url}...`);
    }
    const videoData = await lnapi.downloadVideo(finalTask.video_url);
    const outputPath = path.resolve(args.output);
    await writeFile(outputPath, videoData);
    
    if (args.json) {
      console.log(JSON.stringify({
        savedVideo: outputPath,
        provider: "lnapi-sora",
        model: args.model,
        prompt: prompt,
        task: finalTask
      }, null, 2));
    } else {
      console.log(`Video saved to: ${outputPath}`);
    }
  } else {
    if (args.json) {
      console.log(JSON.stringify({
        error: finalTask.failure_reason || "Unknown error",
        task: finalTask
      }, null, 2));
    } else {
      console.error(`Generation failed: ${finalTask.failure_reason}`);
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  process.exit(1);
});
