import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getJob } from "@/app/api/jobs/[id]/route";
import { GET as listJobs, POST as createJob } from "@/app/api/jobs/route";

describe("jobs api", () => {
  let storageDir: string;
  const originalApiKey = process.env.APIMART_API_KEY;
  const originalStorageDir = process.env.APIMART_STORAGE_DIR;

  beforeEach(async () => {
    storageDir = await mkdtemp(path.join(tmpdir(), "apimart-jobs-"));
    process.env.APIMART_API_KEY = "test-key";
    process.env.APIMART_STORAGE_DIR = storageDir;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.env.APIMART_API_KEY = originalApiKey;
    process.env.APIMART_STORAGE_DIR = originalStorageDir;
    await rm(storageDir, { force: true, recursive: true });
  });

  it("creates a job, submits to APIMart, polls completion, and downloads result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: "https://upload.apimart.ai/f/image/reference.png",
            filename: "reference.png",
            content_type: "image/png",
            bytes: 4
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: [{ status: "submitted", task_id: "task_abc" }]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              id: "task_abc",
              status: "completed",
              progress: 100,
              result: {
                images: [
                  {
                    url: ["https://upload.apimart.ai/f/image/result.png"],
                    expires_at: 1776835126
                  }
                ]
              }
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { "content-type": "image/png" }
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const createResponse = await createJob(makeRequest());
    const created = (await createResponse.json()) as {
      job: { id: string; taskId: string; status: string };
    };

    expect(createResponse.status).toBe(201);
    expect(created.job.taskId).toBe("task_abc");
    expect(created.job.status).toBe("submitted");

    const pollResponse = await getJob(new Request("http://localhost/api/jobs/test") as never, {
      params: Promise.resolve({ id: created.job.id })
    });
    const polled = (await pollResponse.json()) as {
      job: {
        status: string;
        progress: number;
        result: { localPath: string; localUrl: string; bytes: number };
      };
    };

    expect(pollResponse.status).toBe(200);
    expect(polled.job.status).toBe("completed");
    expect(polled.job.progress).toBe(100);
    expect(polled.job.result.bytes).toBe(4);
    expect(polled.job.result.localPath).toContain(storageDir);
    expect(polled.job.result.localUrl).toContain("/api/assets/");

    const listResponse = await listJobs();
    const listed = (await listResponse.json()) as {
      jobs: Array<{ id: string; status: string; result?: { localUrl: string } }>;
    };

    expect(listResponse.status).toBe(200);
    expect(listed.jobs[0].id).toBe(created.job.id);
    expect(listed.jobs[0].status).toBe("completed");
    expect(listed.jobs[0].result?.localUrl).toContain("/api/assets/");
  });

  it("returns APIMart errors without hiding the local job record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "余额不足" }), {
          status: 402
        })
      )
    );

    const response = await createJob(makeRequest());
    const body = (await response.json()) as {
      error: string;
      job: { id: string; status: string; error: string };
    };

    expect(response.status).toBe(502);
    expect(body.error).toBe("余额不足");
    expect(body.job.status).toBe("failed");
    expect(body.job.error).toBe("余额不足");
  });
});

function makeRequest() {
  const formData = new FormData();

  formData.set("productName", "便携恒温电热水杯");
  formData.set("sellingPoints", "45°C 恒温，316 不锈钢");
  formData.set("promoText", "新品首发");
  formData.set("templateId", "main");
  formData.set("size", "1:1");
  formData.set("resolution", "1k");
  formData.append(
    "images",
    new File([new Uint8Array([1, 2, 3, 4])], "reference.png", {
      type: "image/png"
    })
  );

  return new Request("http://localhost/api/jobs", {
    method: "POST",
    body: formData
  }) as never;
}
