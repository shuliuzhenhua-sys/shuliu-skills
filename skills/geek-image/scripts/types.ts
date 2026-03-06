export type ImageSize = "1K" | "2K" | "4K";

export type CliArgs = {
  prompt: string | null;
  promptFiles: string[];
  imagePath: string | null;
  batchPath: string | null;
  concurrency: number;
  model: string | null;
  aspectRatio: string | null;
  size: ImageSize;
  json: boolean;
  help: boolean;
};
