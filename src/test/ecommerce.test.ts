import { describe, expect, it } from "vitest";

import {
  buildPrompt,
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
