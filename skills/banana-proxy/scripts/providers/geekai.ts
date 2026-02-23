import type { CliArgs } from "../types";

const HARDCODED_GEEKAI_BASE_URL = "https://geekai.co/api/v1";
const DEFAULT_GEEKAI_IMAGE_MODEL = "nano-banana-2";

type GeekAIImageData = {
  url?: string;
  b64_json?: string;
};

type GeekAIImageResponse = {
  data?: GeekAIImageData[];
};

export function getDefaultModel(): string {
  return process.env.GEEKAI_IMAGE_MODEL || DEFAULT_GEEKAI_IMAGE_MODEL;
}

function getGeekAiApiKey(): string | null {
  return process.env.GEEKAI_API_KEY || null;
}

function getGeekAiBaseUrl(): string {
  return HARDCODED_GEEKAI_BASE_URL.replace(/\/+$/g, "");
}

function normalizeNanoBanana2Size(args: CliArgs): "1K" | "2K" | "4K" {
  if (args.imageSize === "4K") return "4K";
  if (args.imageSize === "2K") return "2K";
  if (args.imageSize === "1K") return "1K";
  return args.quality === "2k" ? "2K" : "1K";
}

function buildGeekAiImageSize(args: CliArgs, model: string): string {
  if (model.includes("nano-banana-2")) {
    return normalizeNanoBanana2Size(args);
  }
  if (args.imageSize === "4K") return "2048x2048";
  if (args.imageSize === "2K") return "1536x1536";
  if (args.imageSize === "1K") return "1024x1024";
  return args.quality === "2k" ? "1536x1536" : "1024x1024";
}

function toQuality(args: CliArgs): string {
  return args.quality === "2k" ? "high" : "medium";
}

function addAspectRatioToPrompt(prompt: string, ar: string | null): string {
  if (!ar) return prompt;
  return `${prompt} Aspect ratio: ${ar}.`;
}

async function fetchImageByUrl(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GeekAI image download error (${res.status}): ${err}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export async function generateImage(
  prompt: string,
  args: CliArgs,
  model = getDefaultModel()
): Promise<Uint8Array> {
  const apiKey = getGeekAiApiKey();
  if (!apiKey) throw new Error("GEEKAI_API_KEY is required for GeekAI fallback");

  const promptWithAspect = addAspectRatioToPrompt(prompt, args.aspectRatio);
  const body = {
    model,
    prompt: promptWithAspect,
    n: 1,
    size: buildGeekAiImageSize(args, model),
    quality: toQuality(args),
    response_format: "url",
    async: false,
    retries: 0,
  };

  const res = await fetch(`${getGeekAiBaseUrl()}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GeekAI API error (${res.status}): ${err}`);
  }

  const json = (await res.json()) as GeekAIImageResponse;
  const first = json.data?.[0];
  if (!first) throw new Error("GeekAI returned empty data");

  if (first.url) {
    return fetchImageByUrl(first.url);
  }

  if (first.b64_json) {
    return Uint8Array.from(Buffer.from(first.b64_json, "base64"));
  }

  throw new Error("GeekAI response does not contain image data");
}
