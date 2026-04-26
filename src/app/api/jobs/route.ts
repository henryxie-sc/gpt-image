import { readFile } from "node:fs/promises";

import { NextRequest, NextResponse } from "next/server";

import { createImageGeneration, hasApimartApiKey, uploadImage } from "@/lib/apimart";
import {
  buildPrompt,
  isImageSize,
  isPromptPresetId,
  isResolution,
  isTemplateId,
  validateJobInput,
  validateReferenceFiles
} from "@/lib/ecommerce";
import type { ImageSize, PromptPresetId, Resolution, TemplateId } from "@/lib/ecommerce";
import {
  createJobId,
  listJobSummaries,
  nowIso,
  persistReferenceFiles,
  toClientJob,
  updateJobRecord,
  writeJobRecord
} from "@/lib/jobs";
import type { JobRecord } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET() {
  const jobs = await listJobSummaries();
  return NextResponse.json({ jobs });
}

type ParsedForm = {
  productName: string;
  sellingPoints: string;
  promoText: string;
  customPrompt: string;
  templateId: TemplateId;
  promptPresetId: PromptPresetId;
  size: ImageSize;
  resolution: Resolution;
  files: File[];
};

export async function POST(request: NextRequest) {
  if (!hasApimartApiKey()) {
    return NextResponse.json(
      { error: "未配置 APIMART_API_KEY，请在 .env.local 中填写后重启服务。" },
      { status: 500 }
    );
  }

  let parsed: ParsedForm;

  try {
    parsed = await parseForm(request);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }

  const validationErrors = [
    ...validateJobInput(parsed, parsed.files.length),
    ...validateReferenceFiles(parsed.files)
  ];

  if (validationErrors.length > 0) {
    return NextResponse.json({ error: validationErrors.join(" ") }, { status: 400 });
  }

  const jobId = createJobId();
  const prompt = buildPrompt({ ...parsed, referenceImageCount: parsed.files.length });
  const persisted = await persistReferenceFiles(jobId, parsed.files);
  const timestamp = nowIso();

  let job: JobRecord = {
    id: jobId,
    createdAt: timestamp,
    updatedAt: timestamp,
    productName: parsed.productName.trim(),
    sellingPoints: parsed.sellingPoints.trim(),
    promoText: parsed.promoText.trim(),
    templateId: parsed.templateId,
    size: parsed.size,
    resolution: parsed.resolution,
    prompt,
    status: "uploading",
    progress: 0,
    referenceImages: persisted.map((item) => item.record)
  };

  await writeJobRecord(job);

  try {
    const uploadedReferences = [];

    for (const item of persisted) {
      const uploaded = await uploadImage({
        ...item.uploadInput,
        buffer: await readFile(item.record.localPath)
      });

      uploadedReferences.push({
        ...item.record,
        uploadedUrl: uploaded.url,
        uploadedAt: nowIso()
      });

      job = await updateJobRecord(jobId, {
        referenceImages: uploadedReferences,
        progress: Math.round((uploadedReferences.length / persisted.length) * 20)
      });
    }

    const generation = await createImageGeneration({
      prompt,
      imageUrls: uploadedReferences.map((item) => item.uploadedUrl),
      size: parsed.size,
      resolution: parsed.resolution
    });

    job = await updateJobRecord(jobId, {
      status: "submitted",
      progress: 20,
      taskId: generation.taskId,
      referenceImages: uploadedReferences,
      apimart: {
        generation: generation.raw
      }
    });

    return NextResponse.json({ job: toClientJob(job) }, { status: 201 });
  } catch (error) {
    const failedJob = await updateJobRecord(jobId, {
      status: "failed",
      error: errorMessage(error)
    });

    return NextResponse.json(
      { error: errorMessage(error), job: toClientJob(failedJob) },
      { status: 502 }
    );
  }
}

async function parseForm(request: NextRequest): Promise<ParsedForm> {
  const formData = await request.formData();
  const productName = getText(formData, "productName");
  const sellingPoints = getText(formData, "sellingPoints");
  const promoText = getText(formData, "promoText");
  const customPrompt = getText(formData, "customPrompt");
  const templateId = getText(formData, "templateId");
  const promptPresetId = getText(formData, "promptPresetId") || "white-bg-pro";
  const size = getText(formData, "size");
  const resolution = getText(formData, "resolution");
  const files = formData.getAll("images").filter(isFile);

  if (
    !isTemplateId(templateId) ||
    !isPromptPresetId(promptPresetId) ||
    !isImageSize(size) ||
    !isResolution(resolution)
  ) {
    throw new Error("表单参数无效。");
  }

  return {
    productName,
    sellingPoints,
    promoText,
    customPrompt,
    templateId,
    promptPresetId,
    size,
    resolution,
    files
  };
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求处理失败。";
}
