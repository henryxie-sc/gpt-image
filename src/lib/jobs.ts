import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { UploadImageInput } from "@/lib/apimart";
import type { ImageSize, Resolution, TemplateId } from "@/lib/ecommerce";

export type JobStatus = "uploading" | "submitted" | "processing" | "completed" | "failed";

export type ReferenceImageRecord = {
  originalName: string;
  savedName: string;
  contentType: string;
  bytes: number;
  localPath: string;
  uploadedUrl?: string;
  uploadedAt?: string;
};

export type JobResultRecord = {
  remoteUrl: string;
  localPath: string;
  savedName: string;
  contentType: string;
  bytes: number;
  expiresAt?: number;
  downloadedAt: string;
};

export type JobRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  productName: string;
  sellingPoints: string;
  promoText: string;
  templateId: TemplateId;
  size: ImageSize;
  resolution: Resolution;
  prompt: string;
  status: JobStatus;
  progress: number;
  taskId?: string;
  error?: string;
  referenceImages: ReferenceImageRecord[];
  result?: JobResultRecord;
  apimart?: {
    generation?: unknown;
    task?: unknown;
  };
};

export type ClientJob = Omit<JobRecord, "result"> & {
  result?: JobResultRecord & {
    localUrl: string;
  };
};

export type JobSummary = Pick<
  ClientJob,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "productName"
  | "templateId"
  | "size"
  | "resolution"
  | "status"
  | "progress"
  | "taskId"
  | "error"
  | "result"
>;

export type PersistedReference = {
  record: ReferenceImageRecord;
  uploadInput: UploadImageInput;
};

export function nowIso() {
  return new Date().toISOString();
}

export function createJobId() {
  return randomUUID();
}

export function getStorageRoot() {
  const configured = process.env.APIMART_STORAGE_DIR?.trim();

  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), "storage");
}

function jobsRoot() {
  return path.join(getStorageRoot(), "jobs");
}

function assertSafeJobId(jobId: string) {
  if (!/^[0-9a-f-]{36}$/iu.test(jobId)) {
    throw new Error("无效的任务 ID。");
  }
}

export function getJobDir(jobId: string) {
  assertSafeJobId(jobId);
  return path.join(jobsRoot(), jobId);
}

export function metadataPath(jobId: string) {
  return path.join(getJobDir(jobId), "metadata.json");
}

export async function ensureJobDir(jobId: string) {
  const dir = getJobDir(jobId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeJobRecord(job: JobRecord) {
  await ensureJobDir(job.id);
  await writeFile(metadataPath(job.id), `${JSON.stringify(job, null, 2)}\n`, "utf8");
  return job;
}

export async function readJobRecord(jobId: string) {
  const content = await readFile(metadataPath(jobId), "utf8");
  return JSON.parse(content) as JobRecord;
}

export async function listJobSummaries(limit = 50): Promise<JobSummary[]> {
  let entries: string[];

  try {
    entries = await readdir(jobsRoot());
  } catch {
    return [];
  }

  const jobs = await Promise.all(
    entries.map(async (entry) => {
      try {
        const job = await readJobRecord(entry);
        return toJobSummary(toClientJob(job));
      } catch {
        return undefined;
      }
    })
  );

  return jobs
    .filter((job): job is JobSummary => Boolean(job))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

export async function updateJobRecord(jobId: string, patch: Partial<JobRecord>) {
  const current = await readJobRecord(jobId);
  const next: JobRecord = {
    ...current,
    ...patch,
    updatedAt: nowIso()
  };

  await writeJobRecord(next);
  return next;
}

export function toClientJob(job: JobRecord): ClientJob {
  return {
    ...job,
    result: job.result
      ? {
          ...job.result,
          localUrl: resultAssetUrl(job.id, job.result.savedName)
        }
      : undefined
  };
}

function toJobSummary(job: ClientJob): JobSummary {
  return {
    id: job.id,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    productName: job.productName,
    templateId: job.templateId,
    size: job.size,
    resolution: job.resolution,
    status: job.status,
    progress: job.progress,
    taskId: job.taskId,
    error: job.error,
    result: job.result
  };
}

export async function persistReferenceFiles(jobId: string, files: File[]) {
  const dir = await ensureJobDir(jobId);
  const references: PersistedReference[] = [];

  for (const [index, file] of files.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const savedName = `input-${index + 1}-${sanitizeFileName(file.name)}`;
    const localPath = path.join(dir, savedName);

    await writeFile(localPath, buffer);

    references.push({
      record: {
        originalName: file.name,
        savedName,
        contentType: file.type || "application/octet-stream",
        bytes: file.size,
        localPath
      },
      uploadInput: {
        buffer,
        filename: file.name,
        contentType: file.type || "application/octet-stream"
      }
    });
  }

  return references;
}

export async function downloadResultImage(jobId: string, remoteUrl: string) {
  const response = await fetch(remoteUrl);

  if (!response.ok) {
    throw new Error(`下载生成图片失败：HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  const savedName = `result-1.${extensionForContentType(contentType, remoteUrl)}`;
  const localPath = path.join(await ensureJobDir(jobId), savedName);

  await writeFile(localPath, buffer);

  return {
    localPath,
    savedName,
    contentType,
    bytes: buffer.byteLength,
    downloadedAt: nowIso()
  };
}

export function resultAssetUrl(jobId: string, savedName: string) {
  return `/api/assets/${encodeURIComponent(jobId)}/${encodeURIComponent(savedName)}`;
}

export async function resolveAssetPath(segments: string[]) {
  if (segments.length !== 2) {
    throw new Error("无效的资源路径。");
  }

  const [jobId, savedName] = segments;
  assertSafeJobId(jobId);

  if (savedName.includes("/") || savedName.includes("\\") || savedName.includes("..")) {
    throw new Error("无效的文件名。");
  }

  const resolved = path.resolve(jobsRoot(), jobId, savedName);
  const root = path.resolve(jobsRoot());

  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("资源路径越界。");
  }

  await stat(resolved);
  return resolved;
}

export function contentTypeForFileName(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }

  if (ext === ".webp") {
    return "image/webp";
  }

  if (ext === ".gif") {
    return "image/gif";
  }

  return "image/png";
}

function extensionForContentType(contentType: string, remoteUrl: string) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "jpg";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  if (contentType.includes("gif")) {
    return "gif";
  }

  const urlExt = path.extname(new URL(remoteUrl).pathname).replace(".", "").toLowerCase();
  return urlExt || "png";
}

function sanitizeFileName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);
  const safeBase = base
    .normalize("NFKD")
    .replace(/[^a-z0-9_-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
  const safeExt = ext.replace(/[^a-z0-9.]/giu, "") || ".png";

  return `${safeBase || "reference"}${safeExt}`;
}
