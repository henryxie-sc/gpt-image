import { describe, expect, it } from "vitest";

import {
  PROMPT_PRESETS,
  buildPrompt,
  getPromptPresetsBySize,
  isPromptPresetId,
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
      templateId: "scene"
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
    expect(PROMPT_PRESETS.default.name).toBe("默认电商通用");
    expect(PROMPT_PRESETS["white-bg-pro"].name).toBe("白底主图增强");
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

    expect(prompt).toContain("提示词风格：详情横图增强");
  });

  it("includes selected preset guidance in prompt", () => {
    const prompt = buildPrompt({
      productName: "便携恒温电热水杯",
      sellingPoints: "45°C 恒温，316 不锈钢",
      templateId: "main",
      promptPresetId: "white-bg-pro"
    });

    expect(prompt).toContain("提示词风格：白底主图增强");
    expect(prompt).toContain("纯白或极浅灰背景，商品居中偏大");
  });

  it("falls back to default preset when prompt preset is omitted", () => {
    const prompt = buildPrompt({
      productName: "便携恒温电热水杯",
      sellingPoints: "45°C 恒温，316 不锈钢",
      templateId: "main"
    });

    expect(prompt).toContain("提示词风格：默认电商通用");
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
