import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Drawer, Input, Space, Tag, Tooltip, Typography, theme, message } from 'antd';
import { SendOutlined, CloseCircleOutlined, RobotOutlined, RedoOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const { Text } = Typography;

// 直接沿用 aiurl 环境变量的协议与端口（本地 http://，线上 https://）
const AI_SERVICE_URL = (process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8001')
  .replace(/\/$/, '');


type ChatItem = { role: 'user' | 'assistant'; content: string };

function roleToInspireRole(role?: string): 'creator' | 'advertiser' | 'designer' {
  if (role === 'ADVERTISER') return 'advertiser';
  if (role === 'DESIGNER') return 'designer';
  return 'creator';
}

async function fetchSuggestions(role: 'creator' | 'advertiser' | 'designer', authToken?: string | null) {
  const res = await fetch(`${AI_SERVICE_URL}/v1/assistant/suggestions?role=${role}`, {
    headers: {
      'Accept': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    },
    credentials: 'omit',
  });
  if (!res.ok) throw new Error(`suggestions failed: ${res.status}`);
  return res.json() as Promise<{ role: string; suggestions: string[] }>;
}

async function streamInspire(
  role: 'creator' | 'advertiser' | 'designer',
  topic: string,
  messages: ChatItem[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  authToken?: string | null,
) {
  const body = {
    role,
    topic,
    provider: 'qwen',
    model: 'qwen-plus',
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  };
  const res = await fetch(`${AI_SERVICE_URL}/v1/assistant/inspire/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let buffer = '';
  while (!done) {
    const { value, done: d } = await reader.read();
    done = d || false;
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.replace(/^data:\s*/, '');
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const piece = json?.choices?.[0]?.delta?.content || '';
          if (piece) onChunk(piece);
        } catch {}
      }
    }
  }
}

const AIAssistant: React.FC = () => {
  const {user, token: authToken} = useSelector((s: RootState) => s.auth);
  const r = roleToInspireRole(user?.role);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [suggests, setSuggests] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const { token } = theme.useToken();

  useEffect(() => {
    if (!open) return;
    fetchSuggestions(r, authToken)
      .then((data) => setSuggests(data.suggestions || []))
      .catch(() => setSuggests([]));
  }, [open, r, authToken]);

  const startStream = useCallback(async () => {
    if (!topic && !input.trim()) {
      message.warning('请输入主题或问题');
      return;
    }
    const history = [...items];
    const newItems: ChatItem[] = [...history, { role: 'user', content: input || `围绕主题：${topic} 给出创意建议` }];
    setItems(newItems);
    setInput('');
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const controller = abortRef.current;
    let acc = '';
    try {
      setItems((arr) => [...arr, { role: 'assistant', content: '' }]);
      await streamInspire(r, topic || '泛内容', newItems, (t) => {
        acc += t;
        setItems((arr) => {
          const copy = arr.slice();
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      }, controller.signal, authToken);
    } catch (e: any) {
      if (e?.name !== 'AbortError') message.error('AI响应失败');
    } finally {
      setLoading(false);
    }
  }, [items, input, r, topic, authToken]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const retryLast = useCallback(() => {
    if (!items.length) return;
    // 移除最后一条 assistant，重新生成
    const trimmed = items[items.length - 1]?.role === 'assistant' ? items.slice(0, -1) : items.slice();
    setItems(trimmed);
    setTimeout(() => startStream(), 0);
  }, [items, startStream]);

  const QuickAsk = useMemo(() => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
      {suggests.map((q, idx) => (
        <Tag key={idx} color="blue" style={{ cursor: 'pointer' }} onClick={() => setInput(q)}>
          {q}
        </Tag>
      ))}
    </div>
  ), [suggests]);

  return (
    <>
      {/* 悬浮按钮 */}
      <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1020 }}>
        <Tooltip title="AI 助理">
          <Button type="primary" shape="round" size="large" icon={<RobotOutlined />} onClick={() => setOpen(true)}>
            Chat
          </Button>
        </Tooltip>
      </div>

      {/* 右侧抽屉对话 */}
      <Drawer
        title={<span><RobotOutlined /> 全局 AI 助理</span>}
        placement="right"
        width={420}
        onClose={() => setOpen(false)}
        open={open}
        destroyOnClose={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 8 }}>
            <Input placeholder="主题（如：秋季新款卫衣）" value={topic} onChange={(e) => setTopic(e.target.value)} allowClear />
          </div>

          {QuickAsk}

          <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6, padding: 12, marginBottom: 8 }}>
            {items.length === 0 && (
              <Text type="secondary">开始提问吧，或点击上方问题标签快捷提问。</Text>
            )}
            {items.map((m, i) => (
              <div key={i} style={{ marginBottom: 12, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', whiteSpace: 'pre-wrap', background: m.role === 'user' ? token.colorPrimaryBg : token.colorFillTertiary, padding: '8px 12px', borderRadius: 8 }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <Space.Compact style={{ width: '100%' }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入问题..." onPressEnter={() => !loading && startStream()} />
            <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={startStream}>发送</Button>
            <Button danger icon={<CloseCircleOutlined />} disabled={!loading} onClick={stop}>终止</Button>
            <Button icon={<RedoOutlined />} onClick={retryLast}>重发</Button>
          </Space.Compact>
        </div>
      </Drawer>
    </>
  );
};

export default AIAssistant;


