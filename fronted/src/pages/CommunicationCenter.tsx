import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  List,
  Avatar,
  Input,
  Button,
  Badge,
  Typography,
  Space,
  message,
  Empty,
  Tag,
  Modal,
  Tabs,
  Image,
  Collapse,
} from "antd";
import {
  SendOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import http, { resolveFileUrl } from "../store/api/http";
import { wsOn, wsOff, wsEmit } from "../store/websocket";

const { TextArea } = Input;
const { Text, Title } = Typography;

interface Message {
  id: string;
  content: string;
  type: string;
  status: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatar?: string;
    role: string;
  };
  receiver: {
    id: string;
    username: string;
    avatar?: string;
    role: string;
  };
}

interface Conversation {
  contact: {
    id: string;
    username: string;
    avatar?: string;
    role: string;
  };
  lastMessage: Message;
  unreadCount: number;
}

interface OnlineUser {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  isOnline: boolean;
}

const CommunicationCenter: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [pfVisible, setPfVisible] = useState(false);
  const [pfLoading, setPfLoading] = useState(false);
  const [pfOwner, setPfOwner] = useState<any>(null);
  const [pfPortfolios, setPfPortfolios] = useState<any[]>([]);
  const [pfProfile, setPfProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userAtBottomRef = useRef<boolean>(true);
  const justSelectedRef = useRef<boolean>(false);
  const justSentRef = useRef<boolean>(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  // const notifications = useSelector((state: RootState) => state.notification.notifications);

  // 获取对话列表
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await http.get("/communications/conversations");
      setConversations(data);
    } catch (error) {
      console.error("获取对话列表失败:", error);
    }
  }, []);

  // 增量更新会话：更新 lastMessage 与 unreadCount
  const upsertConversation = useCallback(
    (payload: any, isFromSelf: boolean) => {
      setConversations((prev) => {
        const contactId = isFromSelf ? payload.receiverId : payload.fromUserId;
        const idx = prev.findIndex((c) => c.contact.id === contactId);
        const patch = {
          lastMessage: {
            id: payload.messageId,
            content: payload.content,
            type: "MESSAGE",
            status: isFromSelf ? "READ" : "UNREAD",
            createdAt: payload.createdAt,
            sender: isFromSelf
              ? {
                  id: user?.id || "",
                  username: user?.username || "",
                  avatar: (user as any)?.avatar,
                  role: user?.role || "",
                }
              : undefined,
            receiver: undefined,
          },
        } as any;
        if (idx === -1) return prev;
        const unreadDelta = isFromSelf ? 0 : 1;
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          lastMessage: { ...next[idx].lastMessage, ...patch.lastMessage },
          unreadCount: (next[idx].unreadCount || 0) + unreadDelta,
        };
        return next;
      });
    },
    [user]
  );

  // 获取联系人（含在线状态初始值），并通过 ws 查询在线映射
  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await http.get("/communications/online-users");
      setOnlineUsers(data);
    } catch (error) {
      console.error("获取联系人失败:", error);
    }
  }, []);

  // 获取与特定用户的对话
  // 支持向上加载更多：传入 before（使用 epoch 毫秒，避免时区解析偏差）
  const fetchMessages = async (contactId: string, before?: string) => {
    setLoading(true);
    try {
      const url = before
        ? `/communications/conversations/${contactId}?limit=20&before=${encodeURIComponent(
            before
          )}`
        : `/communications/conversations/${contactId}?limit=20`;
      const { data } = await http.get(url);
      if (before) {
        // 向上插入，不打乱现有顺序
        setMessages((prev) => [...data, ...prev]);
      } else {
        setMessages(data);
      }
    } catch (error) {
      message.error("获取消息失败");
    } finally {
      setLoading(false);
    }
  };

  // 发送消息（通过全局 WebSocket），不做本地追加，等待服务端确认/推送
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    setSending(true);
    try {
      wsEmit("communication.send", {
        content: newMessage.trim(),
        receiverId: selectedContact.id,
        type: "MESSAGE",
      });
      justSentRef.current = true;
      setNewMessage("");
    } catch (error) {
      message.error("发送失败");
    } finally {
      setSending(false);
    }
  };

  // 选择联系人
  const selectContact = useCallback((contact: any) => {
    setSelectedContact(contact);
    justSelectedRef.current = true;
    // 乐观消除未读红点
    setConversations((prev) =>
      prev.map((c) =>
        c.contact.id === contact.id
          ? {
              ...c,
              unreadCount: 0,
              lastMessage: { ...c.lastMessage, status: "READ" as any },
            }
          : c
      )
    );
    // 通知后端标记为已读
    try {
      wsEmit("communication.read", { contactId: contact.id });
    } catch {}
    fetchMessages(contact.id);
    // 滚动到底部（使用容器 scroll 而非 scrollIntoView，避免页面整体跳动）
    setTimeout(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  // 获取角色标签颜色
  const getRoleColor = (role: string) => {
    const roleMap: { [key: string]: string } = {
      ADMIN: "red",
      ADVERTISER: "blue",
      CREATOR: "green",
      DESIGNER: "purple",
    };
    return roleMap[role] || "default";
  };

  // 获取角色文本
  const getRoleText = (role: string) => {
    const roleMap: { [key: string]: string } = {
      ADMIN: "管理员",
      ADVERTISER: "广告商",
      CREATOR: "创作者",
      DESIGNER: "设计师",
    };
    return roleMap[role] || role;
  };

  // 角色对应头像
  const roleToAvatar = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "/images/admin.png";
      case "ADVERTISER":
        return "/images/advertiser.png";
      case "CREATOR":
        return "/images/creator.png";
      case "DESIGNER":
        return "/images/designer.png";
      default:
        return undefined;
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "READ":
        return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
      case "UNREAD":
        return <ClockCircleOutlined style={{ color: "#faad14" }} />;
      default:
        return null;
    }
  };

  // 使用 ref 避免把 selectedContact/user 放入依赖导致循环
  const selectedContactRef = useRef<any>(null);
  const userRef = useRef<any>(null);
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // 消息变化时：在三种场景自动滚动到底部
  // 1) 用户当前接近底部（正常会话） 2) 刚选择联系人 3) 刚发送消息
  useEffect(() => {
    const shouldScroll =
      userAtBottomRef.current || justSelectedRef.current || justSentRef.current;
    if (!shouldScroll) return;
    const timer = setTimeout(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      justSelectedRef.current = false;
      justSentRef.current = false;
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  // 监听滚动，计算是否接近底部，避免用户上滑时被强制拉回
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80; // px
    userAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  const openUserPortfolios = useCallback(async (contact: any) => {
    setPfOwner(contact);
    setPfVisible(true);
    setPfLoading(true);
    try {
      const [pfRes, profileRes] = await Promise.all([
        http.get("/portfolios", { params: { userId: contact.id } }),
        http.get(`/users/profile/${contact.id}`),
      ]);
      setPfPortfolios(Array.isArray(pfRes.data?.data) ? pfRes.data.data : []);
      setPfProfile(profileRes.data || null);
    } catch (e) {
      message.error("获取作品集失败");
    } finally {
      setPfLoading(false);
    }
  }, []);

  // 首次加载：拉取会话/联系人并绑定 WS 监听，只在初始运行
  useEffect(() => {
    fetchConversations();
    fetchContacts();

    const onMessage = (payload: any) => {
      const sc = selectedContactRef.current;
      if (sc && payload.fromUserId === sc.id) {
        // 对方发来的消息，直接本地追加 + 标记已读（避免整列表刷新造成滚动抖动）
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.messageId)) return prev;
          const u = userRef.current;
          return [
            ...prev,
            {
              id: payload.messageId,
              content: payload.content,
              type: "MESSAGE",
              status: "UNREAD",
              createdAt: payload.createdAt,
              sender: {
                id: sc.id,
                username: sc.username,
                avatar: sc.avatar,
                role: sc.role,
              },
              receiver: {
                id: u?.id || "",
                username: u?.username || "",
                avatar: (u as any)?.avatar,
                role: u?.role || "",
              },
            } as any,
          ];
        });
        wsEmit("communication.read", { contactId: sc.id });
      }
      // 更新会话列表 last/unread
      upsertConversation(payload, false);
    };

    const onMessageSent = (payload: any) => {
      const sc = selectedContactRef.current;
      const u = userRef.current;
      if (sc && payload.receiverId === sc.id) {
        // 我方发送成功，本地追加一条（用服务端返回的 messageId 去重）
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.messageId)) return prev;
          return [
            ...prev,
            {
              id: payload.messageId,
              content: payload.content,
              type: "MESSAGE",
              status: "READ",
              createdAt: payload.createdAt,
              sender: {
                id: u?.id || "",
                username: u?.username || "",
                avatar: (u as any)?.avatar,
                role: u?.role || "",
              },
              receiver: {
                id: sc.id,
                username: sc.username,
                avatar: sc.avatar,
                role: sc.role,
              },
            } as any,
          ];
        });
      }
      // 我方发送成功，更新会话 lastMessage（不增加未读）
      upsertConversation(payload, true);
    };

    const onOnline = (data: any) => {
      const set = new Set<string>(data.userIds || []);
      setOnlineUsers((prev) =>
        prev.map((u) => ({ ...u, isOnline: set.has(u.id) }))
      );
    };

    wsOn("communication.message", onMessage);
    wsOn("communication.message.sent", onMessageSent);
    wsOn("online.changed", onOnline);
    // 首次通过 ws 主动查询一次在线列表
    wsEmit("online.query");

    return () => {
      wsOff("communication.message", onMessage);
      wsOff("communication.message.sent", onMessageSent);
      wsOff("online.changed", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当路由或数据列表变动时，根据 contactId 定位联系人，不触发重新拉取接口
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const contactId = params.get("contactId");
    if (!contactId) return;
    // 已选择同一联系人则不重复触发，避免循环刷新/重复请求
    if (selectedContact?.id === contactId) return;
    const found =
      onlineUsers.find((u) => u.id === contactId) ||
      conversations.find((c) => c.contact.id === contactId)?.contact;
    if (found) selectContact(found);
  }, [
    location.search,
    onlineUsers,
    conversations,
    selectContact,
    selectedContact,
  ]);

  // 本页不再通过通知重复刷新，避免重复拉取与重复渲染

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={2}>交流中心</Title>
        <Text type="secondary">与合作伙伴进行实时沟通交流</Text>
      </div>

      <Row gutter={16} style={{ height: "calc(100vh - 200px)" }}>
        {/* 左侧：对话列表 */}
        <Col xs={24} sm={8} md={6}>
          <Card title="对话列表" size="small" style={{ height: "100%" }}>
            <List
              dataSource={conversations}
              renderItem={(conversation) => (
                <List.Item
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      selectedContact?.id === conversation.contact.id
                        ? "#f0f8ff"
                        : "transparent",
                    borderRadius: 8,
                    margin: "4px 0",
                    padding: "8px 12px",
                  }}
                  onClick={() => selectContact(conversation.contact)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={conversation.unreadCount} size="small">
                        <Avatar
                          src={resolveFileUrl(conversation.contact.avatar)}
                          icon={<UserOutlined />}
                          size="small"
                        />
                      </Badge>
                    }
                    title={
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text strong style={{ fontSize: 14 }}>
                          {conversation.contact.username}
                        </Text>
                        <Tag color={getRoleColor(conversation.contact.role)}>
                          {getRoleText(conversation.contact.role)}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <Text
                          ellipsis
                          style={{
                            fontSize: 12,
                            color:
                              conversation.unreadCount > 0 ? "#1890ff" : "#666",
                            fontWeight:
                              conversation.unreadCount > 0 ? "bold" : "normal",
                          }}
                        >
                          {conversation.lastMessage.content}
                        </Text>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: 4,
                          }}
                        >
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {dayjs(conversation.lastMessage.createdAt).format(
                              "MM-DD HH:mm"
                            )}
                          </Text>
                          {getStatusIcon(conversation.lastMessage.status)}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: <Empty description="暂无对话" /> }}
            />
          </Card>
        </Col>

        {/* 中间：消息区域 */}
        <Col xs={24} sm={16} md={12}>
          <Card
            title={
              selectedContact ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar
                    src={resolveFileUrl(selectedContact.avatar)}
                    icon={<UserOutlined />}
                    size="small"
                  />
                  <Text strong>{selectedContact.username}</Text>
                  <Tag color={getRoleColor(selectedContact.role)}>
                    {getRoleText(selectedContact.role)}
                  </Tag>
                </div>
              ) : (
                "选择联系人开始对话"
              )
            }
            size="small"
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
            bodyStyle={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: 0,
            }}
          >
            {selectedContact ? (
              <>
                {/* 消息列表 */}
                <div
                  style={{
                    flex: 1,
                    padding: "16px",
                    overflowY: "auto",
                    maxHeight: "calc(100vh - 350px)",
                    backgroundColor: "#fafafa",
                  }}
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                >
                  {/* 上拉加载更多 */}

                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        if (!messages.length) return;
                        const first = messages[0];
                        const beforeMs = (
                          new Date(first.createdAt).getTime() - 1
                        ).toString();
                        fetchMessages(selectedContact.id, beforeMs);
                      }}
                      loading={loading}
                    >
                      加载更早消息
                    </Button>
                  </div>

                  {loading ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <Text type="secondary">加载中...</Text>
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        style={{
                          display: "flex",
                          justifyContent:
                            message.sender.id === user?.id
                              ? "flex-end"
                              : "flex-start",
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            flexDirection:
                              message.sender.id === user?.id
                                ? "row-reverse"
                                : "row",
                          }}
                        >
                          <Avatar
                            src={
                              message.sender.id === user?.id
                                ? resolveFileUrl(user?.avatar as any)
                                : resolveFileUrl(selectedContact?.avatar)
                            }
                            icon={<UserOutlined />}
                            size="small"
                          />
                          <div>
                            <div
                              style={{
                                padding: "8px 12px",
                                borderRadius: 12,
                                backgroundColor:
                                  message.sender.id === user?.id
                                    ? "#1890ff"
                                    : "#fff",
                                color:
                                  message.sender.id === user?.id
                                    ? "#fff"
                                    : "#000",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                wordBreak: "break-word",
                              }}
                            >
                              {message.content}
                            </div>
                            <div
                              style={{
                                textAlign:
                                  message.sender.id === user?.id
                                    ? "right"
                                    : "left",
                                marginTop: 2,
                              }}
                            >
                              <Text
                                type="secondary"
                                style={{ fontSize: 11, marginRight: 4 }}
                              >
                                {dayjs(message.createdAt).format("MM-DD HH:mm")}
                              </Text>
                              {message.sender.id === user?.id &&
                                getStatusIcon(message.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <Empty description="暂无消息" />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 消息输入框 */}
                <div
                  style={{ padding: "16px", borderTop: "1px solid #f0f0f0" }}
                >
                  <Space.Compact style={{ width: "100%" }}>
                    <TextArea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="输入消息...（Enter 发送，Shift+Enter 换行）"
                      autoSize={{ minRows: 2, maxRows: 6 }}
                      onKeyDown={(e) => {
                        const ne: any = e.nativeEvent as any;
                        if (e.key === "Enter" && !e.shiftKey) {
                          if (ne.isComposing) return; // 输入法组合中不发送
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={sending}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={sendMessage}
                      loading={sending}
                      disabled={!newMessage.trim()}
                    >
                      发送
                    </Button>
                  </Space.Compact>
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Empty description="请选择一个联系人开始对话" />
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：联系人 */}
        <Col xs={24} sm={24} md={6}>
          <Card title="联系人" size="small" style={{ height: "100%" }}>
            <List
              dataSource={onlineUsers}
              renderItem={(user) => (
                <List.Item
                  style={{ padding: "8px 0" }}
                  actions={[
                    <Button
                      type="link"
                      size="small"
                      onClick={() => selectContact(user)}
                    >
                      发消息
                    </Button>,
                    (user.role === "CREATOR" || user.role === "DESIGNER") && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => openUserPortfolios(user)}
                      >
                        作品集
                      </Button>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge
                        count={
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: user.isOnline
                                ? "#52c41a"
                                : "#d9d9d9",
                              display: "inline-block",
                            }}
                          />
                        }
                        offset={[-2, 2]}
                      >
                        <Avatar
                          src={resolveFileUrl(user.avatar)}
                          icon={<UserOutlined />}
                          size="small"
                        />
                      </Badge>
                    }
                    title={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{user.username}</Text>
                        <Tag color={getRoleColor(user.role)}>
                          {getRoleText(user.role)}
                        </Tag>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: <Empty description="暂无联系人" /> }}
            />
          </Card>
        </Col>
      </Row>
      {/* 作品集查看弹窗 */}
      <Modal
        title={pfOwner ? `作品集：${pfOwner.username}` : "作品集"}
        open={pfVisible}
        width={900}
        footer={null}
        onCancel={() => {
          setPfVisible(false);
          setPfPortfolios([]);
          setPfProfile(null);
          setPfOwner(null);
        }}
      >
        {pfLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}>加载中...</div>
        ) : (
          <div>
            {/* 基本资料：技能与标签 */}
            {pfProfile && (
              <Card size="small" style={{ marginBottom: 12 }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  {Array.isArray(pfProfile.skills) &&
                    pfProfile.skills.length > 0 && (
                      <div>
                        <Text strong>擅长：</Text>
                        <Space wrap style={{ marginLeft: 8 }}>
                          {pfProfile.skills.map((s: string) => (
                            <Tag key={`skill-${s}`} color="green">
                              {s}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                  {Array.isArray(pfProfile.tags) &&
                    pfProfile.tags.length > 0 && (
                      <div>
                        <Text strong>标签：</Text>
                        <Space wrap style={{ marginLeft: 8 }}>
                          {pfProfile.tags.map((t: string) => (
                            <Tag key={`tag-${t}`} color="blue">
                              {t}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                </Space>
              </Card>
            )}

            {pfPortfolios.length === 0 ? (
              <Empty description="暂无作品" />
            ) : (
              <Tabs
                items={pfPortfolios.map((p: any) => ({
                  key: p.id,
                  label: (
                    <span>
                      {p.title}
                      <Tag
                        style={{ marginLeft: 8 }}
                        color={
                          p.status === "ACTIVE"
                            ? "green"
                            : p.status === "INACTIVE"
                            ? "orange"
                            : "default"
                        }
                      >
                        {p.status === "ACTIVE"
                          ? "已审核"
                          : p.status === "INACTIVE"
                          ? "待审核"
                          : "已下架"}
                      </Tag>
                    </span>
                  ),
                  children: (
                    <>
                      {/* 缩略图与描述部分（左侧缩略图，右侧描述） */}
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 120,
                            height: 90,
                            borderRadius: 6,
                            overflow: "hidden",
                            background: "#f5f5f5",
                            flex: "0 0 auto",
                          }}
                        >
                          {(() => {
                            const thumb = p.thumbnail;
                            const first = p.materials?.[0]?.url;
                            const src = thumb || first;
                            return src ? (
                              <Image
                                src={resolveFileUrl(src)}
                                alt={p.title}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                preview={false}
                              />
                            ) : null;
                          })()}
                        </div>
                        {p.description && (
                          <div style={{ color: "#666" }}>{p.description}</div>
                        )}
                      </div>

                      {/* 使用折叠面板显示材料 */}
                      <Collapse defaultActiveKey={["1"]}>
                        <Collapse.Panel header="材料展示" key="1">
                          {/* 如果没有材料则显示 "暂无材料" */}
                          {p.materials.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#999" }}>
                              暂无材料
                            </div>
                          ) : (
                            p.materials.map((m: any) => (
                              <Card
                                key={m.id}
                                hoverable
                                style={{
                                  width: 150, // 保持材料展示的大小
                                  marginBottom: 12, // 添加底部间距
                                }}
                                cover={
                                  m.url &&
                                  /\.(png|jpg|jpeg|gif|webp)$/i.test(m.url) ? (
                                    <Image
                                      src={resolveFileUrl(m.url)}
                                      alt={m.title || ""}
                                      style={{
                                        height: 100, // 保持图片的大小
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        height: 100,
                                        background: "#f5f5f5",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#999",
                                      }}
                                    >
                                      无预览
                                    </div>
                                  )
                                }
                                actions={[
                                  <span
                                    key={`preview-${m.id}`}
                                    onClick={async () => {
                                      try {
                                        const resp = await http.get(
                                          `/materials/${m.id}/preview`,
                                          { responseType: "blob" }
                                        );
                                        const blob = new Blob([resp.data]);
                                        const filename =
                                          m.title || `material-${m.id}`;
                                        const nav: any = window.navigator;
                                        if (
                                          nav &&
                                          typeof nav.msSaveOrOpenBlob ===
                                            "function"
                                        ) {
                                          nav.msSaveOrOpenBlob(blob, filename);
                                          return;
                                        }
                                        const url =
                                          window.URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = filename;
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                        window.URL.revokeObjectURL(url);
                                      } catch {
                                        message.error("下载失败");
                                      }
                                    }}
                                  >
                                    下载/预览
                                  </span>,
                                ]}
                              >
                                <Card.Meta
                                  title={m.title || "未命名文件"}
                                  description={dayjs(m.createdAt).format(
                                    "YYYY-MM-DD HH:mm"
                                  )}
                                />
                              </Card>
                            ))
                          )}
                        </Collapse.Panel>
                      </Collapse>
                    </>
                  ),
                }))}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CommunicationCenter;
