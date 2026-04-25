# GPT-Image 电商作图工作台

一个面向国内电商运营的本地/网页作图工具，基于 APIMart `gpt-image-2` 模型。运营可以上传商品参考图，选择主图、场景图、详情横图模板，生成适合淘宝、京东等平台使用的商品图。

## 功能

- 上传最多 4 张商品参考图
- 支持白底主图、场景图、详情横图 3 类模板
- 支持 `1:1`、`4:5`、`16:9` 比例
- 支持 `1K / 2K / 4K` 分辨率选择
- 页面内配置 APIMart API Key
- 自动提交异步生成任务并轮询状态
- 生成成功后自动下载结果图到本地
- 任务历史列表，刷新页面后可自动继续轮询未完成任务
- 失败任务显示失败原因

## 环境要求

- Node.js 20 或更高版本
- npm
- APIMart API Key

## 本地运行

安装依赖：

```bash
npm install
```

复制环境变量示例：

```bash
cp .env.example .env.local
```

填写 `.env.local`：

```bash
APIMART_API_KEY=你的_apimart_key
APIMART_STORAGE_DIR=./storage
```

也可以不提前填写 Key，启动后在页面里的 `APIMart API Key` 输入框保存。

启动开发服务：

```bash
npm run dev -- --port 3000
```

打开：

```text
http://localhost:3000
```

## 生产运行

构建：

```bash
npm run build
```

启动：

```bash
npm run start -- --port 3000
```

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `APIMART_API_KEY` | 是 | APIMart API Key |
| `APIMART_BASE_URL` | 否 | 默认 `https://api.apimart.ai` |
| `APIMART_STORAGE_DIR` | 否 | 默认 `./storage` |

## 数据存储

默认会把数据保存在项目目录下的 `storage/`：

```text
storage/
  jobs/
    <job-id>/
      metadata.json
      input-1-xxx.png
      result-1.png
```

`storage/` 不会提交到 GitHub。部署到免费平台时要注意：很多免费服务器的本地磁盘不保证长期保存，重新部署后历史图片可能丢失。

## 部署建议

### 试用

可以使用：

- GitHub 私有仓库
- Render Free Web Service

Render 配置参考：

```text
Build Command: npm install && npm run build
Start Command: npm run start -- --port $PORT
```

环境变量：

```text
APIMART_API_KEY=你的_apimart_key
APIMART_STORAGE_DIR=./storage
```

### 正式给运营使用

建议增加：

- 登录权限
- 对象存储，例如 OSS、S3、R2
- 数据库保存任务历史，例如 Postgres 或 SQLite 持久化磁盘
- Nginx/域名/HTTPS

## 常用命令

类型检查：

```bash
npm run typecheck
```

测试：

```bash
npm test
```

生产构建：

```bash
npm run build
```

检查生产依赖漏洞：

```bash
npm audit --omit=dev
```

## 注意事项

- 不要把 `.env.local` 上传到 GitHub。
- 不要把 `storage/` 上传到 GitHub，里面可能包含商品图和生成结果。
- 模型生成中文文案可能有错字，发布到电商平台前需要人工复核。
- APIMart 返回的远程图片 URL 可能会过期，本项目会在任务完成后尽快下载到本地保存。
