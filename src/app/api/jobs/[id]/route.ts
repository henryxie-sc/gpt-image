import { NextRequest, NextResponse } from "next/server";

import {
  extractResultExpiresAt,
  extractResultImageUrl,
  extractTaskError,
  getTaskStatus,
  normalizeTaskStatus
} from "@/lib/apimart";
import {
  downloadResultImage,
  readJobRecord,
  toClientJob,
  updateJobRecord
} from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const job = await readJobRecord(id);

    if (job.status === "completed" || job.status === "failed" || !job.taskId) {
      return NextResponse.json({ job: toClientJob(job) });
    }

    const task = await getTaskStatus(job.taskId);
    const status = normalizeTaskStatus(task.status);
    const progress =
      typeof task.progress === "number"
        ? task.progress
        : status === "completed"
          ? 100
          : Math.max(job.progress, status === "processing" ? 45 : 20);

    let updated = await updateJobRecord(id, {
      status,
      progress,
      apimart: {
        ...job.apimart,
        task: task.raw
      }
    });

    if (status === "completed") {
      const remoteUrl = extractResultImageUrl(task);

      if (!remoteUrl) {
        updated = await updateJobRecord(id, {
          status: "failed",
          error: "APIMart 任务已完成，但响应中没有图片 URL。"
        });
      } else if (!updated.result) {
        const downloaded = await downloadResultImage(id, remoteUrl);

        updated = await updateJobRecord(id, {
          status: "completed",
          progress: 100,
          result: {
            remoteUrl,
            expiresAt: extractResultExpiresAt(task),
            ...downloaded
          }
        });
      }
    }

    if (status === "failed") {
      updated = await updateJobRecord(id, {
        status: "failed",
        error: extractTaskError(task)
      });
    }

    return NextResponse.json({ job: toClientJob(updated) });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 502 });
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "任务查询失败。";
}
