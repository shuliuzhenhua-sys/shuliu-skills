import path from "node:path";
import { readFile } from "node:fs/promises";
import type { CliArgs } from "../types";

const GOOGLE_MULTIMODAL_MODELS = ["gemini-3-pro-image-preview", "gemini-3-flash-preview"];
const HARDCODED_GOOGLE_BASE_URL = "https://lnapi.com";

export function getDefaultModel(): string {
  return process.env.GOOGLE_IMAGE_MODEL || "gemini-3-pro-image-preview";
}

function normalizeGoogleModelId(model: string): string {
  return model.startsWith("models/") ? model.slice("models/".length) : model;
}

function isGoogleMultimodal(model: string): boolean {
  const normalized = normalizeGoogleModelId(model);
  return GOOGLE_MULTIMODAL_MODELS.some((m) => normalized.includes(m));
}

function getGoogleApiKey(): string | null {
  return process.env.LNAPI_KEY || null;
}

function getGoogleImageSize(args: CliArgs): "1K" | "2K" | "4K" {
  if (args.imageSize) return args.imageSize as "1K" | "2K" | "4K";
  return args.quality === "2k" ? "2K" : "1K";
}

function getGoogleBaseUrl(): string {
  const base = HARDCODED_GOOGLE_BASE_URL;
  return base.replace(/\/+$/g, "");
}

function buildGoogleUrl(pathname: string): string {
  const base = getGoogleBaseUrl();
  const cleanedPath = pathname.replace(/^\/+/g, "");
  if (base.endsWith("/v1beta")) return `${base}/${cleanedPath}`;
  return `${base}/v1beta/${cleanedPath}`;
}

function toModelPath(model: string): string {
  const modelId = normalizeGoogleModelId(model);
  return `models/${modelId}`;
}

async function postGoogleJson<T>(pathname: string, body: unknown): Promise<T> {
  const apiKey = getGoogleApiKey();
  if (!apiKey) throw new Error("LNAPI_KEY is required");

  const res = await fetch(buildGoogleUrl(pathname), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google API error (${res.status}): ${err}`);
  }

  return (await res.json()) as T;
}

function addAspectRatioToPrompt(prompt: string, ar: string | null): string {
  if (!ar) return prompt;
  return `${prompt} Aspect ratio: ${ar}.`;
}

async function readImageAsBase64(p: string): Promise<{ data: string; mimeType: string }> {
  const buf = await readFile(p);
  const ext = path.extname(p).toLowerCase();
  let mimeType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
  else if (ext === ".gif") mimeType = "image/gif";
  else if (ext === ".webp") mimeType = "image/webp";
  return { data: buf.toString("base64"), mimeType };
}

function extractInlineImageData(response: {
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
}): string | null {
  for (const candidate of response.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      const data = part.inlineData?.data;
      if (typeof data === "string" && data.length > 0) return data;
    }
  }
  return null;
}

async function generateWithGemini(
  prompt: string,
  model: string,
  args: CliArgs
): Promise<Uint8Array> {
  const promptWithAspect = addAspectRatioToPrompt(prompt, args.aspectRatio);
  const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
  for (const refPath of args.referenceImages) {
    const { data, mimeType } = await readImageAsBase64(refPath);
    parts.push({ inlineData: { data, mimeType } });
  }
  parts.push({ text: promptWithAspect });

  const imageConfig: { imageSize: "1K" | "2K" | "4K" } = {
    imageSize: getGoogleImageSize(args),
  };

  console.log("Generating image with Gemini...", imageConfig);
  const response = await postGoogleJson<{
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
  }>(`${toModelPath(model)}:generateContent`, {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig,
    },
  });
  console.log("Generation completed.");

  const imageData = extractInlineImageData(response);
  if (imageData) return Uint8Array.from(Buffer.from(imageData, "base64"));

  throw new Error("No image in response");
}

export async function generateImage(
  prompt: string,
  model: string,
  args: CliArgs
): Promise<Uint8Array> {
  if (!isGoogleMultimodal(model) && args.referenceImages.length > 0) {
    console.error("Warning: Reference images are only supported with Gemini multimodal models.");
  }

  return generateWithGemini(prompt, model, args);
}
