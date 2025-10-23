## AI 微服务（FastAPI）

- 目的：为现有系统提供统一的 LLM 调用入口，支持 API Key 鉴权与流式输出（SSE）。
- 技术：FastAPI + OpenAI SDK（统一走 OpenAI 兼容协议），支持 OpenAI、DeepSeek、通义 Qwen（DashScope 兼容模式）、Ollama。

### 1. 环境配置

复制 `env.sample` 为 `.env`（或直接配置系统环境变量）：

```
PORT=8001
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
python main.py  # 默认 0.0.0.0:8001
```

或使用：

```
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
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
