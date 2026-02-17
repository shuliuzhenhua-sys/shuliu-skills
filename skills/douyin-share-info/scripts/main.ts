import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";

type CliArgs = {
  shareUrl: string | null;
  rawPath: string | null;
  json: boolean;
  help: boolean;
};

type TikHubResponse = {
  code?: number;
  message?: string;
  request_id?: string;
  data?: {
    aweme_detail?: {
      aweme_id?: string;
      desc?: string;
      author?: {
        uid?: string;
        sec_uid?: string;
        unique_id?: string;
        nickname?: string;
      };
      music?: {
        play_url?: {
          url_list?: string[];
        };
      };
      video?: {
        origin_cover?: {
          url_list?: string[];
        };
        bit_rate?: Array<{
          gear_name?: string;
          quality_type?: number;
          bit_rate?: number;
          play_addr?: {
            url_list?: string[];
          };
        }>;
      };
    };
  };
};

type NormalizedOutput = {
  share_url: string;
  aweme_id: string | null;
  desc: string | null;
  author: {
    uid: string | null;
    sec_uid: string | null;
    unique_id: string | null;
    nickname: string | null;
  };
  cover_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  video_url_first_available: string | null;
  video_quality_selected: string | null;
  video_bit_rate_count: number;
  api: {
    code: number | null;
    message: string | null;
    request_id: string | null;
  };
};

function printUsage(): void {
  console.log(`Usage:
  npx -y bun scripts/main.ts --share-url "https://v.douyin.com/xxxx/" --json

Options:
  --share-url <url>        Douyin share URL (required)
  --url <url>              Alias of --share-url
  --raw <path>             Save raw TikHub response JSON
  --json                   Output JSON (default: true)
  -h, --help               Show help

Environment variables:
  TIKHUB_API_KEY           API key for TikHub (required)
  TIKHUB_BASE_URL          API base URL (default: https://api.tikhub.io)

Env file load order: CLI > process.env > <cwd>/.baoyu-skills/.env > ~/.baoyu-skills/.env`);
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    shareUrl: null,
    rawPath: null,
    json: true,
    help: false,
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

    if (a === "--share-url" || a === "--url") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.shareUrl = v;
      continue;
    }

    if (a === "--raw") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --raw");
      out.rawPath = v;
      continue;
    }

    if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    }

    if (!out.shareUrl) {
      out.shareUrl = a;
      continue;
    }

    throw new Error(`Unexpected argument: ${a}`);
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

function getRequiredApiKey(): string {
  const key = process.env.TIKHUB_API_KEY?.trim();
  if (!key) throw new Error("TIKHUB_API_KEY is required");
  return key;
}

function getBaseUrl(): string {
  return (process.env.TIKHUB_BASE_URL || "https://api.tikhub.io").replace(/\/+$/g, "");
}

function pickFirstUrl(urls: unknown): string | null {
  if (!Array.isArray(urls)) return null;
  for (const item of urls) {
    if (typeof item === "string" && item.length > 0) return item;
  }
  return null;
}

function normalizeQualityLabel(item: {
  gear_name?: string;
  quality_type?: number;
}): string {
  if (item.gear_name && item.gear_name.trim()) return item.gear_name.trim().toLowerCase();
  if (typeof item.quality_type === "number") return `quality_type_${item.quality_type}`;
  return "unknown";
}

function pickVideoUrls(
  bitRates: Array<{
    gear_name?: string;
    quality_type?: number;
    bit_rate?: number;
    play_addr?: { url_list?: string[] };
  }> | undefined
): { firstUrl: string | null; quality: string | null; count: number } {
  if (!Array.isArray(bitRates) || bitRates.length === 0) {
    return { firstUrl: null, quality: null, count: 0 };
  }

  let firstUrl: string | null = null;
  let firstQuality: string | null = null;

  for (const item of bitRates) {
    const currentUrl = pickFirstUrl(item.play_addr?.url_list);
    if (!firstUrl && currentUrl) {
      firstUrl = currentUrl;
      firstQuality = normalizeQualityLabel(item);
    }
  }

  return {
    firstUrl,
    quality: firstQuality,
    count: bitRates.length,
  };
}

function buildOutput(shareUrl: string, json: TikHubResponse): NormalizedOutput {
  const aweme = json.data?.aweme_detail;
  const video = aweme?.video;
  const music = aweme?.music;
  const author = aweme?.author;

  const coverUrl = pickFirstUrl(video?.origin_cover?.url_list);
  const audioUrl = pickFirstUrl(music?.play_url?.url_list);
  const videoPick = pickVideoUrls(video?.bit_rate);

  return {
    share_url: shareUrl,
    aweme_id: aweme?.aweme_id || null,
    desc: aweme?.desc || null,
    author: {
      uid: author?.uid || null,
      sec_uid: author?.sec_uid || null,
      unique_id: author?.unique_id || null,
      nickname: author?.nickname || null,
    },
    cover_url: coverUrl,
    audio_url: audioUrl,
    video_url: videoPick.firstUrl,
    video_url_first_available: videoPick.firstUrl,
    video_quality_selected: videoPick.quality,
    video_bit_rate_count: videoPick.count,
    api: {
      code: typeof json.code === "number" ? json.code : null,
      message: json.message || null,
      request_id: json.request_id || null,
    },
  };
}

async function fetchByShareUrl(shareUrl: string): Promise<TikHubResponse> {
  const apiKey = getRequiredApiKey();
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/api/v1/douyin/web/fetch_one_video_by_share_url`;

  const url = new URL(endpoint);
  url.searchParams.set("share_url", shareUrl);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const text = await res.text();
  let body: TikHubResponse;
  try {
    body = JSON.parse(text) as TikHubResponse;
  } catch {
    throw new Error(`TikHub returned non-JSON response (${res.status}): ${text.slice(0, 400)}`);
  }

  if (!res.ok) {
    throw new Error(
      `TikHub request failed (${res.status}): ${body.message || "Unknown error"}`
    );
  }

  return body;
}

async function writeRawJson(rawPath: string, data: unknown): Promise<void> {
  const fullPath = path.resolve(rawPath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  await loadEnv();

  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  if (!args.shareUrl) {
    printUsage();
    throw new Error("--share-url is required");
  }

  const raw = await fetchByShareUrl(args.shareUrl);
  if (args.rawPath) {
    await writeRawJson(args.rawPath, raw);
  }

  const output = buildOutput(args.shareUrl, raw);

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`aweme_id: ${output.aweme_id || ""}`);
  console.log(`desc: ${output.desc || ""}`);
  console.log(`cover_url: ${output.cover_url || ""}`);
  console.log(`audio_url: ${output.audio_url || ""}`);
  console.log(`video_url: ${output.video_url || ""}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
