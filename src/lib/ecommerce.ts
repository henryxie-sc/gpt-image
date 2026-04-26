export const IMAGE_SIZES = [
  "1:1",
  "4:5",
  "16:9"
] as const;

export const API_IMAGE_SIZES = [
  "auto",
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
] as const;

export const RESOLUTIONS = ["1k", "2k", "4k"] as const;

export type ImageSize = (typeof IMAGE_SIZES)[number];
export type ApiImageSize = (typeof API_IMAGE_SIZES)[number];
export type Resolution = (typeof RESOLUTIONS)[number];
export type TemplateId = "main" | "scene" | "detail";

export type TemplateDefinition = {
  id: TemplateId;
  name: string;
  shortName: string;
  defaultSize: ImageSize;
  usage: string;
  guidance: string;
};

export const PROMPT_PRESETS = {
  default: {
    id: "default",
    name: "电商图",
    guidance: "突出商品主体，画面真实自然，适合主流电商平台展示。"
  },
  "white-bg-pro": {
    id: "white-bg-pro",
    name: "电商主图",
    guidance: "使用干净的纯色或浅色背景，商品居中偏大，正面或微 45 度展示，柔和棚拍光，边缘清晰。"
  },
  "studio-premium": {
    id: "studio-premium",
    name: "高级棚拍",
    guidance: "使用浅灰或中性高级背景，柔和漫射光，保留真实阴影与材质细节，整体简洁高级。"
  },
  "scene-pro": {
    id: "scene-pro",
    name: "生活场景",
    guidance: "把商品放入符合使用逻辑的真实生活场景中，场景精致克制，商品仍然是视觉主体。"
  },
  "detail-banner": {
    id: "detail-banner",
    name: "详情横图",
    guidance: "横版构图，商品位于左侧或中间偏左，右侧预留干净留白，方便后期排版卖点文案。"
  }
} as const;

export type PromptPresetId = keyof typeof PROMPT_PRESETS;

export type BuildPromptInput = {
  productName: string;
  sellingPoints: string;
  promoText?: string;
  templateId: TemplateId;
  size?: ImageSize;
  promptPresetId?: PromptPresetId;
};

export type JobInput = BuildPromptInput & {
  size: ImageSize;
  resolution: Resolution;
};

export type FileValidationInput = {
  name: string;
  size: number;
  type: string;
};

export const MAX_REFERENCE_IMAGES = 4;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  main: {
    id: "main",
    name: "白底主图",
    shortName: "主图",
    defaultSize: "1:1",
    usage: "淘宝 / 京东主图",
    guidance:
      "纯白或极浅灰背景，商品居中偏大，正面展示，保留自然阴影，画面清爽，适合商品列表页。"
  },
  scene: {
    id: "scene",
    name: "场景图",
    shortName: "场景",
    defaultSize: "4:5",
    usage: "移动端商品页",
    guidance:
      "把商品放入真实生活或使用场景中，环境高级但不抢主体，保留商品本身所有关键细节。"
  },
  detail: {
    id: "detail",
    name: "详情横图",
    shortName: "详情",
    defaultSize: "16:9",
    usage: "详情页横幅",
    guidance:
      "横向详情页构图，左侧或中心突出商品，右侧留出中文卖点层级，适合电商详情页首屏。"
  }
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);
export const PROMPT_PRESET_LIST = Object.values(PROMPT_PRESETS);

const PROMPT_PRESET_IDS_BY_SIZE: Record<ImageSize, PromptPresetId[]> = {
  "1:1": ["white-bg-pro", "studio-premium"],
  "4:5": ["scene-pro", "studio-premium"],
  "16:9": ["detail-banner", "studio-premium"]
};

const FOUR_K_SIZES = new Set<ApiImageSize>([
  "16:9",
  "9:16",
  "2:1",
  "1:2",
  "21:9",
  "9:21"
]);

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && value in TEMPLATES;
}

export function isPromptPresetId(value: unknown): value is PromptPresetId {
  return typeof value === "string" && value in PROMPT_PRESETS;
}

export function getPromptPresetsBySize(size: ImageSize) {
  return PROMPT_PRESET_IDS_BY_SIZE[size].map((presetId) => PROMPT_PRESETS[presetId]);
}

export function getDefaultPromptPresetId(size?: ImageSize): PromptPresetId {
  if (!size) {
    return "default";
  }

  return PROMPT_PRESET_IDS_BY_SIZE[size][0] ?? "default";
}

export function isPromptPresetCompatibleWithSize(
  promptPresetId: PromptPresetId,
  size?: ImageSize
) {
  if (!size) {
    return true;
  }

  return PROMPT_PRESET_IDS_BY_SIZE[size].includes(promptPresetId);
}

export function isImageSize(value: unknown): value is ImageSize {
  return typeof value === "string" && IMAGE_SIZES.includes(value as ImageSize);
}

export function isResolution(value: unknown): value is Resolution {
  return typeof value === "string" && RESOLUTIONS.includes(value as Resolution);
}

export function supportsResolution(size: ApiImageSize, resolution: Resolution) {
  return resolution !== "4k" || FOUR_K_SIZES.has(size);
}

export function splitSellingPoints(value: string) {
  return value
    .split(/[\n,，;；、]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function removeFileAtIndex<T>(files: T[], index: number) {
  if (index < 0 || index >= files.length) {
    return files;
  }

  return files.filter((_, currentIndex) => currentIndex !== index);
}

export function buildPrompt(input: BuildPromptInput) {
  const template = TEMPLATES[input.templateId];
  const resolvedPresetId = isPromptPresetCompatibleWithSize(input.promptPresetId ?? "default", input.size)
    ? input.promptPresetId ?? getDefaultPromptPresetId(input.size)
    : getDefaultPromptPresetId(input.size);
  const preset = PROMPT_PRESETS[resolvedPresetId];
  const productName = input.productName.trim();
  const sellingPoints = splitSellingPoints(input.sellingPoints);
  const promoText = input.promoText?.trim();

  return [
    "你是资深国内电商视觉设计师，请基于上传的商品参考图生成一张可直接用于京东、淘宝等平台的商品图。",
    `商品名称：${productName}`,
    sellingPoints.length > 0 ? `核心卖点：${sellingPoints.join("、")}` : "",
    promoText ? `促销/标签文案：${promoText}` : "",
    `画面用途：${template.name}。${template.guidance}`,
    `提示词风格：${preset.name}。${preset.guidance}`,
    "必须严格参考上传图片中的商品外观、颜色、材质、包装、logo 位置和结构比例，不要改变商品款式。",
    "在画面中自然加入清晰可读的中文卖点或促销文字，避免错别字、乱码、无关英文和虚假参数。",
    "画面干净，商品主体突出，光线真实，质感清晰，适合国内电商审核与展示。",
    "不要添加水印、二维码、联系方式、平台违规标识或无关品牌元素。"
  ]
    .filter(Boolean)
    .join("\n");
}

export function validateJobInput(input: Partial<JobInput>, imageCount: number) {
  const errors: string[] = [];

  if (!input.productName?.trim()) {
    errors.push("请填写商品名称。");
  }

  if (!input.sellingPoints?.trim()) {
    errors.push("请填写卖点文案。");
  }

  if (!isTemplateId(input.templateId)) {
    errors.push("请选择有效的电商模板。");
  }

  if (!isImageSize(input.size)) {
    errors.push("请选择有效的图片比例。");
  }

  if (
    input.promptPresetId &&
    input.promptPresetId !== "default" &&
    isImageSize(input.size) &&
    isPromptPresetId(input.promptPresetId) &&
    !isPromptPresetCompatibleWithSize(input.promptPresetId, input.size)
  ) {
    errors.push("当前提示词风格与所选图片比例不匹配，请重新选择。");
  }

  if (!isResolution(input.resolution)) {
    errors.push("请选择有效的分辨率。");
  }

  if (
    isImageSize(input.size) &&
    isResolution(input.resolution) &&
    !supportsResolution(input.size, input.resolution)
  ) {
    errors.push(`${input.size} 暂不支持 4K 输出，请改用 1K 或 2K。`);
  }

  if (imageCount < 1) {
    errors.push("请至少上传 1 张商品参考图。");
  }

  if (imageCount > MAX_REFERENCE_IMAGES) {
    errors.push(`最多上传 ${MAX_REFERENCE_IMAGES} 张商品参考图。`);
  }

  return errors;
}

export function validateReferenceFiles(files: FileValidationInput[]) {
  const errors: string[] = [];

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      errors.push(`${file.name} 的格式不支持，请使用 JPG、PNG、WebP 或 GIF。`);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      errors.push(`${file.name} 超过 20MB。`);
    }
  }

  return errors;
}
