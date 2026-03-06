import type { CliArgs } from "../types";

const GEEKAI_MODELS = [
  "nano-banana-2",
  "gemini-3-pro-image-preview",
];

const GEEKAI_BASE_URL = "https://geekai.co/api/v1";

export function getDefaultModel(): string {
  return process.env.GEEK_IMAGE_MODEL || "nano-banana-2";
}

function getGeekAiApiKey(): string | null {
  return process.env.GEEKAI_API_KEY || null;
}

function buildUrl(pathname: string): string {
  const base = GEEKAI_BASE_URL.replace(/\/+$/g, "");
  const cleanedPath = pathname.replace(/^\/+/g, "");
  return `${base}/${cleanedPath}`;
}

export function isSupportedModel(model: string): boolean {
  return GEEKAI_MODELS.includes(model);
}

export async function generateImage(
  prompt: string,
  model: string,
  args: CliArgs
): Promise<Uint8Array> {
  const apiKey = getGeekAiApiKey();
  if (!apiKey) throw new Error("GEEKAI_API_KEY is required");

  const res = await fetch(buildUrl("images/generations"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      aspect_ratio: args.aspectRatio ?? "1:1",
      size: args.size,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GeekAI API error (${res.status}): ${err}`);
  }

  const response = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };

  const item = response.data?.[0];
  if (!item) throw new Error("No image in response");

  if (item.b64_json) {
    return Uint8Array.from(Buffer.from(item.b64_json, "base64"));
  }

  if (item.url) {
    const imageRes = await fetch(item.url);
    if (!imageRes.ok) {
      const err = await imageRes.text();
      throw new Error(`GeekAI image download error (${imageRes.status}): ${err}`);
    }
    return new Uint8Array(await imageRes.arrayBuffer());
  }

  throw new Error("No image payload found in response");
}
