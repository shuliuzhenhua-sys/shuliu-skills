export type Quality = "normal" | "2k";

export type CliArgs = {
  prompt: string | null;
  promptFiles: string[];
  imagePath: string | null;
  batchPath: string | null;
  concurrency: number;
  model: string | null;
  aspectRatio: string | null;
  quality: Quality;
  imageSize: string | null;
  referenceImages: string[];
  json: boolean;
  help: boolean;
};
