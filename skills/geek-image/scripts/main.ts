import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { CliArgs, ImageSize } from "./types";
import * as geekaiProvider from "./providers/geekai";

type BatchTaskInput = {
  prompt?: string;
  promptFile?: string;
  image?: string;
  model?: string;
  ar?: string;
  size?: ImageSize;
};

type ResolvedTask = {
  prompt: string;
  imagePath: string;
  model: string;
  aspectRatio: string | null;
  size: ImageSize;
};

function printUsage(): void {
  console.log(`Usage:
  npx -y bun scripts/main.ts --prompt "A cat" --image cat.png
  npx -y bun scripts/main.ts --prompt "A landscape" --image landscape.png --ar 16:9
  npx -y bun scripts/main.ts --promptfiles system.md content.md --image out.png
  npx -y bun scripts/main.ts --batch jobs.jsonl --concurrency 4

Options:
  -p, --prompt <text>       Prompt text
  --promptfiles <files...>  Read prompt from files (concatenated)
  --image <path>            Output image path (required)
  --batch <file>            Batch tasks file (.json or .jsonl)
  --concurrency <n>         Parallel workers for --batch (default: 4)
  -m, --model <id>          Model ID
  --ar <ratio>              Aspect ratio (e.g., 16:9, 1:1, 4:3)
  --size 1K|2K|4K           Image size (default: 2K)
  --json                    JSON output
  -h, --help                Show help

Environment variables:
  GEEK_IMAGE_MODEL          Default GeekAI model (nano-banana-2)
  GEEKAI_API_KEY            GeekAI API key

Env file load order: CLI args > process.env > <cwd>/.shuliu-skills/.env > ~/.shuliu-skills/.env`);
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    prompt: null,
    promptFiles: [],
    imagePath: null,
    batchPath: null,
    concurrency: 4,
    model: null,
    aspectRatio: null,
    size: "2K",
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
      out.imagePath = v;
      continue;
    }

    if (a === "--batch") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --batch");
      out.batchPath = v;
      continue;
    }

    if (a === "--concurrency") {
      const v = Number(argv[++i]);
      if (!Number.isInteger(v) || v <= 0) throw new Error("Invalid --concurrency, must be a positive integer");
      out.concurrency = v;
      continue;
    }

    if (a === "--model" || a === "-m") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.model = v;
      continue;
    }

    if (a === "--ar") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --ar");
      out.aspectRatio = v;
      continue;
    }

    if (a === "--size") {
      const v = argv[++i]?.toUpperCase() as ImageSize | undefined;
      if (v !== "1K" && v !== "2K" && v !== "4K") throw new Error(`Invalid size: ${v}`);
      out.size = v;
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
  const parts = await Promise.all(files.map((file) => readFile(file, "utf8")));
  return parts.join("\n\n").trim();
}

function ensureModel(model: string): string {
  if (!geekaiProvider.isSupportedModel(model)) {
    throw new Error(`Unsupported model: ${model}`);
  }
  return model;
}

async function resolveTask(args: CliArgs): Promise<ResolvedTask> {
  const prompt = args.promptFiles.length > 0
    ? await readPromptFromFiles(args.promptFiles)
    : (args.prompt ?? "").trim();

  if (!prompt) throw new Error("Prompt is required");
  if (!args.imagePath) throw new Error("--image is required");

  return {
    prompt,
    imagePath: args.imagePath,
    model: ensureModel(args.model || geekaiProvider.getDefaultModel()),
    aspectRatio: args.aspectRatio,
    size: args.size,
  };
}

async function parseBatchFile(batchPath: string): Promise<BatchTaskInput[]> {
  const content = await readFile(batchPath, "utf8");
  if (batchPath.endsWith(".jsonl")) {
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as BatchTaskInput);
  }

  const data = JSON.parse(content) as unknown;
  if (!Array.isArray(data)) throw new Error("Batch file must be a JSON array or JSONL");
  return data as BatchTaskInput[];
}

async function resolveBatchTasks(batchPath: string, defaults: CliArgs): Promise<ResolvedTask[]> {
  const tasks = await parseBatchFile(batchPath);
  return Promise.all(tasks.map(async (task) => {
    const prompt = task.promptFile
      ? (await readFile(task.promptFile, "utf8")).trim()
      : (task.prompt ?? "").trim();
    if (!prompt) throw new Error("Each batch task requires prompt or promptFile");
    if (!task.image) throw new Error("Each batch task requires image");

    return {
      prompt,
      imagePath: task.image,
      model: ensureModel(task.model || defaults.model || geekaiProvider.getDefaultModel()),
      aspectRatio: task.ar || defaults.aspectRatio,
      size: task.size || defaults.size,
    };
  }));
}

async function writeImage(imagePath: string, data: Uint8Array): Promise<void> {
  await mkdir(path.dirname(imagePath), { recursive: true });
  await writeFile(imagePath, data);
}

async function runTask(task: ResolvedTask): Promise<{ image: string; model: string; size: string; ar: string | null }> {
  const image = await geekaiProvider.generateImage(task.prompt, task.model, {
    prompt: task.prompt,
    promptFiles: [],
    imagePath: task.imagePath,
    batchPath: null,
    concurrency: 1,
    model: task.model,
    aspectRatio: task.aspectRatio,
    size: task.size,
    json: false,
    help: false,
  });

  await writeImage(task.imagePath, image);
  return {
    image: path.resolve(task.imagePath),
    model: task.model,
    size: task.size,
    ar: task.aspectRatio,
  };
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  async function next(): Promise<void> {
    const current = index++;
    if (current >= items.length) return;
    await worker(items[current]!);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

async function main(): Promise<void> {
  await loadEnv();
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (args.batchPath) {
    const tasks = await resolveBatchTasks(args.batchPath, args);
    const results: Array<{ image: string; model: string; size: string; ar: string | null }> = [];

    await runWithConcurrency(tasks, args.concurrency, async (task) => {
      const result = await runTask(task);
      results.push(result);
      if (!args.json) console.log(`Saved: ${result.image}`);
    });

    if (args.json) {
      console.log(JSON.stringify({ ok: true, count: results.length, results }, null, 2));
    }
    return;
  }

  const task = await resolveTask(args);
  const result = await runTask(task);

  if (args.json) {
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }

  console.log(`Saved: ${result.image}`);
  console.log(`Model: ${result.model}`);
  console.log(`Size: ${result.size}`);
  if (result.ar) console.log(`Aspect ratio: ${result.ar}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
