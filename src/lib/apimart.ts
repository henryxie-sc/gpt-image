import { Buffer } from "node:buffer";

import type { ApiImageSize, Resolution } from "@/lib/ecommerce";

export type UploadImageInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export type UploadedImage = {
  url: string;
  filename?: string;
  content_type?: string;
  bytes?: number;
  created_at?: number;
};

export type GenerationSubmission = {
  taskId: string;
  status: string;
  raw: unknown;
};

export type ApimartTask = {
  id?: string;
  status: string;
  progress?: number;
  error?: unknown;
  result?: {
    images?: Array<{
      url?: string | string[];
      expires_at?: number;
    }>;
  };
  raw: unknown;
};

export class ApimartError extends Error {
  readonly status?: number;
  readonly payload?: unknown;

  constructor(message: string, options: { status?: number; payload?: unknown } = {}) {
    super(message);
    this.name = "ApimartError";
    this.status = options.status;
    this.payload = options.payload;
  }
}

function getBaseUrl() {
  return (process.env.APIMART_BASE_URL || "https://api.apimart.ai").replace(/\/+$/u, "");
}

export function hasApimartApiKey() {
  return Boolean(process.env.APIMART_API_KEY?.trim());
}

function getApiKey() {
  const apiKey = process.env.APIMART_API_KEY?.trim();

  if (!apiKey) {
    throw new ApimartError("未配置 APIMART_API_KEY。");
  }

  return apiKey;
}

function endpoint(path: string) {
  return `${getBaseUrl()}${path}`;
}

async function readResponsePayload(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function payloadMessage(payload: unknown) {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const error = asRecord(record?.error);

  return (
    stringValue(record?.message) ||
    stringValue(record?.detail) ||
    stringValue(error?.message) ||
    stringValue(data?.message)
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function expectJson(response: Response, fallbackMessage: string) {
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new ApimartError(payloadMessage(payload) || fallbackMessage, {
      status: response.status,
      payload
    });
  }

  return payload;
}

export function parseUploadResponse(payload: unknown): UploadedImage {
  const record = asRecord(payload);
  const url = stringValue(record?.url);

  if (!record || !url) {
    throw new ApimartError("APIMart 上传响应缺少图片 URL。", { payload });
  }

  return {
    url,
    filename: stringValue(record.filename),
    content_type: stringValue(record.content_type),
    bytes: typeof record.bytes === "number" ? record.bytes : undefined,
    created_at: typeof record.created_at === "number" ? record.created_at : undefined
  };
}

export function parseGenerationResponse(payload: unknown): GenerationSubmission {
  const record = asRecord(payload);
  const data = record?.data;
  const item = Array.isArray(data) ? asRecord(data[0]) : asRecord(data) || record;
  const taskId = stringValue(item?.task_id) || stringValue(item?.id);
  const status = stringValue(item?.status) || "submitted";

  if (!taskId) {
    throw new ApimartError("APIMart 生成响应缺少 task_id。", { payload });
  }

  return {
    taskId,
    status,
    raw: payload
  };
}

export function parseTaskResponse(payload: unknown): ApimartTask {
  const record = asRecord(payload);
  const data = asRecord(record?.data) || record;
  const status = stringValue(data?.status);

  if (!data || !status) {
    throw new ApimartError("APIMart 任务响应缺少 status。", { payload });
  }

  return {
    id: stringValue(data.id),
    status,
    progress: typeof data.progress === "number" ? data.progress : undefined,
    error: data.error,
    result: asRecord(data.result) as ApimartTask["result"],
    raw: payload
  };
}

export function extractResultImageUrl(task: ApimartTask) {
  const image = task.result?.images?.[0];
  const url = image?.url;

  if (Array.isArray(url)) {
    return url.find((item) => typeof item === "string" && item.trim())?.trim();
  }

  return stringValue(url);
}

export function extractResultExpiresAt(task: ApimartTask) {
  return task.result?.images?.[0]?.expires_at;
}

export function extractTaskError(task: ApimartTask) {
  const error = task.error;

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  const record = asRecord(error);
  return stringValue(record?.message) || stringValue(record?.detail) || "生成任务失败。";
}

export async function uploadImage(input: UploadImageInput) {
  const formData = new FormData();
  const bytes = new Uint8Array(input.buffer.byteLength);
  bytes.set(input.buffer);
  const blob = new Blob([bytes], { type: input.contentType });

  formData.set("file", blob, input.filename);

  const response = await fetch(endpoint("/v1/uploads/images"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`
    },
    body: formData
  });

  const payload = await expectJson(response, "APIMart 图片上传失败。");
  return parseUploadResponse(payload);
}

export async function createImageGeneration(input: {
  prompt: string;
  imageUrls?: string[];
  size: ApiImageSize;
  resolution: Resolution;
}) {
  const response = await fetch(endpoint("/v1/images/generations"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: input.prompt,
      n: 1,
      size: input.size,
      resolution: input.resolution,
      ...(input.imageUrls && input.imageUrls.length > 0 ? { image_urls: input.imageUrls } : {}),
      official_fallback: false
    })
  });

  const payload = await expectJson(response, "APIMart 创建生成任务失败。");
  return parseGenerationResponse(payload);
}

export async function getTaskStatus(taskId: string) {
  const response = await fetch(
    endpoint(`/v1/tasks/${encodeURIComponent(taskId)}?language=zh`),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getApiKey()}`
      }
    }
  );

  const payload = await expectJson(response, "APIMart 查询任务失败。");
  return parseTaskResponse(payload);
}

export function normalizeTaskStatus(status: string) {
  if (status === "completed" || status === "failed") {
    return status;
  }

  if (status === "submitted" || status === "processing") {
    return status;
  }

  return "processing";
}
