import { describe, expect, it } from "vitest";

import {
  PROMPT_PRESETS,
  buildPrompt,
  getPromptPresetsBySize,
  isPromptPresetId,
  removeFileAtIndex,
  splitSellingPoints,
  supportsResolution,
  validateJobInput,
  validateReferenceFiles
} from "@/lib/ecommerce";

describe("ecommerce helpers", () => {
  it("builds a prompt for Chinese ecommerce image generation", () => {
    const prompt = buildPrompt({
      productName: "便携恒温电热水杯",
      sellingPoints: "45°C 恒温，316 不锈钢\nUSB-C 充电",
      promoText: "新品首发",
      templateId: "scene",
      referenceImageCount: 1
    });

    expect(prompt).toContain("便携恒温电热水杯");
    expect(prompt).toContain("45°C 恒温、316 不锈钢、USB-C 充电");
    expect(prompt).toContain("新品首发");
    expect(prompt).toContain("场景图");
    expect(prompt).toContain("不要改变商品款式");
  });

  it("splits selling points across common Chinese separators", () => {
    expect(splitSellingPoints("防水，耐磨；轻量\n便携")).toEqual([
      "防水",
      "耐磨",
      "轻量",
      "便携"
    ]);
  });

  it("blocks 4K for unsupported sizes", () => {
    expect(supportsResolution("4:5", "4k")).toBe(false);
    expect(supportsResolution("16:9", "4k")).toBe(true);
  });

  it("exposes prompt presets and validates preset ids", () => {
    expect(PROMPT_PRESETS.default.name).toBe("电商图");
    expect(PROMPT_PRESETS["white-bg-pro"].name).toBe("电商主图");
    expect(PROMPT_PRESETS["studio-premium"].name).toBe("高级棚拍");
    expect(PROMPT_PRESETS["scene-pro"].name).toBe("生活场景");
    expect(PROMPT_PRESETS["detail-banner"].name).toBe("详情横图");
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

  it("falls back to ratio-specific preset when prompt preset is omitted", () => {
    const prompt = buildPrompt({
      productName: "便携恒温电热水杯",
      sellingPoints: "45°C 恒温，316 不锈钢",
      templateId: "detail",
      size: "16:9"
    });

    expect(prompt).toContain("提示词风格：详情横图");
  });

  it("includes selected preset guidance in prompt", () => {
    const prompt = buildPrompt({
      productName: "便携恒温电热水杯",
      sellingPoints: "45°C 恒温，316 不锈钢",
      templateId: "main",
      promptPresetId: "white-bg-pro",
      referenceImageCount: 1
    });

    expect(prompt).toContain("提示词风格：电商主图");
    expect(prompt).toContain("干净的纯色或浅色背景，商品居中偏大");
  });

  it("builds a prompt without reference images when none are uploaded", () => {
    const prompt = buildPrompt({
      productName: "便携恒温电热水杯",
      sellingPoints: "45°C 恒温，316 不锈钢",
      templateId: "main",
      size: "1:1"
    });

    expect(prompt).toContain("在没有上传参考图时，可根据商品名称、卖点和画面用途自由生成符合要求的商品视觉");
    expect(prompt).not.toContain("必须严格参考上传图片中的商品外观");
  });

  it("falls back to default preset when prompt preset is omitted", () => {
    const prompt = buildPrompt({
      productName: "便携恒温电热水杯",
      sellingPoints: "45°C 恒温，316 不锈钢",
      templateId: "main"
    });

    expect(prompt).toContain("提示词风格：电商图");
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

  it("allows generating without reference images", () => {
    expect(
      validateJobInput(
        {
          productName: "商品",
          sellingPoints: "卖点",
          templateId: "main",
          size: "1:1",
          resolution: "1k"
        },
        0
      )
    ).toEqual([]);
  });

  it("validates job input and upload files", () => {
    expect(
      validateJobInput(
        {
          productName: "商品",
          sellingPoints: "卖点",
          templateId: "main",
          size: "4:5",
          resolution: "4k"
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
