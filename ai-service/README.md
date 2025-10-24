## AI 微服务（FastAPI）

- 目的：为现有系统提供统一的 LLM 调用入口，支持 API Key 鉴权与流式输出（SSE）。
- 技术：FastAPI + OpenAI SDK（统一走 OpenAI 兼容协议），支持 OpenAI、DeepSeek、通义 Qwen（DashScope 兼容模式）、Ollama。

### 1. 环境配置

复制 `env.sample` 为 `.env`（或直接配置系统环境变量）：

```
PORT=3001
CORS_ORIGINS=http://localhost:8000,http://localhost:3000,http://localhost:3001
AI_SERVICE_API_KEY=replace-with-a-strong-key

# 缺省 provider（请求未指定时使用）
PROVIDER=qwen

# OpenAI
OPENAI_API_KEY=sk-xxxxx
# OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# DeepSeek（OpenAI 兼容）
DEEPSEEK_API_KEY=ds-xxxxx
# DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 通义 Qwen（DashScope 兼容）
QWEN_API_KEY=dash-xxxxx
# QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus

# 本地 Ollama（OpenAI 兼容 API）
# OLLAMA_API_KEY=
# OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
```

- 若未设置 `AI_SERVICE_API_KEY`，则鉴权关闭（便于本地开发）。
- `OPENAI_BASE_URL` 可指向 OpenAI 兼容服务（如代理/其它平台）。

可选：助手人格（小媒）
```
PERSONA_ENABLED=true
PERSONA_NAME=小媒
PERSONA_DESC=新媒体工作室的小助手，擅长创作灵感、脚本分镜、广告文案与投放建议
PERSONA_EXAMPLES=例如：给我3个短视频创意方向；把创意#2扩展为分镜脚本；帮我优化这段文案
```

### 2. 安装与启动

```
cd ai-service
python -m venv .venv && .venv/Scripts/activate  # Windows PowerShell
pip install -r requirements.txt
python main.py  # 默认 0.0.0.0:3001
```

或使用：

```
uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```

### 2.1 使用 Docker 运行（开箱即用）

准备环境：

```bash
cp ai-service/env.sample ai-service/.env  # 在仓库根执行
# 按需编辑 ai-service/.env 中的 API Key、provider 与端口
```

方式 A：单容器运行

```bash
docker build -t ai-service ./ai-service

# 运行（默认映射 3001），可用 -e 覆盖参数
docker run -d --name ai-service \
  -e PORT=3001 \
  -e CORS_ORIGINS="http://localhost:3000,http://localhost:3001" \
  -e AI_SERVICE_API_KEY=replace-with-a-strong-key \
  -e PROVIDER=qwen \
  -e QWEN_API_KEY=sk-xxxxx \
  -e QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 \
  -p 3001:3001 \
  ai-service

# 健康检查
curl http://localhost:3001/health
```

方式 B：使用 Compose（一键启动）

```bash
# 在仓库根，可直接用环境变量覆盖
# 例：临时指定 CORS 与 APIKEY
CORS_ORIGINS="http://localhost:3000,http://localhost:3001" \
AI_SERVICE_API_KEY=replace-with-a-strong-key \
docker compose up -d
```

注意：
- 若容器内需访问宿主机上的本地 Ollama，请在 `.env` 中设置：
  - `OLLAMA_BASE_URL=http://host.docker.internal:11434/v1`
- 如不想开启鉴权，将 `.env` 中 `AI_SERVICE_API_KEY` 留空即可（开发模式）。
- 默认端口 `PORT=8001`，如需改变，需同步修改端口映射（`-p <host>:<container>` 或 compose 中的 `ports`）。

### 2.2 多架构镜像（arm64/amd64）

你的开发机是 Apple Silicon（arm64），而目标主机可能是 x86_64（amd64）。推荐两种“最省心”的方式：

方式 A：直接用 GitHub Actions 自动构建并发布多架构镜像（推荐）

1. 本仓库已内置工作流：`.github/workflows/ai-service-docker.yml`
2. 推送到 `main` 或打 `ai-service-v*` 标签后，CI 会：
   - 使用 Buildx + QEMU 构建 `linux/amd64, linux/arm64`
   - 推送到 GHCR：`ghcr.io/<org_or_user>/ai-service`
3. 首次使用需在 GitHub 仓库启用 `Packages: write` 权限（默认工作流已设置），即可使用无需额外密钥。

拉取并运行（已替换为你的账户）：
```bash
docker pull ghcr.io/king133444/ai-service:latest
docker run -d --name ai-service \
  -e PORT=3001 \
  -e CORS_ORIGINS="http://localhost:3000,http://localhost:3001" \
  -p 3001:3001 \
  ghcr.io/king133444/ai-service:latest
```

若你偏好 Docker Hub，可在仓库 Secrets 配置 `DOCKERHUB_USERNAME/DOCKERHUB_TOKEN`，并解开工作流里对应注释块。

方式 B：本地 buildx 构建并推送

```bash
# 一次性准备
docker buildx create --use --name multi
docker buildx inspect --bootstrap

# 多架构构建并推送（需指定你自己的仓库名）
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/king133444/ai-service:latest \
  -f ai-service/Dockerfile \
  --push \
  ai-service
```

没有镜像仓库？可以各自构建单架构镜像并 `--load` 到本机（注意 `--load` 只能加载单平台镜像）：

```bash
# 仅加载到本机 Docker（当前平台）
docker buildx build -t ai-service:local -f ai-service/Dockerfile --load ai-service

# 或分别构建并导出为 tar，带去目标机器再 docker load
docker buildx build --platform linux/amd64 -t ai-service:amd64 -f ai-service/Dockerfile \
  --output type=tar,dest=ai-service_amd64.tar ai-service
docker buildx build --platform linux/arm64 -t ai-service:arm64 -f ai-service/Dockerfile \
  --output type=tar,dest=ai-service_arm64.tar ai-service
```

### 3. 健康检查

```
GET /health
```

响应：
```
{"status":"ok","defaultProvider":"qwen","providers":["openai","deepseek","qwen","ollama"]}
```

### 4. 鉴权方式

- 在请求头携带：
  - `X-API-Key: <AI_SERVICE_API_KEY>`，或
  - `Authorization: Bearer <AI_SERVICE_API_KEY>`

未配置 `AI_SERVICE_API_KEY` 时不校验（开发模式）。

### 5. 接口

1) 非流式聊天（原始对话，不注入任何系统 Prompt）
```
POST /v1/chat
Content-Type: application/json
X-API-Key: <key>

{
  "messages": [
    {"role":"user","content":"给我 3 个 UI 灵感"}
  ],
  "provider": "deepseek",   # 可选：openai/deepseek/qwen/ollama
  "model": "deepseek-chat",  # 可选：覆盖各 provider 默认模型
  "temperature": 0.7,
  "max_tokens": 512
}
```

响应（精简）：
```
{
  "id":"chatcmpl_xxx",
  "object":"chat.completion",
  "created":1710000000,
  "model":"gpt-4o-mini",
  "choices":[{"index":0,"message":{"role":"assistant","content":"..."}}]
}
```

2) 流式聊天（SSE，原始对话）
```
POST /v1/chat/stream
Accept: text/event-stream
X-API-Key: <key>

{ "messages": [...], "provider": "qwen", "model": "qwen-plus" }
```
返回 `text/event-stream`，多行 `data: {...}\n\n`，最后一行 `data: [DONE]`。

返回 `text/event-stream`，多行 `data: {...}\n\n`，最后一行 `data: [DONE]`。

3) 助手场景（带“人格：小媒”），自动在消息首部注入 system 描述
```
POST /v1/assistant/inspire
POST /v1/assistant/inspire/stream   # SSE

Body 示例：
{
  "role":"creator",            # 业务角色，仅用于服务端建议问题等
  "topic":"秋季新款卫衣",       # 若无 messages，则以 topic 作为一条 user 消息
  "messages":[{"role":"user","content":"给我 3 个短视频创意方向"}],
  "provider":"qwen",
  "model":"qwen-plus"
}
```

说明：
- 人格注入仅在 assistant 接口中生效，/v1/chat 与 /v1/chat/stream 一律不注入。
- 可通过环境变量关闭人格：`PERSONA_ENABLED=false`。

### 6. 与现有系统集成建议

- 前端不应直接暴露 AI 微服务的 `AI_SERVICE_API_KEY`。推荐在 NestJS 后端新增网关接口转发：
  - 后端持有 `AI_SERVICE_API_KEY`，代表服务器端调用 AI 微服务
  - 前端继续复用已有 WebSocket 进行聊天展示；AI 微服务仅提供 LLM 能力

- 已支持多提供商；后续可继续扩展到 Azure OpenAI、Claude 兼容等。
- 可通过 PERSONA_* 环境变量定制“小媒”人格文案。
