export const IMAGE_SIZES = [
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

export const API_IMAGE_SIZES = [
  "auto",
  ...IMAGE_SIZES
] as const;

export const RESOLUTIONS = ["1k", "2k", "4k"] as const;

export type ImageSize = (typeof IMAGE_SIZES)[number];
export type ApiImageSize = (typeof API_IMAGE_SIZES)[number];
export type Resolution = (typeof RESOLUTIONS)[number];
export type TemplateId = "main" | "scene" | "detail" | "custom";

export type TemplateDefinition = {
  id: TemplateId;
  name: string;
  shortName: string;
  defaultSize: ImageSize;
  usage: string;
  guidance: string;
};

export const PROMPT_PRESETS = {
  "white-bg-pro": {
    id: "white-bg-pro",
    name: "1. 标准白底主图",
    templateId: "main",
    defaultSize: "1:1",
    usage: "淘宝 / 京东 / 拼多多主图",
    prompt:
      "你是资深电商视觉设计师和商业产品摄影师。请基于上传的商品参考图生成高质量电商主图。\n\n商品名称：{商品名}\n核心卖点：{卖点}\n促销标签：{促销词}\n\n要求：\n1. 严格保留参考图中的商品外观、颜色、材质、包装、logo、结构比例，不要改变商品款式，不要新增或删除配件。\n2. 使用纯白或极浅灰背景，商品居中偏大展示，正面或微45度角展示。\n3. 使用柔和均匀的专业棚拍光，保留轻微自然阴影，边缘清晰，材质真实。\n4. 画面干净简洁，无杂物，无多余道具，无复杂背景。\n5. 商品完整可见，适合电商平台商品列表展示。\n6. 不要水印、二维码、联系方式、无关品牌元素、乱码、错别字、虚假参数。\n\n输出效果：专业电商白底主图，真实、清晰、干净、可直接商用。"
  },
  "studio-premium": {
    id: "studio-premium",
    name: "2. 高级浅灰背景主图",
    templateId: "main",
    defaultSize: "1:1",
    usage: "独立站 / 高客单价商品",
    prompt:
      "请基于上传的商品参考图，生成一张高级感电商主图。\n\n商品名称：{商品名}\n核心卖点：{卖点}\n\n要求：\n1. 严格保留商品原始外观、颜色、材质、logo和结构。\n2. 使用浅灰无缝背景，商品居中偏大，主视觉突出。\n3. 采用柔和漫射光，保留自然阴影与轻微高光，体现真实材质。\n4. 整体风格高级、克制、简洁，像品牌官网商品主图。\n5. 不要加入无关道具，不要夸张反光，不要背景太花。\n6. 不要水印、二维码、乱码、虚假文字。\n\n输出效果：高级品牌感电商棚拍图。"
  },
  "floating-product": {
    id: "floating-product",
    name: "3. 悬浮感主图",
    templateId: "main",
    defaultSize: "1:1",
    usage: "科技 / 美妆 / 小家电",
    prompt:
      "请基于上传的商品参考图，生成一张带轻微悬浮感的商业产品图。\n\n要求：\n1. 商品外观、颜色、材质、logo、比例必须与参考图一致。\n2. 商品悬浮在干净的纯色背景上，背景简洁克制。\n3. 商品下方保留柔和真实阴影，增强空间感，但不要夸张。\n4. 画面具有高级商业摄影质感，边缘清晰，主体突出。\n5. 不要额外添加配件，不要改变包装，不要产生变形。\n6. 不要水印、二维码、联系方式、乱码、无关元素。\n\n输出效果：现代感强、干净利落的电商展示图。"
  },
  "scene-pro": {
    id: "scene-pro",
    name: "4. 通用生活场景图",
    templateId: "scene",
    defaultSize: "4:5",
    usage: "日用品 / 家居 / 小家电",
    prompt:
      "请基于上传的商品参考图，生成一张真实自然的电商生活场景图。\n\n商品名称：{商品名}\n核心卖点：{卖点}\n\n要求：\n1. 严格保留商品本身的外观、颜色、材质、logo、包装和结构比例。\n2. 将商品放入符合使用逻辑的真实生活环境中，场景自然、精致、有质感。\n3. 商品必须仍然是画面主体，不能被背景抢走注意力。\n4. 使用真实自然光或高级室内商业布光，画面干净不杂乱。\n5. 道具可以少量辅助，但不能遮挡商品，不能加入无关元素。\n6. 不要水印、二维码、联系方式、乱码、虚假参数。\n\n输出效果：像品牌电商广告一样真实自然，同时突出产品。"
  },
  "home-scene": {
    id: "home-scene",
    name: "5. 高级家居场景图",
    templateId: "scene",
    defaultSize: "4:5",
    usage: "家居 / 厨房 / 香薰 / 摆件",
    prompt:
      "请把商品放入一个现代简约、高级感家居环境中进行展示。\n\n要求：\n1. 商品外观、颜色、材质、logo与参考图保持一致。\n2. 场景为现代简约家居空间，整体干净整洁，色调统一。\n3. 商品是视觉中心，环境只作为辅助氛围。\n4. 光线柔和自然，具有生活感和品牌感。\n5. 不要出现过多杂物，不要遮挡商品，不要让背景过于复杂。\n6. 不要水印、二维码、乱码、无关品牌元素。\n\n输出效果：适合电商详情页、品牌首页、广告落地页的高级场景图。"
  },
  "outdoor-scene": {
    id: "outdoor-scene",
    name: "6. 户外使用场景图",
    templateId: "scene",
    defaultSize: "4:5",
    usage: "水杯 / 背包 / 运动用品",
    prompt:
      "请基于上传的商品参考图，生成一张真实可信的户外生活方式场景图。\n\n要求：\n1. 商品的外观、颜色、比例、材质必须与参考图一致。\n2. 场景应符合产品实际使用环境，如露营、通勤、出行、户外休闲等。\n3. 画面真实自然，避免幻想感、过度艺术化和不合理场景。\n4. 商品要清晰突出，可见关键设计细节。\n5. 光线自然，有轻微氛围感，但不能压暗主体。\n6. 不要夸张特效，不要加入无关人物或无关品牌信息。\n7. 不要水印、二维码、乱码。\n\n输出效果：有代入感、真实可信、适合电商转化的户外场景商品图。"
  },
  "detail-banner": {
    id: "detail-banner",
    name: "7. 详情页首屏横图",
    templateId: "detail",
    defaultSize: "16:9",
    usage: "详情页 banner / 店铺首页",
    prompt:
      "请基于上传的商品参考图，生成一张适合电商详情页首屏的横版商品图。\n\n商品名称：{商品名}\n核心卖点：{卖点}\n\n要求：\n1. 商品外观、颜色、材质、logo、比例必须与参考图完全一致。\n2. 横版构图，商品位于左侧或中间偏左，右侧预留干净留白区域。\n3. 背景简洁高级，可有轻微场景氛围，但不能喧宾夺主。\n4. 商品主体突出，边缘清晰，质感真实。\n5. 不要直接生成大量中文文案，优先保留版面留白，方便后期叠字。\n6. 不要水印、二维码、联系方式、乱码、无关元素。\n\n输出效果：专业电商详情页首屏横幅图，干净、突出商品、便于后期排版。"
  },
  "selling-point-banner": {
    id: "selling-point-banner",
    name: "8. 卖点横幅图",
    templateId: "detail",
    defaultSize: "16:9",
    usage: "一图一卖点 / 详情分屏",
    prompt:
      "请基于上传的商品参考图，生成一张用于电商详情页卖点展示的横版商品图。\n\n核心卖点：{某一个卖点}\n\n要求：\n1. 商品外观和结构必须与参考图一致。\n2. 横版构图，突出商品与该卖点对应的视觉表现。\n3. 背景简洁，局部可以加入与卖点有关的辅助场景，但不要复杂。\n4. 商品清晰、真实、有商业摄影质感。\n5. 右侧或上方保留适合后期加卖点文字的留白。\n6. 不要出现复杂现成中文排版，不要乱码。\n7. 不要水印、二维码、联系方式。\n\n输出效果：适合详情页模块化卖点展示的横幅图。"
  },
  "hand-use": {
    id: "hand-use",
    name: "9. 手部使用图",
    templateId: "scene",
    defaultSize: "4:5",
    usage: "工具 / 杯壶 / 护肤品",
    prompt:
      "请基于上传的商品参考图，生成一张手部使用场景商品图。\n\n要求：\n1. 商品外观、颜色、比例、材质与参考图一致。\n2. 只展示手部或局部人体动作，不展示完整人物。\n3. 手部动作自然，真实地展示商品使用方式。\n4. 商品必须清晰可见，不能被手遮挡关键细节。\n5. 光线真实自然，背景简洁，生活感强。\n6. 不要多手指，不要手部畸形，不要不合理姿势。\n7. 不要水印、二维码、乱码、无关元素。\n\n输出效果：增强使用感和转化率的真实功能展示图。"
  },
  "exploded-view": {
    id: "exploded-view",
    name: "10. 爆炸展示/拆解说明图",
    templateId: "detail",
    defaultSize: "16:9",
    usage: "小家电 / 数码 / 工具",
    prompt:
      "请基于上传的商品参考图，生成一张电商风格的结构展示图。\n\n要求：\n1. 商品主体外观必须与参考图一致。\n2. 采用专业、清晰、规整的展示方式，适合说明结构或组成部分。\n3. 可以做轻微分层或拆解式展示，但每个部件必须合理真实。\n4. 背景简洁干净，突出结构关系。\n5. 整体风格像电商详情页说明模块，不要过于科幻。\n6. 不要乱加零件，不要结构错误，不要乱码，不要水印。\n\n输出效果：适合详情页结构说明、卖点解释的专业展示图。"
  },
  "flat-lay": {
    id: "flat-lay",
    name: "11. 俯拍平铺图",
    templateId: "main",
    defaultSize: "1:1",
    usage: "美妆 / 食品 / 文具 / 饰品",
    prompt:
      "请基于上传的商品参考图，生成一张电商俯拍平铺图。\n\n要求：\n1. 商品外观、颜色、材质、logo与参考图一致。\n2. 使用俯拍视角，将商品整齐摆放在干净台面或背景上。\n3. 构图平衡，有层次但不凌乱。\n4. 可以加入少量辅助道具，但必须和商品调性一致。\n5. 光线均匀柔和，商业摄影风格，材质清晰。\n6. 不要背景过花，不要无关元素，不要乱码和水印。\n\n输出效果：适合详情页、社媒、电商活动页的干净平铺图。"
  },
  "bundle-set": {
    id: "bundle-set",
    name: "12. 套装组合图",
    templateId: "main",
    defaultSize: "1:1",
    usage: "礼盒 / 套装 / 多件组合",
    prompt:
      "请基于上传的商品参考图，生成一张电商套装组合展示图。\n\n要求：\n1. 所有商品外观、颜色、材质和比例必须准确真实。\n2. 以整齐、美观、商业感强的方式展示多个商品组合。\n3. 主次清晰，重点商品更突出。\n4. 背景干净简洁，适合商品页展示。\n5. 画面有秩序感，不拥挤，不凌乱。\n6. 不要虚构未提供的配件，不要乱码、水印、二维码。\n\n输出效果：适合电商套装售卖页面的专业组合商品图。"
  },
  "promo-campaign": {
    id: "promo-campaign",
    name: "13. 大促氛围图",
    templateId: "scene",
    defaultSize: "4:5",
    usage: "618 / 双11 / 黑五",
    prompt:
      "请基于上传的商品参考图，生成一张带促销氛围的电商活动商品图。\n\n促销主题：{618 / 双11 / 限时秒杀 / 新品首发}\n\n要求：\n1. 商品本身外观、颜色、材质、比例必须和参考图一致。\n2. 在保持商品主体突出的前提下，加入适度促销氛围，如灯光、色块、节庆元素或视觉层次。\n3. 活动氛围要商业化、整洁，不要廉价感，不要过度花哨。\n4. 商品仍然是第一视觉重点。\n5. 可以预留促销文案区域，但不要生成大量复杂文字。\n6. 不要水印、二维码、联系方式、乱码、无关品牌元素。\n\n输出效果：适合大促活动页、店铺 banner、广告投放的商品图。"
  },
  "new-launch": {
    id: "new-launch",
    name: "14. 新品首发图",
    templateId: "main",
    defaultSize: "1:1",
    usage: "新产品上线 / 首发活动",
    prompt:
      "请基于上传的商品参考图，生成一张新品首发风格的商品图。\n\n要求：\n1. 商品外观、结构、颜色、logo与参考图一致。\n2. 整体画面突出“新品发布”的高级感和新鲜感。\n3. 背景简洁现代，可以有轻微发光、层次或舞台感，但不能喧宾夺主。\n4. 商品占据主视觉中心，材质清晰，边缘干净。\n5. 可以预留“新品首发”短文案位置，但不要生成复杂排版。\n6. 不要水印、二维码、乱码、无关元素。\n\n输出效果：像品牌新品发布KV一样的电商商品图。"
  },
  "beauty-skincare": {
    id: "beauty-skincare",
    name: "15. 美妆护肤类",
    templateId: "main",
    defaultSize: "1:1",
    usage: "天猫 / 抖店 / 独立站",
    prompt:
      "请基于上传的商品参考图，生成一张高级感美妆电商图。\n\n要求：\n1. 严格保留瓶身、包装、文字、logo、颜色和材质。\n2. 画面具有洁净、细腻、通透的护肤品商业摄影质感。\n3. 可加入少量与成分或功效相关的氛围元素，如水感、植物感、柔和台面，但不能过度。\n4. 商品必须突出，瓶身标签尽量清晰。\n5. 背景干净高级，不要廉价感。\n6. 不要水印、乱码、无关元素。\n\n输出效果：适合天猫、抖店、独立站的高转化美妆商品图。"
  },
  "food-product": {
    id: "food-product",
    name: "16. 食品类",
    templateId: "scene",
    defaultSize: "4:5",
    usage: "食品包装 / 食用场景",
    prompt:
      "请基于上传的商品参考图，生成一张真实可信的食品电商商品图。\n\n要求：\n1. 商品包装、品牌、颜色和结构必须与参考图一致。\n2. 整体氛围要干净、好吃、真实，不要夸张虚假。\n3. 可加入少量与食用场景相关的道具，但不要喧宾夺主。\n4. 商品主体必须清晰突出。\n5. 不要过度美化成与实物差异太大的效果。\n6. 不要水印、二维码、乱码、虚假参数。\n\n输出效果：让人有购买欲、同时真实可信的食品电商图。"
  },
  "small-appliance": {
    id: "small-appliance",
    name: "17. 小家电类",
    templateId: "main",
    defaultSize: "1:1",
    usage: "京东 / 天猫 / 小红书投放",
    prompt:
      "请基于上传的商品参考图，生成一张高质感小家电商品图。\n\n要求：\n1. 产品外观、按键、接口、材质、颜色、logo必须与参考图一致。\n2. 突出产品的精致做工、科技感和实用感。\n3. 可使用高级家居或简洁棚拍背景。\n4. 光线清晰，边缘明确，材质真实，不能失真。\n5. 可预留卖点说明位置，但不要生成复杂文字。\n6. 不要乱码、水印、无关元素。\n\n输出效果：适合京东、天猫、小红书投放的专业小家电电商图。"
  },
  "home-storage": {
    id: "home-storage",
    name: "18. 家居收纳类",
    templateId: "scene",
    defaultSize: "4:5",
    usage: "收纳 / 家居环境",
    prompt:
      "请基于上传的商品参考图，生成一张家居收纳类电商图。\n\n要求：\n1. 商品结构、材质、颜色、尺寸关系与参考图一致。\n2. 在整洁、有秩序感的家居环境中展示产品。\n3. 突出“整洁、实用、收纳效果好”的感觉。\n4. 场景真实自然，不要样板间过假，不要过度堆砌物品。\n5. 商品本身必须清晰、真实、易理解。\n6. 不要乱码、水印、无关元素。\n\n输出效果：能直接体现收纳价值和家居美感的商品图。"
  }
} as const;

export type PromptPresetId = keyof typeof PROMPT_PRESETS;

export type BuildPromptInput = {
  productName: string;
  sellingPoints: string;
  promoText?: string;
  customPrompt?: string;
  templateId: TemplateId;
  size?: ImageSize;
  promptPresetId?: PromptPresetId;
  referenceImageCount?: number;
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
  },
  custom: {
    id: "custom",
    name: "自定义提示词",
    shortName: "自定义",
    defaultSize: "1:1",
    usage: "普通图片 / 自由生成",
    guidance: "完全使用你填写的自定义提示词，不叠加内置电商模板提示。"
  }
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);
export const PROMPT_PRESET_LIST = Object.values(PROMPT_PRESETS);

function getSizeOrientation(size: ImageSize) {
  const [width, height] = size.split(":").map(Number);

  if (width === height) {
    return "square" as const;
  }

  return width > height ? ("landscape" as const) : ("portrait" as const);
}

function getPromptPresetIdsBySize(size: ImageSize): PromptPresetId[] {
  switch (getSizeOrientation(size)) {
    case "square":
      return ["white-bg-pro", "studio-premium"];
    case "portrait":
      return ["scene-pro", "studio-premium"];
    case "landscape":
      return ["detail-banner", "studio-premium"];
  }
}

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
  return getPromptPresetIdsBySize(size).map((presetId) => PROMPT_PRESETS[presetId]);
}

export function getDefaultPromptPresetId(size?: ImageSize): PromptPresetId {
  if (!size) {
    return "white-bg-pro";
  }

  return getPromptPresetIdsBySize(size)[0] ?? "white-bg-pro";
}

export function isPromptPresetCompatibleWithSize(
  promptPresetId: PromptPresetId,
  size?: ImageSize
) {
  if (!size) {
    return true;
  }

  return getPromptPresetIdsBySize(size).includes(promptPresetId);
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
  return input.customPrompt?.trim() || "";
}

export function validateJobInput(input: Partial<JobInput>, imageCount: number) {
  const errors: string[] = [];

  if (!input.customPrompt?.trim()) {
    errors.push("请填写提示词内容。");
  }

  if (!isTemplateId(input.templateId)) {
    errors.push("请选择有效的电商模板。");
  }

  if (!isImageSize(input.size)) {
    errors.push("请选择有效的图片比例。");
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
