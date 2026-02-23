import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { CliArgs } from "./types";
import * as googleProvider from "./providers/google";
import * as geekaiProvider from "./providers/geekai";

type BatchTaskInput = {
  prompt?: string;
  promptFile?: string;
  image?: string;
  model?: string;
  ar?: string;
  quality?: "normal" | "2k";
  imageSize?: "1K" | "2K" | "4K";
  ref?: string[];
};

type ResolvedTask = {
  prompt: string;
  imagePath: string;
  model: string;
  aspectRatio: string | null;
  quality: "normal" | "2k";
  imageSize: string | null;
  referenceImages: string[];
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
  --quality normal|2k       Quality preset (default: 2k)
  --imageSize 1K|2K|4K      Image size for Gemini (default: from quality)
  --ref <files...>          Reference images
  --json                    JSON output
  -h, --help                Show help

Environment variables:
  GOOGLE_IMAGE_MODEL        Default Google model (gemini-3-pro-image-preview)
  GEEKAI_API_KEY            GeekAI fallback API key (used when primary fails)
  GEEKAI_IMAGE_MODEL        GeekAI fallback model (default: nano-banana-2)

Env file load order: CLI args > process.env > <cwd>/.baoyu-skills/.env > ~/.baoyu-skills/.env`);
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
    quality: "2k",
    imageSize: null,
    referenceImages: [],
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

    if (a === "--quality") {
      const v = argv[++i];
      if (v !== "normal" && v !== "2k") throw new Error(`Invalid quality: ${v}`);
      out.quality = v;
      continue;
    }

    if (a === "--imageSize") {
      const v = argv[++i]?.toUpperCase();
      if (v !== "1K" && v !== "2K" && v !== "4K") throw new Error(`Invalid imageSize: ${v}`);
      out.imageSize = v;
      continue;
    }

    if (a === "--ref" || a === "--reference") {
      const { items, next } = takeMany(i);
      if (items.length === 0) throw new Error(`Missing files for ${a}`);
      out.referenceImages.push(...items);
      i = next;
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

  const homeEnv = await loadEnvFile(path.join(home, ".baoyu-skills", ".env"));
  const cwdEnv = await loadEnvFile(path.join(cwd, ".baoyu-skills", ".env"));

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

function normalizeOutputImagePath(p: string): string {
  const full = path.resolve(p);
  const ext = path.extname(full);
  if (ext) return full;
  return `${full}.png`;
}

function detectImageExtension(data: Uint8Array): ".png" | ".jpg" | ".webp" | ".gif" | null {
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return ".png";
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return ".jpg";
  }
  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return ".webp";
  }
  if (
    data.length >= 6 &&
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x38 &&
    (data[4] === 0x37 || data[4] === 0x39) &&
    data[5] === 0x61
  ) {
    return ".gif";
  }
  return null;
}

function withDetectedImageExtension(outputPath: string, imageData: Uint8Array): string {
  const detected = detectImageExtension(imageData);
  if (!detected) return outputPath;

  const currentExt = path.extname(outputPath).toLowerCase();
  if (!currentExt) return `${outputPath}${detected}`;

  const normalizedCurrent = currentExt === ".jpeg" ? ".jpg" : currentExt;
  if (normalizedCurrent === detected) return outputPath;

  const corrected = `${outputPath.slice(0, -currentExt.length)}${detected}`;
  console.error(`Warning: Output extension ${currentExt} does not match image format ${detected}, saved as ${corrected}`);
  return corrected;
}

function buildTaskArgs(baseArgs: CliArgs, task: ResolvedTask): CliArgs {
  return {
    ...baseArgs,
    prompt: task.prompt,
    promptFiles: [],
    imagePath: task.imagePath,
    batchPath: null,
    model: task.model,
    aspectRatio: task.aspectRatio,
    quality: task.quality,
    imageSize: task.imageSize,
    referenceImages: task.referenceImages,
    json: false,
    help: false,
  };
}

async function generateWithRetry(prompt: string, model: string, taskArgs: CliArgs): Promise<Uint8Array> {
  let googleError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await googleProvider.generateImage(prompt, model, taskArgs);
    } catch (e) {
      googleError = e;
      if (attempt < 2) {
        console.error("Banana proxy generation failed, retrying primary provider...");
      }
    }
  }

  console.error(`Primary provider failed. Falling back to GeekAI ${geekaiProvider.getDefaultModel()}...`);

  try {
    return await geekaiProvider.generateImage(prompt, taskArgs);
  } catch (geekaiError) {
    const primaryMsg = googleError instanceof Error ? googleError.message : String(googleError);
    const fallbackMsg = geekaiError instanceof Error ? geekaiError.message : String(geekaiError);
    throw new Error(`Primary provider failed: ${primaryMsg}; GeekAI fallback failed: ${fallbackMsg}`);
  }
}

async function loadBatchTasks(batchPath: string): Promise<BatchTaskInput[]> {
  const fullPath = path.resolve(batchPath);
  const content = await readFile(fullPath, "utf8");
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (fullPath.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error("--batch JSON must be an array");
    return parsed as BatchTaskInput[];
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      try {
        return JSON.parse(line) as BatchTaskInput;
      } catch {
        throw new Error(`Invalid JSONL at line ${idx + 1}`);
      }
    });
}

async function resolveBatchTasks(baseArgs: CliArgs, rawTasks: BatchTaskInput[]): Promise<ResolvedTask[]> {
  const tasks: ResolvedTask[] = [];
  for (let i = 0; i < rawTasks.length; i++) {
    const raw = rawTasks[i] || {};
    let prompt = (raw.prompt || "").trim();
    if (!prompt && raw.promptFile) {
      prompt = (await readFile(raw.promptFile, "utf8")).trim();
    }
    if (!prompt) throw new Error(`Batch task #${i + 1} missing prompt/promptFile`);
    if (!raw.image) throw new Error(`Batch task #${i + 1} missing image`);

    const quality = raw.quality ?? baseArgs.quality;
    if (quality !== "normal" && quality !== "2k") {
      throw new Error(`Batch task #${i + 1} has invalid quality`);
    }

    const imageSize = raw.imageSize ?? baseArgs.imageSize;
    if (imageSize && imageSize !== "1K" && imageSize !== "2K" && imageSize !== "4K") {
      throw new Error(`Batch task #${i + 1} has invalid imageSize`);
    }

    tasks.push({
      prompt,
      imagePath: normalizeOutputImagePath(raw.image),
      model: raw.model || baseArgs.model || googleProvider.getDefaultModel(),
      aspectRatio: raw.ar || baseArgs.aspectRatio,
      quality,
      imageSize: imageSize || null,
      referenceImages: raw.ref || baseArgs.referenceImages,
    });
  }
  return tasks;
}

async function runBatchGeneration(baseArgs: CliArgs, tasks: ResolvedTask[]): Promise<void> {
  const results: Array<{ index: number; image: string; ok: boolean; error?: string }> = [];
  let next = 0;
  const workerCount = Math.min(baseArgs.concurrency, tasks.length);

  const worker = async (): Promise<void> => {
    while (true) {
      const idx = next++;
      if (idx >= tasks.length) return;
      const task = tasks[idx]!;
      try {
        const taskArgs = buildTaskArgs(baseArgs, task);
        const imageData = await generateWithRetry(task.prompt, task.model, taskArgs);
        const outputPath = withDetectedImageExtension(task.imagePath, imageData);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, imageData);
        results.push({ index: idx + 1, image: outputPath, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ index: idx + 1, image: task.imagePath, ok: false, error: msg });
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  results.sort((a, b) => a.index - b.index);

  const failures = results.filter((r) => !r.ok);
  if (baseArgs.json) {
    console.log(
      JSON.stringify(
        {
          provider: "banana-gemini",
          total: tasks.length,
          success: tasks.length - failures.length,
          failed: failures.length,
          results,
        },
        null,
        2
      )
    );
  } else {
    for (const r of results) {
      if (r.ok) console.log(`[OK][${r.index}] ${r.image}`);
      else console.log(`[FAIL][${r.index}] ${r.image} :: ${r.error}`);
    }
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  await loadEnv();

  if (args.batchPath) {
    const rawTasks = await loadBatchTasks(args.batchPath);
    if (rawTasks.length === 0) {
      console.error("Error: --batch file has no tasks");
      process.exitCode = 1;
      return;
    }
    const tasks = await resolveBatchTasks(args, rawTasks);
    await runBatchGeneration(args, tasks);
    return;
  }

  let prompt: string | null = args.prompt;
  if (!prompt && args.promptFiles.length > 0) prompt = await readPromptFromFiles(args.promptFiles);
  if (!prompt) prompt = await readPromptFromStdin();

  if (!prompt) {
    console.error("Error: Prompt is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!args.imagePath) {
    console.error("Error: --image is required");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const model = args.model || googleProvider.getDefaultModel();
  const requestedOutputPath = normalizeOutputImagePath(args.imagePath);
  const imageData = await generateWithRetry(prompt, model, args);
  const outputPath = withDetectedImageExtension(requestedOutputPath, imageData);

  const dir = path.dirname(outputPath);
  await mkdir(dir, { recursive: true });
  await writeFile(outputPath, imageData);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          savedImage: outputPath,
          provider: "banana-gemini",
          model,
          prompt: prompt.slice(0, 200),
        },
        null,
        2
      )
    );
  } else {
    console.log(outputPath);
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  process.exit(1);
});
