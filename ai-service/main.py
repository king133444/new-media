import os
import time
import json
from typing import List, Optional, Literal, Iterator, Dict

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv


# ----- Schemas -----
class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_items=1)
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    provider: Optional[str] = None  # 可选：请求级指定厂商（openai/deepseek/qwen/ollama）


class ChatChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Optional[str] = None


class ChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatChoice]


# ----- Domain Prompts & DTOs -----
class InspireRequest(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None

    role: Literal["creator", "advertiser"]
    topic: str = Field(..., min_length=1, description="主题，如：秋季新款卫衣")
    num_ideas: Optional[int] = 3
    style: Optional[str] = None  # 语气/风格，如：年轻、潮流、专业、可执行
    platform: Optional[str] = None  # 平台，如：抖音/小红书/B站/全平台
    audience: Optional[str] = None  # 受众画像/人群描述
    language: Optional[str] = "zh-CN"
    extra_context: Optional[str] = None  # 其它上下文（可粘贴业务信息）
    messages: Optional[List[ChatMessage]] = None  # 继续对话时携带历史


class SuggestionsResponse(BaseModel):
    role: Literal["creator", "advertiser"]
    suggestions: List[str]


# ----- Provider Abstraction -----
class ChatProvider:
    name: str
    def chat(self, req: ChatRequest) -> ChatResponse:  # pragma: no cover - interface
        raise NotImplementedError
    def stream_chat(self, req: ChatRequest) -> Iterator[str]:  # Server-Sent Events payload lines
        raise NotImplementedError


class OpenAICompatProvider(ChatProvider):
    def __init__(self, *, name: str, api_key_env: str, base_url_env: str, default_model_env: str, fallback_model: str):
        # Lazy import to keep service lightweight when unused
        from openai import OpenAI  # type: ignore

        api_key = os.getenv(api_key_env)
        base_url = os.getenv(base_url_env)
        # 某些兼容端点可不需要 API Key（如本地 Ollama），允许为空
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.default_model = os.getenv(default_model_env, fallback_model)
        self.name = name

    def chat(self, req: ChatRequest) -> ChatResponse:
        model = req.model or self.default_model
        try:
            completion = self.client.chat.completions.create(
                model=model,
                messages=[m.model_dump() for m in req.messages],
                temperature=req.temperature,
                max_tokens=req.max_tokens,
            )
        except Exception as e:  # Fast fail with meaningful message
            raise HTTPException(status_code=502, detail=f"LLM 提供商调用失败: {e}")

        # 规范化响应
        created = int(getattr(completion, "created", int(time.time())))
        first = completion.choices[0]
        msg = ChatMessage(role=first.message.role, content=first.message.content or "")
        choice = ChatChoice(index=0, message=msg, finish_reason=getattr(first, "finish_reason", None))
        return ChatResponse(
            id=getattr(completion, "id", f"chatcmpl_{int(time.time()*1000)}"),
            created=created,
            model=model,
            choices=[choice],
        )

    def stream_chat(self, req: ChatRequest) -> Iterator[str]:
        model = req.model or self.default_model
        try:
            stream = self.client.chat.completions.create(
                model=model,
                messages=[m.model_dump() for m in req.messages],
                temperature=req.temperature,
                max_tokens=req.max_tokens,
                stream=True,
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM 提供商调用失败: {e}")

        # Emit OpenAI-compatible SSE chunks
        for chunk in stream:
            try:
                choice = chunk.choices[0]
                delta = getattr(choice, "delta", None)
                content_piece = getattr(delta, "content", None)
                payload = {
                    "id": getattr(chunk, "id", f"chatcmpl_{int(time.time()*1000)}"),
                    "object": "chat.completion.chunk",
                    "created": int(getattr(chunk, "created", int(time.time()))),
                    "model": model,
                    "choices": [
                        {
                            "index": 0,
                            "delta": {
                                "role": getattr(delta, "role", None),
                                "content": content_piece,
                            },
                            "finish_reason": getattr(choice, "finish_reason", None),
                        }
                    ],
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            except Exception:
                # Skip malformed chunks to keep the stream resilient
                continue
        yield "data: [DONE]\n\n"


# ----- App Factory -----
def create_app() -> FastAPI:
    # 加载本地 .env（若存在）
    try:
        load_dotenv()
    except Exception:
        pass
    app = FastAPI(title="AI Microservice", version="0.1.0")

    # CORS
    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8000,http://localhost:3000,http://localhost:3001")
    origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Provider registry（均走 OpenAI 兼容协议）
    default_provider_name = os.getenv("PROVIDER", "qwen").lower()
    providers: Dict[str, ChatProvider] = {
        "openai": OpenAICompatProvider(
            name="openai",
            api_key_env="OPENAI_API_KEY",
            base_url_env="OPENAI_BASE_URL",
            default_model_env="OPENAI_MODEL",
            fallback_model="gpt-4o-mini",
        ),
        # DeepSeek：默认基址 https://api.deepseek.com（OpenAI 兼容）
        "deepseek": OpenAICompatProvider(
            name="deepseek",
            api_key_env="DEEPSEEK_API_KEY",
            base_url_env="DEEPSEEK_BASE_URL",
            default_model_env="DEEPSEEK_MODEL",
            fallback_model="deepseek-chat",
        ),
        # 通义 Qwen（DashScope 兼容模式）：https://dashscope.aliyuncs.com/compatible-mode/v1
        "qwen": OpenAICompatProvider(
            name="qwen",
            api_key_env="QWEN_API_KEY",
            base_url_env="QWEN_BASE_URL",
            default_model_env="QWEN_MODEL",
            fallback_model="qwen-flash",
        ),
        # 本地 Ollama 的 OpenAI 兼容 API：默认 http://localhost:11434/v1
        "ollama": OpenAICompatProvider(
            name="ollama",
            api_key_env="OLLAMA_API_KEY",  # 通常为空
            base_url_env="OLLAMA_BASE_URL",
            default_model_env="OLLAMA_MODEL",
            fallback_model="llama3.1",
        ),
    }

    # 补充默认 base_url（若未设置环境变量）
    if not os.getenv("DEEPSEEK_BASE_URL"):
        os.environ["DEEPSEEK_BASE_URL"] = "https://api.deepseek.com"
    if not os.getenv("QWEN_BASE_URL"):
        os.environ["QWEN_BASE_URL"] = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    if not os.getenv("OLLAMA_BASE_URL"):
        os.environ["OLLAMA_BASE_URL"] = "http://localhost:11434/v1"

    def pick_provider(req_provider: Optional[str]) -> ChatProvider:
        name = (req_provider or default_provider_name or "openai").lower()
        if name not in providers:
            raise HTTPException(status_code=400, detail=f"不支持的 provider: {name}")
        return providers[name]

    # ---- Prompt templates (with optional persona) ----
    def _truthy(v: Optional[str]) -> bool:
        return (v or "").strip().lower() in ("1", "true", "yes", "y", "on")

    def build_inspire_messages(req: InspireRequest) -> List[ChatMessage]:
        # 基础：透传现有消息，或以 topic 作为一条用户消息
        base: List[ChatMessage]
        if req.messages and len(req.messages) > 0:
            base = req.messages
        elif req.topic:
            base = [ChatMessage(role="user", content=req.topic)]
        else:
            raise HTTPException(status_code=400, detail="缺少 messages 或 topic")

        # 可选人格：小媒（通过环境变量开关与文案配置）
        use_persona_env = os.getenv("PERSONA_ENABLED", "true")
        if _truthy(use_persona_env):
            name = os.getenv("PERSONA_NAME", "小媒")
            desc = os.getenv("PERSONA_DESC", "新媒体工作室的小助手，擅长创作灵感、脚本分镜、广告文案与投放建议")
            examples = os.getenv("PERSONA_EXAMPLES", "例如：给我3个短视频创意方向；把创意#2扩展为分镜脚本；帮我优化这段文案")
            persona_text = f"你叫{name}，是{desc}。你可以向我提问，{examples}。请先理解用户意图，直接切题作答。"
            persona_msg = ChatMessage(role="system", content=persona_text)
            return [persona_msg, *base]
        return base

    def get_suggestions(role: str) -> List[str]:
        if role == "creator":
            return [
                "给我3个短视频创意方向，主题是秋季新款卫衣。",
                "基于潮流与校园场景，设计5个可执行拍摄脚本。",
                "给我一段 15s 的开场钩子模板，适配穿搭类。",
                "按『剧情反转』结构，写3条脚本提纲与口播。",
            ]
        else:
            return [
                "面向18-25岁学生党，提炼 5 条卫衣卖点与钩子。",
                "给出3个投放创意方向（抖音信息流），含CTA。",
                "用AIDA模型写 3 条卫衣广告文案（每条≤80字）。",
                "根据人群画像，推荐合适的达人种草视频切入点。",
            ]

    # ---- Debug logger for outgoing LLM requests ----
    def _log_llm_request(tag: str, provider_name_for_log: str, model_hint: Optional[str], messages: List[ChatMessage]):
        try:
            print("\n=== AI-REQ ===")
            print(f"tag={tag} provider={provider_name_for_log} model={model_hint or '<default>'} count={len(messages)}")
            max_len = int(os.getenv("DEBUG_LOG_TRUNCATE", "500"))
            for i, m in enumerate(messages):
                content = m.content
                if len(content) > max_len:
                    content = content[:max_len] + "...<truncated>"
                print(f"[{i}] {m.role}: {content}")
            print("=== /AI-REQ ===\n")
        except Exception:
            pass

    # --- API Key auth ---
    def verify_api_key(x_api_key: Optional[str] = Header(default=None), authorization: Optional[str] = Header(default=None)) -> None:
        expected = os.getenv("AI_SERVICE_API_KEY")
        print('expected', os.getenv("AI_SERVICE_API_KEY"))
        if not expected:
            return  # 若未配置，则不启用鉴权，便于本地开发
        provided = x_api_key
        if not provided and authorization and authorization.startswith("Bearer "):
            provided = authorization.replace("Bearer ", "", 1).strip()
        if not provided or provided != expected:
            raise HTTPException(status_code=401, detail="无效的 API Key")

    @app.get("/health")
    async def health():
        return {"status": "ok", "defaultProvider": default_provider_name, "providers": list(providers.keys())}

    @app.post("/v1/chat", response_model=ChatResponse)
    async def chat(req: ChatRequest, _: None = Depends(verify_api_key)):
        provider = pick_provider(req.provider)
        _log_llm_request("chat", provider.name, req.model, req.messages)
        return provider.chat(req)

    @app.post("/v1/chat/stream")
    async def chat_stream(req: ChatRequest, _: None = Depends(verify_api_key)):
        provider = pick_provider(req.provider)
        _log_llm_request("chat.stream", provider.name, req.model, req.messages)

        def sse_wrapper():
            try:
                inner = provider.stream_chat(req)
                for chunk in inner:
                    yield chunk
            except Exception as e:
                # 以 OpenAI 兼容的 SSE 返回一条错误提示，避免已开始响应后再抛异常
                payload = {
                    "id": f"chatcmpl_{int(time.time()*1000)}",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": req.model or getattr(provider, "default_model", "unknown"),
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"role": "assistant", "content": f"【错误】{e}"},
                            "finish_reason": "error",
                        }
                    ],
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(sse_wrapper(), media_type="text/event-stream")

    # --- Inspire endpoints (domain prompts) ---
    @app.get("/v1/assistant/suggestions", response_model=SuggestionsResponse)
    async def suggestions(role: Literal["creator", "advertiser", "designer"], _: None = Depends(verify_api_key)):
        return {"role": role, "suggestions": get_suggestions(role)}

    @app.post("/v1/assistant/inspire", response_model=ChatResponse)
    async def inspire(req: InspireRequest, _: None = Depends(verify_api_key)):
        provider = pick_provider(req.provider)
        messages = build_inspire_messages(req)
        _log_llm_request("inspire", provider.name, req.model, messages)
        return provider.chat(ChatRequest(messages=messages, model=req.model, temperature=req.temperature, max_tokens=req.max_tokens, provider=req.provider))

    @app.post("/v1/assistant/inspire/stream")
    async def inspire_stream(req: InspireRequest, _: None = Depends(verify_api_key)):  # pyright: ignore[reportUnusedFunction]
        provider = pick_provider(req.provider)
        messages = build_inspire_messages(req)
        _log_llm_request("inspire.stream", provider.name, req.model, messages)

        def sse_wrapper():
            try:
                inner = provider.stream_chat(ChatRequest(messages=messages, model=req.model, temperature=req.temperature, max_tokens=req.max_tokens, provider=req.provider))
                for chunk in inner:
                    yield chunk
            except Exception as e:
                payload = {
                    "id": f"chatcmpl_{int(time.time()*1000)}",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": req.model or getattr(provider, "default_model", "unknown"),
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"role": "assistant", "content": f"【错误】{e}"},
                            "finish_reason": "error",
                        }
                    ],
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(sse_wrapper(), media_type="text/event-stream")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "3001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)


