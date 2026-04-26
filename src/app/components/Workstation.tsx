"use client";

import {
  AlertTriangle,
  Clock3,
  Download,
  FileImage,
  HardDrive,
  Image,
  KeyRound,
  Loader2,
  RotateCw,
  Save,
  Sparkles,
  Trash2,
  UploadCloud
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  getDefaultPromptPresetId,
  removeFileAtIndex,
  IMAGE_SIZES,
  PROMPT_PRESET_LIST,
  PROMPT_PRESETS,
  RESOLUTIONS,
  TEMPLATES,
  supportsResolution
} from "@/lib/ecommerce";
import type { ImageSize, PromptPresetId, Resolution, TemplateId } from "@/lib/ecommerce";

type ConfigState = {
  hasApiKey: boolean;
  model: string;
  storageDir: string;
};

type JobStatus = "uploading" | "submitted" | "processing" | "completed" | "failed";

type ClientJob = {
  id: string;
  productName: string;
  prompt: string;
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
  | "prompt"
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
  const [promptPresetId, setPromptPresetId] = useState<PromptPresetId | "">("");
  const [customPrompt, setCustomPrompt] = useState("");
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

  const activePreset = promptPresetId ? PROMPT_PRESETS[promptPresetId] : undefined;
  const activeTemplate = TEMPLATES[templateId];
  const selectedJobTemplate = job ? TEMPLATES[job.templateId] : activeTemplate;
  const isBusy =
    isSubmitting ||
    job?.status === "uploading" ||
    job?.status === "submitted" ||
    job?.status === "processing";
  const canSubmit =
    Boolean(config?.hasApiKey) &&
    customPrompt.trim() &&
    supportsResolution(size, resolution) &&
    !isBusy;

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

  function selectPromptPreset(nextPromptPresetId: PromptPresetId) {
    const preset = PROMPT_PRESETS[nextPromptPresetId];
    setPromptPresetId(nextPromptPresetId);
    setCustomPrompt(preset.prompt);
    setTemplateId(preset.templateId);
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

  function removeSelectedFile(index: number) {
    setFiles((current) => removeFileAtIndex(current, index));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      formData.set("productName", promptTitle(customPrompt, activePreset?.name || "提示词任务"));
      formData.set("sellingPoints", "");
      formData.set("promoText", "");
      formData.set("customPrompt", customPrompt);
      formData.set("templateId", templateId);
      formData.set("promptPresetId", promptPresetId || getDefaultPromptPresetId(size));
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
          <h1>电商作图工作台</h1>
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

          <label className="field">
            <span>
              <Sparkles size={16} />
              提示词
            </span>
            <textarea
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              placeholder="请写清楚用途、背景、构图、卖点文字、不要改变的商品细节。"
              rows={10}
              maxLength={2400}
            />
          </label>

          <label className="field">
            <span>
              <Sparkles size={16} />
              预设提示词
            </span>
            <select
              value={promptPresetId}
              onChange={(event) => {
                const nextPresetId = event.target.value;

                if (nextPresetId) {
                  selectPromptPreset(nextPresetId as PromptPresetId);
                } else {
                  setPromptPresetId("");
                }
              }}
            >
              <option value="">不使用预设，手动填写提示词</option>
              {PROMPT_PRESET_LIST.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} · 推荐 {preset.defaultSize} · {preset.usage}
                </option>
              ))}
            </select>
            <p className="prompt-hint">
              选择预设会填充上方提示词，可继续手动修改。实际出图比例以下方选择为准。
            </p>
          </label>

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
              <div
                className="upload-label"
                aria-hidden="true"
              >
                <UploadCloud size={19} />
                参考图
              </div>
              <span>{files.length > 0 ? `${files.length}/4` : "可选，最多 4 张"}</span>
            </div>
            <div className="upload-grid">
              {previewList.map((preview, index) => (
                <div
                  className={`upload-slot ${preview.url ? "filled" : ""}`}
                  key={`${preview.name}-${index}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  {preview.url ? (
                    <>
                      <img alt={preview.name} src={preview.url} />
                      <button
                        aria-label={`删除${preview.name}`}
                        className="upload-remove-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeSelectedFile(index);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
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
            {isBusy ? "处理中" : "生成图片"}
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
                <h2>{job?.productName || activePreset?.name || "商品预览"}</h2>
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
                  <span>
                    选择预设或直接填写自定义提示词，生成图会显示在这里。
                  </span>
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

          {job?.status === "failed" && job.error ? (
            <div className="failure-detail" role="alert">
              <AlertTriangle size={16} />
              <span>{job.error}</span>
            </div>
          ) : null}

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
                  <div
                    className={`history-item ${job?.id === item.id ? "active" : ""}`}
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setJob(item as ClientJob)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setJob(item as ClientJob);
                      }
                    }}
                  >
                    <div className="history-thumb">
                      {item.result?.localUrl ? (
                        <img alt={item.productName} src={item.result.localUrl} />
                      ) : (
                        <Image size={19} />
                      )}
                    </div>
                    <div className="history-main">
                      <strong>{item.productName || "未命名任务"}</strong>
                      <p title={item.prompt}>{item.prompt || item.productName || "暂无提示词"}</p>
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
                  </div>
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

function promptTitle(prompt: string, fallback: string) {
  const firstLine = prompt
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return fallback;
  }

  return firstLine.length > 24 ? `${firstLine.slice(0, 24)}...` : firstLine;
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
