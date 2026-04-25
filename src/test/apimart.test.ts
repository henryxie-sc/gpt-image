import { describe, expect, it } from "vitest";

import {
  extractResultImageUrl,
  parseGenerationResponse,
  parseTaskResponse,
  parseUploadResponse
} from "@/lib/apimart";

describe("apimart response parsing", () => {
  it("parses upload responses", () => {
    expect(
      parseUploadResponse({
        url: "https://upload.apimart.ai/f/image/photo.png",
        filename: "photo.png",
        content_type: "image/png",
        bytes: 123
      })
    ).toMatchObject({
      url: "https://upload.apimart.ai/f/image/photo.png",
      filename: "photo.png",
      bytes: 123
    });
  });

  it("parses image generation submission responses", () => {
    expect(
      parseGenerationResponse({
        code: 200,
        data: [{ status: "submitted", task_id: "task_123" }]
      })
    ).toMatchObject({
      taskId: "task_123",
      status: "submitted"
    });
  });

  it("extracts final image urls from task responses", () => {
    const task = parseTaskResponse({
      code: 200,
      data: {
        id: "task_123",
        status: "completed",
        progress: 100,
        result: {
          images: [{ url: ["https://upload.apimart.ai/f/image/result.png"] }]
        }
      }
    });

    expect(task.status).toBe("completed");
    expect(extractResultImageUrl(task)).toBe("https://upload.apimart.ai/f/image/result.png");
  });
});
