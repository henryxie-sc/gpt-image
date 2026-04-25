"use client";

import {
  AlertTriangle,
  BadgePercent,
  CheckCircle2,
  Clock3,
  Download,
  FileImage,
  HardDrive,
  Image,
  KeyRound,
  Layers,
  Loader2,
  Package,
  RotateCw,
  Save,
  Sparkles,
  Trash2,
  UploadCloud
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  IMAGE_SIZES,
  RESOLUTIONS,
  TEMPLATE_LIST,
  TEMPLATES,
  supportsResolution
} from "@/lib/ecommerce";
import type { ImageSize, Resolution, TemplateId } from "@/lib/ecommerce";

type ConfigState = {
  hasApiKey: boolean;
  model: string;
  storageDir: string;
};

type JobStatus = "uploading" | "submitted" | "processing" | "completed" | "failed";

type ClientJob = {
  id: string;
  productName: string;
  templateId: TemplateId;
  size: ImageSize;
  resolution: Resolution;
  status: JobStatus;
  progress: number;
  taskId?: string;
  error?: string;
  result?: {
    remoteUrl: string;
    localPath: string;
    localUrl: string;
    bytes: number;
    expiresAt?: number;
    downloadedAt: string;
  };
  createdAt: string;
  updatedAt: string;
};

type JobSummary = Pick<
  ClientJob,
  | "id"
  | "productName"
  | "templateId"
  | "size"
  | "resolution"
  | "status"
  | "progress"
  | "taskId"
  | "error"
  | "result"
  | "createdAt"
  | "updatedAt"
>;

const statusLabels: Record<JobStatus, string> = {
  uploading: "上传参考图",
  submitted: "已提交",
  processing: "生成中",
  completed: "已完成",
  failed: "失败"
};

export function Workstation() {
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [productName, setProductName] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [promoText, setPromoText] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("main");
  const [size, setSize] = useState<ImageSize>("1:1");
  const [resolution, setResolution] = useState<Resolution>("1k");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [job, setJob] = useState<ClientJob | null>(null);
  const [history, setHistory] = useState<JobSummary[]>([]);
  const [error, setError] = useState("");
  const [configMessage, setConfigMessage] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTemplate = TEMPLATES[templateId];
  const selectedJobTemplate = job ? TEMPLATES[job.templateId] : activeTemplate;
  const isBusy =
    isSubmitting ||
    job?.status === "uploading" ||
    job?.status === "submitted" ||
    job?.status === "processing";
  const canSubmit =
    Boolean(config?.hasApiKey) &&
    productName.trim() &&
    sellingPoints.trim() &&
    files.length > 0 &&
    supportsResolution(size, resolution) &&
    !isBusy;

  const progress = job ? Math.max(0, Math.min(100, job.progress)) : 0;
  const activeHistory = useMemo(
    () => history.filter((item) => isPollableStatus(item.status) && Boolean(item.taskId)),
    [history]
  );
  const activeHistoryKey = activeHistory
    .map((item) => `${item.id}:${item.status}:${item.progress}:${item.updatedAt}`)
    .join("|");

  const previewList = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => ({
        url: previews[index],
        name: files[index]?.name || `参考图 ${index + 1}`
      })),
    [files, previews]
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/config")
      .then((response) => response.json() as Promise<ConfigState>)
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("读取配置失败。");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [files]);

  useEffect(() => {
    if (!job?.id || job.status === "completed" || job.status === "failed") {
      return;
    }

    const timer = window.setTimeout(async () => {
      const nextJob = await pollJob(job.id);

      if (!nextJob) {
        setError("任务轮询失败。");
      }
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [job?.id, job?.status, job?.updatedAt]);

  useEffect(() => {
    if (activeHistory.length === 0) {
      return;
    }

    let cancelled = false;

    async function pollActiveHistory() {
      const results = await Promise.all(
        activeHistory.map((item) => pollJob(item.id, { silent: true }))
      );

      if (!cancelled && results.some(Boolean)) {
        await refreshHistory();
      }
    }

    void pollActiveHistory();
    const timer = window.setInterval(() => {
      void pollActiveHistory();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeHistoryKey]);

  async function refreshHistory() {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = (await response.json()) as { jobs?: JobSummary[] };
      setHistory(data.jobs || []);
    } catch {
      setHistory([]);
    }
  }

  async function pollJob(jobId: string, options: { silent?: boolean } = {}) {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      const data = (await response.json()) as { job?: ClientJob; error?: string };

      if (data.job) {
        const nextJob = data.job;
        setHistory((current) => mergeHistoryJob(current, nextJob as JobSummary));
        setJob((current) => (current?.id === nextJob.id ? nextJob : current));
      }

      if (!response.ok && data.error && !options.silent) {
        setError(data.error);
      }

      return data.job;
    } catch {
      if (!options.silent) {
        setError("任务轮询失败。");
      }

      return undefined;
    }
  }

  async function deleteJob(jobId: string) {
    const item = history.find((historyItem) => historyItem.id === jobId);
    const name = item?.productName || "这个任务";

    if (!window.confirm(`确定删除「${name}」吗？本地结果图和历史记录都会删除。`)) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "删除失败。");
      }

      setHistory((current) => current.filter((historyItem) => historyItem.id !== jobId));
      setJob((current) => (current?.id === jobId ? null : current));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败。");
    }
  }

  function selectTemplate(nextTemplateId: TemplateId) {
    const template = TEMPLATES[nextTemplateId];
    setTemplateId(nextTemplateId);
    setSize(template.defaultSize);

    if (!supportsResolution(template.defaultSize, resolution)) {
      setResolution("1k");
    }
  }

  function selectSize(nextSize: ImageSize) {
    setSize(nextSize);

    if (!supportsResolution(nextSize, resolution)) {
      setResolution("1k");
    }
  }

  function onFilesSelected(selectedFiles: FileList | null) {
    const nextFiles = Array.from(selectedFiles || []).slice(0, 4);
    setFiles(nextFiles);
  }

  async function onSaveApiKey() {
    setError("");
    setConfigMessage("");
    setIsSavingKey(true);

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ apiKey })
      });
      const data = (await response.json()) as ConfigState & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "保存 API Key 失败。");
      }

      setConfig(data);
      setApiKey("");
      setConfigMessage("API Key 已保存到本地配置。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存 API Key 失败。");
    } finally {
      setIsSavingKey(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setJob(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("productName", productName);
      formData.set("sellingPoints", sellingPoints);
      formData.set("promoText", promoText);
      formData.set("templateId", templateId);
      formData.set("size", size);
      formData.set("resolution", resolution);

      for (const file of files) {
        formData.append("images", file);
      }

      const response = await fetch("/api/jobs", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as { job?: ClientJob; error?: string };

      if (data.job) {
        setJob(data.job);
        void refreshHistory();
      }

      if (!response.ok) {
        throw new Error(data.error || "任务提交失败。");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "任务提交失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">APIMart · GPT-Image-2</p>
          <h1>电商作图工作台</h1>
        </div>
        <div className="header-status">
          <span className={config?.hasApiKey ? "status-pill ok" : "status-pill warn"}>
            {config?.hasApiKey ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {config?.hasApiKey ? "Key 已配置" : "Key 未配置"}
          </span>
          <span className="format-pill">{config?.model || "gpt-image-2"}</span>
        </div>
      </header>

      <section className="workspace">
        <form className="control-panel" onSubmit={onSubmit}>
          <header className="panel-header">
            <div>
              <p className="eyebrow">生成设置</p>
              <h2>商品素材</h2>
            </div>
          </header>

          <details className="key-panel">
            <summary>
              <span>
                <KeyRound size={16} />
                系统配置
              </span>
              <em>{config?.hasApiKey ? "Key 已配置" : "需要配置 Key"}</em>
            </summary>
            <div className="key-body">
              <label className="field">
                <span>APIMart API Key</span>
                <div className="key-row">
                  <input
                    autoComplete="off"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={config?.hasApiKey ? "已配置，输入新 Key 可替换" : "粘贴你的 APIMart Key"}
                    type="password"
                  />
                  <button
                    className="save-key-button"
                    disabled={!apiKey.trim() || isSavingKey}
                    type="button"
                    onClick={onSaveApiKey}
                  >
                    {isSavingKey ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                    保存
                  </button>
                </div>
              </label>
            </div>
            {configMessage ? <div className="message success">{configMessage}</div> : null}
          </details>

          <div className="field-grid">
            <label className="field">
              <span>
                <Package size={16} />
                商品名称
              </span>
              <input
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="例：便携恒温电热水杯"
                maxLength={80}
              />
            </label>

            <label className="field">
              <span>
                <Layers size={16} />
                核心卖点
              </span>
              <textarea
                value={sellingPoints}
                onChange={(event) => setSellingPoints(event.target.value)}
                placeholder="例：45°C 恒温、316 不锈钢、USB-C 充电"
                rows={4}
                maxLength={360}
              />
            </label>

            <label className="field">
              <span>
                <BadgePercent size={16} />
                促销标签
              </span>
              <input
                value={promoText}
                onChange={(event) => setPromoText(event.target.value)}
                placeholder="例：新品首发 / 限时到手价"
                maxLength={80}
              />
            </label>
          </div>

          <div className="section-block">
            <div className="section-title">
              <Image size={17} />
              模板
            </div>
            <div className="template-grid">
              {TEMPLATE_LIST.map((template) => (
                <button
                  className={`template-option ${template.id === templateId ? "selected" : ""}`}
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template.id)}
                  title={template.name}
                >
                  <strong>{template.shortName}</strong>
                  <span>{template.defaultSize}</span>
                  <em>{template.usage}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="two-col">
            <label className="field">
              <span>比例</span>
              <select value={size} onChange={(event) => selectSize(event.target.value as ImageSize)}>
                {IMAGE_SIZES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>分辨率</span>
              <select
                value={resolution}
                onChange={(event) => setResolution(event.target.value as Resolution)}
              >
                {RESOLUTIONS.map((option) => (
                  <option
                    disabled={!supportsResolution(size, option)}
                    key={option}
                    value={option}
                  >
                    {option.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="upload-zone">
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(event) => onFilesSelected(event.target.files)}
              ref={fileInputRef}
              type="file"
            />
            <div className="upload-head">
              <button
                className="upload-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={19} />
                选择参考图
              </button>
              <span>{files.length}/4</span>
            </div>
            <div className="upload-grid">
              {previewList.map((preview, index) => (
                <div className={`upload-slot ${preview.url ? "filled" : ""}`} key={preview.name}>
                  {preview.url ? (
                    <img alt={preview.name} src={preview.url} />
                  ) : (
                    <>
                      <FileImage size={20} />
                      <span>{index + 1}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button className="primary-action" disabled={!canSubmit} type="submit">
            {isBusy ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {isBusy ? "处理中" : "生成商品图"}
          </button>

          {error ? (
            <div className="message error" role="alert">
              <AlertTriangle size={17} />
              {error}
            </div>
          ) : null}
        </form>

        <section className="preview-panel">
          <section className="canvas-panel">
            <div className="preview-header">
              <div>
                <p className="eyebrow">{selectedJobTemplate.name}</p>
                <h2>{job?.productName || productName || "商品预览"}</h2>
              </div>
              <span className="format-pill">
                {job?.size || size} · {(job?.resolution || resolution).toUpperCase()}
              </span>
            </div>

            <div className={`result-canvas ${job?.result ? "has-result" : ""}`}>
              {job?.result ? (
                <img alt="生成结果" className="result-image" src={job.result.localUrl} />
              ) : (
                <div className="canvas-empty">
                  <Image size={38} />
                  <strong>等待生成结果</strong>
                  <span>上传参考图并填写商品信息后，生成图会显示在这里。</span>
                </div>
              )}
            </div>

            {job?.result ? (
              <div className="result-toolbar">
                <div>
                  <div className="section-title">
                    <HardDrive size={17} />
                    本地结果
                  </div>
                  <p>图片不保证长期保存，建议生成后及时下载。</p>
                </div>
                <div className="result-actions">
                  <a
                    className="download-button"
                    download
                    href={downloadUrl(job.result.localUrl)}
                  >
                    <Download size={17} />
                    下载图片
                  </a>
                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => void deleteJob(job.id)}
                  >
                    <Trash2 size={17} />
                    删除
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <div className="job-panel">
            <div className="job-topline">
              <div>
                <p className="eyebrow">任务状态</p>
                <h3>{job ? statusLabels[job.status] : "待提交"}</h3>
              </div>
              {job?.status === "processing" || job?.status === "submitted" ? (
                <RotateCw className="spin" size={18} />
              ) : null}
            </div>

            <div className="progress-track" aria-label="任务进度">
              <span style={{ width: `${progress}%` }} />
            </div>

            <dl className="job-meta">
              <div>
                <dt>模型</dt>
                <dd>{config?.model || "gpt-image-2"}</dd>
              </div>
              <div>
                <dt>任务 ID</dt>
                <dd>{job?.taskId || "-"}</dd>
              </div>
              <div>
                <dt>存储目录</dt>
                <dd>{config?.storageDir || "-"}</dd>
              </div>
            </dl>

            <div className="step-row" aria-label="生成流程">
              {["参考图", "提交", "生成", "下载"].map((step, index) => (
                <span className={stepClass(index, job?.status, Boolean(job?.result))} key={step}>
                  {step}
                </span>
              ))}
            </div>

            {job?.status === "failed" && job.error ? (
              <div className="failure-detail" role="alert">
                <AlertTriangle size={16} />
                <span>{job.error}</span>
              </div>
            ) : null}
          </div>

          <section className="history-panel">
            <div className="history-header">
              <div className="section-title">
                <Clock3 size={17} />
                任务历史
              </div>
              <div className="history-tools">
                {activeHistory.length > 0 ? (
                  <span className="auto-polling">
                    <RotateCw className="spin" size={14} />
                    自动轮询 {activeHistory.length}
                  </span>
                ) : null}
                <button className="ghost-button" type="button" onClick={refreshHistory}>
                  <RotateCw size={16} />
                  刷新
                </button>
              </div>
            </div>

            {history.length > 0 ? (
              <div className="history-list">
                {history.map((item) => (
                  <button
                    className={`history-item ${job?.id === item.id ? "active" : ""}`}
                    key={item.id}
                    type="button"
                    onClick={() => setJob(item as ClientJob)}
                  >
                    <div className="history-thumb">
                      {item.result?.localUrl ? (
                        <img alt={item.productName} src={item.result.localUrl} />
                      ) : (
                        <Image size={19} />
                      )}
                    </div>
                    <div className="history-main">
                      <strong>{item.productName || "未命名商品"}</strong>
                      <span>
                        {TEMPLATES[item.templateId].shortName} · {item.size} ·{" "}
                        {item.resolution.toUpperCase()}
                      </span>
                      <em>{formatDateTime(item.updatedAt)}</em>
                      {item.status === "failed" && item.error ? (
                        <small className="history-error">{item.error}</small>
                      ) : null}
                    </div>
                    <span className={`history-status ${item.status}`}>
                      {statusLabels[item.status]}
                    </span>
                    {item.result?.localUrl ? (
                      <a
                        className="history-download"
                        download
                        href={downloadUrl(item.result.localUrl)}
                        onClick={(event) => event.stopPropagation()}
                        title="下载图片"
                      >
                        <Download size={15} />
                      </a>
                    ) : null}
                    <button
                      className="history-delete"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteJob(item.id);
                      }}
                      title="删除任务"
                    >
                      <Trash2 size={15} />
                    </button>
                  </button>
                ))}
              </div>
            ) : (
              <div className="history-empty">暂无历史任务</div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function stepClass(index: number, status: JobStatus | undefined, hasResult: boolean) {
  const activeIndex =
    status === "failed"
      ? 2
      : hasResult || status === "completed"
        ? 3
        : status === "processing"
          ? 2
          : status === "submitted"
            ? 1
            : 0;

  return index <= activeIndex ? "step-item active" : "step-item";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function downloadUrl(localUrl: string) {
  return `${localUrl}${localUrl.includes("?") ? "&" : "?"}download=1`;
}

function isPollableStatus(status: JobStatus) {
  return status === "submitted" || status === "processing";
}

function mergeHistoryJob(history: JobSummary[], nextJob: JobSummary) {
  const next = history.some((item) => item.id === nextJob.id)
    ? history.map((item) => (item.id === nextJob.id ? nextJob : item))
    : [nextJob, ...history];

  return next.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
