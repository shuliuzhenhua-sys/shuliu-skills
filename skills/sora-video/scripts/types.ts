export interface CliArgs {
  prompt: string | null;
  promptFiles: string[];
  image: string | null;
  output: string | null;
  model: string;
  seconds: string;
  size: string;
  poll: number;
  json: boolean;
  help: boolean;
}

export interface VideoTask {
  id: string;
  object: string;
  model: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress?: number;
  created_at: number;
  video_url?: string;
  failure_reason?: string;
}

export interface CreateVideoRequest {
  model: string;
  prompt: string;
  image?: string;
  seconds?: string;
  size?: string;
}
