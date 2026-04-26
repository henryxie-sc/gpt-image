import { describe, expect, it } from "vitest";

import {
  IMAGE_SIZES,
  PROMPT_PRESETS,
  buildPrompt,
  getDefaultPromptPresetId,
  getPromptPresetsBySize,
  isPromptPresetId,
  removeFileAtIndex,
  splitSellingPoints,
  supportsResolution,
  validateJobInput,
  validateReferenceFiles
} from "@/lib/ecommerce";

describe("ecommerce helpers", () => {
  it("returns the custom prompt directly", () => {
    const prompt = buildPrompt({
      productName: "",
      sellingPoints: "",
      templateId: "main",
      customPrompt: "基于参考图生成白底电商主图，商品居中，保留真实材质。"
    });

    expect(prompt).toBe("基于参考图生成白底电商主图，商品居中，保留真实材质。");
  });

  it("requires a prompt before generation", () => {
    expect(
      validateJobInput(
        {
          productName: "",
          sellingPoints: "",
          templateId: "main",
          size: "1:1",
          resolution: "1k",
          customPrompt: ""
        },
        0
      )
    ).toContain("请填写提示词内容。");
  });

  it("allows prompt-only generation without product fields or reference images", () => {
    expect(
      validateJobInput(
        {
          productName: "",
          sellingPoints: "",
          templateId: "main",
          size: "1:1",
          resolution: "1k",
          customPrompt: "生成一张白底商品主图。",
          promptPresetId: "white-bg-pro"
        },
        0
      )
    ).toEqual([]);
  });

  it("splits selling points across common Chinese separators", () => {
    expect(splitSellingPoints("防水，耐磨；轻量\n便携")).toEqual([
      "防水",
      "耐磨",
      "轻量",
      "便携"
    ]);
  });

  it("supports all available API image sizes except auto in the size selector", () => {
    expect(IMAGE_SIZES).toEqual([
      "1:1",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16",
      "2:1",
      "1:2",
      "21:9",
      "9:21"
    ]);
  });

  it("blocks 4K for unsupported sizes", () => {
    expect(supportsResolution("4:5", "4k")).toBe(false);
    expect(supportsResolution("16:9", "4k")).toBe(true);
  });

  it("exposes preset prompts and validates preset ids", () => {
    expect(Object.keys(PROMPT_PRESETS)).toHaveLength(18);
    expect(PROMPT_PRESETS["white-bg-pro"].name).toBe("1. 标准白底主图");
    expect(PROMPT_PRESETS["studio-premium"].prompt).toContain("浅灰无缝背景");
    expect(PROMPT_PRESETS["scene-pro"].defaultSize).toBe("4:5");
    expect(PROMPT_PRESETS["detail-banner"].templateId).toBe("detail");
    expect(PROMPT_PRESETS["hand-use"].prompt).toContain("不要多手指");
    expect(PROMPT_PRESETS["home-storage"].name).toBe("18. 家居收纳类");
    expect(isPromptPresetId("scene-pro")).toBe(true);
    expect(isPromptPresetId("not-exists")).toBe(false);
  });

  it("returns prompt preset options based on image size", () => {
    expect(getPromptPresetsBySize("1:1").map((preset) => preset.id)).toEqual([
      "white-bg-pro",
      "studio-premium"
    ]);
    expect(getPromptPresetsBySize("4:5").map((preset) => preset.id)).toEqual([
      "scene-pro",
      "studio-premium"
    ]);
    expect(getPromptPresetsBySize("16:9").map((preset) => preset.id)).toEqual([
      "detail-banner",
      "studio-premium"
    ]);
  });

  it("chooses sensible default presets by size", () => {
    expect(getDefaultPromptPresetId("1:1")).toBe("white-bg-pro");
    expect(getDefaultPromptPresetId("4:5")).toBe("scene-pro");
    expect(getDefaultPromptPresetId("16:9")).toBe("detail-banner");
  });

  it("allows preset prompt text to be used with any selected output ratio", () => {
    expect(
      validateJobInput(
        {
          productName: "",
          sellingPoints: "",
          templateId: "detail",
          size: "9:16",
          resolution: "1k",
          customPrompt: "请生成一张详情页首屏横图，但实际输出使用竖版比例。",
          promptPresetId: "detail-banner"
        },
        0
      )
    ).toEqual([]);
  });

  it("removes a selected reference image by index", () => {
    const files = [
      { name: "a.png", size: 1, type: "image/png" },
      { name: "b.png", size: 1, type: "image/png" },
      { name: "c.png", size: 1, type: "image/png" }
    ];

    expect(removeFileAtIndex(files, 1).map((file) => file.name)).toEqual(["a.png", "c.png"]);
    expect(removeFileAtIndex(files, -1).map((file) => file.name)).toEqual([
      "a.png",
      "b.png",
      "c.png"
    ]);
  });

  it("validates job input and upload files", () => {
    expect(
      validateJobInput(
        {
          productName: "",
          sellingPoints: "",
          templateId: "main",
          size: "4:5",
          resolution: "4k",
          customPrompt: "生成场景图。"
        },
        1
      )
    ).toContain("4:5 暂不支持 4K 输出，请改用 1K 或 2K。");

    expect(
      validateReferenceFiles([
        { name: "a.txt", type: "text/plain", size: 100 },
        { name: "b.png", type: "image/png", size: 21 * 1024 * 1024 }
      ])
    ).toEqual(["a.txt 的格式不支持，请使用 JPG、PNG、WebP 或 GIF。", "b.png 超过 20MB。"]);
  });
});
