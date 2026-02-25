import { type CreateVideoRequest, type VideoTask } from "../types";

const BASE_URL = "https://lnapi.com/v1";

export function getApiKey(): string {
  const key = process.env.LNAPI_KEY;
  if (!key) {
    throw new Error("LNAPI_KEY is not set in environment");
  }
  return key;
}

export async function createVideoTask(request: CreateVideoRequest): Promise<VideoTask> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/videos`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create video task: ${res.status} ${res.statusText} - ${text}`);
  }

  return (await res.json()) as VideoTask;
}

export async function getTaskStatus(taskId: string): Promise<VideoTask> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/videos/${taskId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get task status: ${res.status} ${res.statusText} - ${text}`);
  }

  return (await res.json()) as VideoTask;
}

export async function downloadVideo(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download video: ${res.status} ${res.statusText}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
