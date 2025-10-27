import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  List,
  Avatar,
  Drawer,
  Card,
  Typography,
  Upload,
  Tabs,
  Image,
  Divider,
  Pagination,
} from "antd";
import { Collapse } from "antd";
import {
  EditOutlined,
  EyeOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  UserAddOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import http, { resolveFileUrl } from "../store/api/http";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store";
import { wsEmit } from "../store/websocket";
import { clearApplicationNotificationsByOrderId } from "../store/slices/notificationSlice";

const OrderManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [form] = Form.useForm();

  const [orders, setOrders] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    // type?: string;
    keyword?: string;
  }>({});
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [appModalOrder, setAppModalOrder] = useState<any | null>(null);
  const [appLoading, setAppLoading] = useState(false);
  const [viewVisible, setViewVisible] = useState(false);
  const [viewOrder, setViewOrder] = useState<any | null>(null);
  const [deliverFiles, setDeliverFiles] = useState<any[]>([]);
  const [submittingDeliver, setSubmittingDeliver] = useState(false);
  const [attachFiles, setAttachFiles] = useState<any[]>([]);
  const [submittingAttach, setSubmittingAttach] = useState(false);
  const [attachmentsList, setAttachmentsList] = useState<any[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [deliverablesList, setDeliverablesList] = useState<any[]>([]);
  const [deliverablesLoading, setDeliverablesLoading] = useState(false);
  const [attActive, setAttActive] = useState<string[]>([]);
  const [devActive, setDevActive] = useState<string[]>([]);
  const [portfoliosVisible, setPortfoliosVisible] = useState(false);
  const [portfoliosLoading, setPortfoliosLoading] = useState(false);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [portfoliosOwner, setPortfoliosOwner] = useState<{
    id: string;
    username?: string;
  } | null>(null);

  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();

  const labelMap: Record<string, string> = {
    VIDEO: "视频",
    DESIGN: "设计",
    H5: "H5",
    ANIMATION: "动画",
    AUDIO: "音频",
    OTHER: "其他",
  };
  const codeFromLabel = (label: string): string | undefined => {
    const e = Object.entries(labelMap).find(([, cn]) => cn === label);
    return e ? e[0] : undefined;
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/orders", {
        params: {
          status: filters.status,
          // type: filters.type,
          keyword: filters.keyword,
          // 广告商查看全部
          mine:
            user?.role === "ADVERTISER"
              ? false
              : user?.role === "CREATOR" || user?.role === "DESIGNER"
              ? true
              : undefined,
          page,
          pageSize,
        },
      });
      const list = data.data || [];
      setOrders(list);
      setTotal(Number(data.total || 0));
      setTotalPages(Number(data.totalPages || 1));
    } catch (e: any) {
      message.error(e?.response?.data?.message || "获取订单失败");
    } finally {
      setLoading(false);
    }
  }, [filters, user, page, pageSize]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 服务端分页，直接渲染当前页
  const pagedOrders = orders;

  // 根据 URL 参数自动打开“申请/委派”抽屉
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get("openApplicationsFor");
    if (!orderId) return;
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      // 防止重复打开：仅当当前未打开或订单变化时打开
      if (!appModalVisible || appModalOrder?.id !== order.id) {
        // 强制刷新一次数据，避免页面上申请数仍为 0
        fetchOrders();
        openApplications(order);
      }
    }
    // 处理完后移除参数，防止反复触发
    const cleaned = new URLSearchParams(location.search);
    cleaned.delete("openApplicationsFor");
    if (cleaned.toString() !== location.search.replace(/^\?/, "")) {
      navigate(
        {
          pathname: "/orders",
          search: cleaned.toString() ? `?${cleaned.toString()}` : "",
        },
        { replace: true }
      );
    }
  }, [
    orders,
    appModalVisible,
    appModalOrder,
    location.search,
    fetchOrders,
    navigate,
  ]);

  // 根据 URL 参数自动打开订单详情 Drawer 及交付物列表
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openOrderId = params.get("openOrder");
    const showDeliverables = params.get("showDeliverables");
    if (!openOrderId) return;
    const order = orders.find((o) => o.id === openOrderId);
    if (!order) return;
    if (!viewVisible || viewOrder?.id !== order.id) {
      // 确保数据刷新
      fetchOrders();
      handleView(order);
    }
    if (showDeliverables === "1") {
      // 打开交付物列表
      (async () => {
        try {
          const { data } = await http.get(`/orders/${order.id}/deliverables`);
          Modal.info({
            title: "交付物列表",
            width: 700,
            content: (
              <List
                dataSource={data || []}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar src={resolveFileUrl(item.user?.avatar)} />
                      }
                      title={
                        <a
                          role="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              const resp = await http.get(
                                `/materials/${item.id}/preview`,
                                { responseType: "blob" }
                              );
                              const blob = new Blob([resp.data]);
                              const filename =
                                item.title || `material-${item.id}`;
                              // IE/Edge Legacy 兼容：使用 msSaveOrOpenBlob
                              const nav: any = window.navigator;
                              if (
                                nav &&
                                typeof nav.msSaveOrOpenBlob === "function"
                              ) {
                                nav.msSaveOrOpenBlob(blob, filename);
                                return;
                              }
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = filename;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (err) {
                              message.error("下载失败");
                            }
                          }}
                          href="#!"
                        >
                          {item.title || item.url}
                        </a>
                      }
                      description={item.description || item.type}
                    />
                    <div>
                      {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
                    </div>
                  </List.Item>
                )}
                locale={{ emptyText: "暂无交付物" }}
              />
            ),
          });
        } catch {}
      })();
    }
    // 清理参数，防止重复弹出
    const cleaned = new URLSearchParams(location.search);
    cleaned.delete("openOrder");
    cleaned.delete("showDeliverables");
    if (cleaned.toString() !== location.search.replace(/^\?/, "")) {
      navigate(
        {
          pathname: "/orders",
          search: cleaned.toString() ? `?${cleaned.toString()}` : "",
        },
        { replace: true }
      );
    }
  }, [orders, viewVisible, viewOrder, location.search, fetchOrders, navigate]);
  const getPriorityTag = (priority: string) => {
    const priorityMap: { [key: string]: { color: string; text: string } } = {
      LOW: { color: "green", text: "低" },
      MEDIUM: { color: "blue", text: "中" },
      HIGH: { color: "orange", text: "高" },
      URGENT: { color: "red", text: "紧急" },
    };
    const config = priorityMap[priority] || {
      color: "default",
      text: priority,
    };
    return <Tag color={config.color}>紧急程度：{config.text}</Tag>;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const columns = [
    {
      title: "订单ID",
      dataIndex: "id",
      key: "id",
    },
    // 广告商查看申请数
    {
      title: "申请数",
      key: "applications",
      render: (_: any, record: any) => record._count.applications ?? "-",
    },
    {
      title: "订单标题",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "客户",
      key: "customer",
      render: (_: any, record: any) => record.customer?.username || "-",
    },
    {
      title: "设计师",
      key: "designer",
      render: (_: any, record: any) => record.designer?.username || "-",
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (type: string) => {
        const typeMap: { [key: string]: { text: string; color: string } } = {
          VIDEO: { text: "视频", color: "blue" },
          DESIGN: { text: "设计", color: "green" },
          H5: { text: "H5", color: "orange" },
          ANIMATION: { text: "动画", color: "purple" },
          AUDIO: { text: "音频", color: "cyan" },
          OTHER: { text: "其他", color: "default" },
        };
        const typeInfo = typeMap[type] || { text: type, color: "default" };
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      },
    },
    {
      title: "金额",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => `¥${amount}`,
    },
    {
      title: "紧急程度",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => {
        const priorityMap: { [key: string]: { text: string; color: string } } =
          {
            HIGH: { text: "高", color: "red" },
            MEDIUM: { text: "中", color: "orange" },
            LOW: { text: "低", color: "green" },
          };
        const priorityInfo = priorityMap[priority] || {
          text: priority,
          color: "default",
        };
        return <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>;
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const statusMap: { [key: string]: { text: string; color: string } } = {
          PENDING: { text: "已发布", color: "orange" },
          IN_PROGRESS: { text: "进行中", color: "blue" },
          COMPLETED: { text: "已完成", color: "green" },
          CANCELLED: { text: "已取消", color: "red" },
        };
        const statusInfo = statusMap[status] || {
          text: status,
          color: "default",
        };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: "截止日期",
      dataIndex: "deadline",
      key: "deadline",
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          {user?.role === "ADVERTISER" && record.status === "PENDING" && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {/* 广告商：查看申请并委派 */}
          {user?.role === "ADVERTISER" && record.status === "PENDING" && (
            <Button type="link" onClick={() => openApplications(record)}>
              申请/委派
            </Button>
          )}
          {/* 取消：创作者/广告商在非已完成和非已取消时可取消；管理员不显示取消 */}
          {user?.role !== "ADMIN" &&
            record.status !== "CANCELLED" &&
            record.status !== "COMPLETED" && (
              <Button
                type="link"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleCancelOrder(record.id)}
              >
                取消
              </Button>
            )}
          {/* 删除：仅已取消可删除（管理员/广告商） */}
          {record.status === "CANCELLED" &&
            (user?.role === "ADMIN" || user?.role === "ADVERTISER") && (
              <Button
                type="link"
                danger
                onClick={() => handleDeleteOrder(record.id)}
              >
                删除
              </Button>
            )}
        </Space>
      ),
    },
  ];

  const handleEdit = (order: any) => {
    console.log("order", order);

    setEditingOrder(order);
    const inferTypes = (ord: any) => {
      const codes: string[] = [];
      if (ord?.type) codes.push(ord.type);
      const reqs = (ord as any).requirements;
      if (Array.isArray(reqs)) {
        reqs.forEach((r: string) => {
          const code = codeFromLabel(r);
          if (code && !codes.includes(code)) codes.push(code);
        });
      } else if (typeof reqs === "string") {
        try {
          const arr = JSON.parse(reqs);
          if (Array.isArray(arr)) {
            arr.forEach((r: any) => {
              const code = codeFromLabel(String(r));
              if (code && !codes.includes(code)) codes.push(code);
            });
          }
        } catch {}
      }
      return codes;
    };

    form.setFieldsValue({
      title: order.title,
      customer: order.customer?.username ?? "-",
      designer: order.designer?.username ?? "-",
      amount: order.amount,
      types: inferTypes(order),
      priority: order.priority,
      deadline: order.deadline ? dayjs(order.deadline) : null,
      requirementsInput: Array.isArray((order as any).tags)
        ? ((order as any).tags as any[]).join("；")
        : typeof (order as any).tags === "string"
        ? (order as any).tags
        : "",
    });
    setIsModalVisible(true);
  };

  const handleView = async (order: any) => {
    setViewOrder(order);
    setViewVisible(true);
    // 打开详情时预拉附件与交付物
    try {
      setAttachmentsLoading(true);
      const [attRes, devRes] = await Promise.all([
        http.get(`/orders/${order.id}/attachments`).catch(() => ({ data: [] })),
        order.status !== "PENDING"
          ? http
              .get(`/orders/${order.id}/deliverables`)
              .catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setAttachmentsList(attRes.data || []);
      setDeliverablesList(devRes.data || []);
    } finally {
      setAttachmentsLoading(false);
      setDeliverablesLoading(false);
    }
    // 默认折叠关闭
    setAttActive([]);
    setDevActive([]);
  };

  const handleCancelOrder = async (id: string) => {
    try {
      if (user?.role === "ADVERTISER") {
        await http.post(`/orders/${id}/cancel`);
      } else if (user?.role === "CREATOR" || user?.role === "DESIGNER") {
        await http.post(`/orders/${id}/cancel-by-designer`);
      } else {
        return;
      }
      message.success("订单已取消");
      fetchOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "取消失败");
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await http.delete(`/orders/${id}`);
      message.success("订单已删除");
      fetchOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "删除失败");
    }
  };

  const handleModalOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editingOrder) {
          const reqsIn = (values.requirementsInput || "")
            .split(/；|;/)
            .map((t: string) => t.trim())
            .filter((t: string) => t);
          const typeCodes: string[] = Array.isArray(values.types)
            ? values.types
            : values.type
            ? [values.type]
            : [];
          const primaryType = typeCodes[0] || "OTHER";
          const typeChinese: string[] = typeCodes.map(
            (c: string) => labelMap[c] || c
          );
          await http.patch(`/orders/${editingOrder.id}`, {
            title: values.title,
            amount: values.amount,
            type: primaryType,
            priority: values.priority,
            deadline: values.deadline
              ? (values.deadline as any).toISOString()
              : undefined,
            requirements: JSON.stringify(typeChinese),
            tags: JSON.stringify(reqsIn),
          });
          message.success("订单更新成功");
        } else {
          const reqsIn = (values.requirementsInput || "")
            .split(/；|;/)
            .map((t: string) => t.trim())
            .filter((t: string) => t);
          const typeCodes: string[] = Array.isArray(values.types)
            ? values.types
            : values.type
            ? [values.type]
            : [];
          const primaryType = typeCodes[0] || "OTHER";
          const typeChinese: string[] = typeCodes.map(
            (c: string) => labelMap[c] || c
          );
          await http.post("/orders", {
            title: values.title,
            amount: values.amount,
            type: primaryType,
            priority: values.priority,
            deadline: values.deadline
              ? (values.deadline as any).toISOString()
              : undefined,
            requirements: JSON.stringify(typeChinese),
            tags: JSON.stringify(reqsIn),
          });
          message.success("订单添加成功");
        }
        setIsModalVisible(false);
        form.resetFields();
        fetchOrders();
      } catch (e: any) {
        message.error(e?.response?.data?.message || "操作失败");
      }
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 打开申请列表并进行委派（拉最新详情，避免首次为空）
  const openApplications = async (order: any) => {
    setAppModalVisible(true);
    setAppLoading(true);
    try {
      const { data } = await http.get(`/orders/${order.id}`);
      setAppModalOrder(data);
    } catch (e) {
      setAppModalOrder(order);
    } finally {
      setAppLoading(false);
    }
  };

  // 查看申请人的作品集（仅展示已审核的作品，后端会按角色过滤）
  const openApplicantPortfolios = async (userId: string, username?: string) => {
    setPortfoliosVisible(true);
    setPortfoliosLoading(true);
    setPortfolios([]);
    setPortfoliosOwner({ id: userId, username });
    try {
      const { data } = await http.get("/portfolios", { params: { userId } });
      setPortfolios(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      message.error("获取作品集失败");
    } finally {
      setPortfoliosLoading(false);
    }
  };

  const handleAccept = async (orderId: string, applicationId: string) => {
    Modal.confirm({
      title: "确认委派给该创作者？",
      icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
      content:
        "委派后订单将进入进行中，广告商将不可再编辑此订单（涉及资金调整请走退款/补差流程）。",
      okText: "确认委派",
      cancelText: "取消",
      onOk: async () => {
        try {
          await http.post(`/orders/${orderId}/accept/${applicationId}`);
          message.success("已委派给该创作者");
          try {
            wsEmit("order.application.read", { applicationId });
          } catch {}
          try {
            dispatch(clearApplicationNotificationsByOrderId(orderId));
          } catch {}
          setAppModalVisible(false);
          setAppModalOrder(null);
          fetchOrders();
        } catch (e: any) {
          message.error(e?.response?.data?.message || "委派失败");
        }
      },
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">订单管理</h1>
        <p style={{ margin: 0, color: "#666" }}>
          管理广告订单的审核、录入和完成状态
        </p>
      </div>

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <div>
            <div style={{ marginBottom: 4, color: "#999" }}>关键词</div>
            <Input
              style={{ width: 240 }}
              value={filters.keyword}
              onChange={(e) =>
                setFilters({ ...filters, keyword: e.target.value })
              }
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, color: "#999" }}>状态</div>
            <Select
              style={{ width: 160 }}
              allowClear
              value={filters.status}
              onChange={(v) => setFilters({ ...filters, status: v })}
            >
              <Select.Option value="PENDING">已发布</Select.Option>
              <Select.Option value="IN_PROGRESS">进行中</Select.Option>
              <Select.Option value="COMPLETED">已完成</Select.Option>
              <Select.Option value="CANCELLED">已取消</Select.Option>
            </Select>
          </div>
          {/* <div>
            <div style={{ marginBottom: 4, color: "#999" }}>类型</div>
            <Select
              style={{ width: 160 }}
              allowClear
              value={filters.type}
              onChange={(v) => setFilters({ ...filters, type: v })}
            >
              <Select.Option value="VIDEO">视频</Select.Option>
              <Select.Option value="DESIGN">设计</Select.Option>
              <Select.Option value="H5">H5</Select.Option>
              <Select.Option value="ANIMATION">动画</Select.Option>
              <Select.Option value="AUDIO">音频</Select.Option>
              <Select.Option value="OTHER">其他</Select.Option>
            </Select>
          </div> */}
          <div style={{ alignSelf: "flex-end", marginTop: 24, }}>
            <Button type="primary" onClick={fetchOrders}>
              查询
            </Button>
          </div>
        </Space>
        {/* 已移除“添加订单”入口，创建请前往广告投放页 */}
      </div>

      <div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24 }}>加载中...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "#999" }}>
            暂无订单
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 16,
            }}
          >
            {pagedOrders.map((o: any) => {
              const actions: React.ReactNode[] = [
                <span
                  key={`view-${o.id}`}
                  onClick={() => handleView(o)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <EyeOutlined /> 查看
                </span>,
              ];
              if (user?.role === "ADVERTISER" && o.status === "PENDING") {
                actions.push(
                  <span
                    key={`edit-${o.id}`}
                    onClick={() => handleEdit(o)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <EditOutlined /> 编辑
                  </span>
                );
                actions.push(
                  <span
                    key={`assign-${o.id}`}
                    onClick={() => openApplications(o)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <UserAddOutlined /> 申请/委派
                  </span>
                );
              }
              if (user?.role === "ADVERTISER" && o.status === "CANCELLED") {
                actions.push(
                  <span
                    key={`repost-${o.id}`}
                    onClick={() => {
                      navigate("/advertiser/ads", {
                        state: {
                          prefill: {
                            title: o.title,
                            description: o.description,
                            type: o.type,
                            amount: o.amount,
                            priority: o.priority,
                            deadline: o.deadline,
                            requirements: Array.isArray((o as any).requirements)
                              ? (o as any).requirements
                              : typeof (o as any).requirements === "string"
                              ? (o as any).requirements
                              : [],
                            tags: Array.isArray((o as any).tags)
                              ? (o as any).tags
                              : typeof (o as any).tags === "string"
                              ? (o as any).tags
                              : [],
                          },
                        },
                      });
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <RedoOutlined /> 再次发布
                  </span>
                );
              }
              if (
                user?.role !== "ADMIN" &&
                o.status !== "CANCELLED" &&
                o.status !== "COMPLETED"
              ) {
                actions.push(
                  <span
                    key={`cancel-${o.id}`}
                    onClick={() => handleCancelOrder(o.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#ff4d4f",
                    }}
                  >
                    <CloseOutlined /> 取消
                  </span>
                );
              }
              if (
                (o.status === "CANCELLED" || o.status === "COMPLETED") &&
                (user?.role === "ADVERTISER" ||
                  user?.role === "CREATOR" ||
                  user?.role === "DESIGNER")
              ) {
                actions.push(
                  <span
                    key={`delete-${o.id}`}
                    onClick={() => handleDeleteOrder(o.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#ff4d4f",
                    }}
                  >
                    <DeleteOutlined /> 删除
                  </span>
                );
              }
              return (
                <Card key={o.id} hoverable actions={actions}>
                  {/* Title */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {o.title}
                    </div>
                    <Tag
                      color={
                        o.status === "PENDING"
                          ? "orange"
                          : o.status === "IN_PROGRESS"
                          ? "blue"
                          : o.status === "COMPLETED"
                          ? "green"
                          : "red"
                      }
                    >
                      {o.status === "PENDING"
                        ? "已发布"
                        : o.status === "IN_PROGRESS"
                        ? "进行中"
                        : o.status === "COMPLETED"
                        ? "已完成"
                        : "已取消"}
                    </Tag>
                  </div>
                  <Divider style={{ margin: "12px 0" }} />
                  {/* Content */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      rowGap: 8,
                      columnGap: 16,
                      color: "#666",
                    }}
                  >
                    <div>客户：{o.customer?.username || "-"}</div>
                    <div>设计师：{o.designer?.username || "-"}</div>
                    {/* <div>类型：{o.type}</div> */}
                    <div>金额：¥{Number(o.amount || 0).toFixed(2)}</div>
                    <div>
                      截止：
                      {o.deadline
                        ? dayjs(o.deadline).format("MM-DD HH:mm")
                        : "-"}
                    </div>
                    <div>申请数：{o._count?.applications ?? 0}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 分页器 */}
      {total > 0 && (
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}
        >
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            pageSizeOptions={["6", "12"]}
            showTotal={(t, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${t} 条`
            }
            onChange={(p, ps) => {
              if (ps !== pageSize) {
                setPageSize(ps);
              }
              setPage(p);
            }}
            onShowSizeChange={(_, ps) => {
              setPageSize(ps);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* 查看详情 - 卡片化布局 */}
      <Drawer
        title={viewOrder ? `订单详情：${viewOrder.title}` : "订单详情"}
        open={viewVisible}
        onClose={() => {
          setViewVisible(false);
          setAttActive([]);
          setDevActive([]);
          setAttachmentsList([]);
          setDeliverablesList([]);
        }}
        width={720}
      >
        {viewOrder && (
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            <Card>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {viewOrder.title}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {getPriorityTag(viewOrder.priority)}
                    <Tag color="blue">
                      金额 ¥{Number(viewOrder.amount || 0).toFixed(2)}
                    </Tag>
                    {false ? <Tag color="geekblue">预算 ¥0.00</Tag> : null}
                    <Tag
                      color={
                        viewOrder.status === "PENDING"
                          ? "orange"
                          : viewOrder.status === "IN_PROGRESS"
                          ? "blue"
                          : viewOrder.status === "COMPLETED"
                          ? "green"
                          : "red"
                      }
                    >
                      {viewOrder.status === "PENDING"
                        ? "已发布"
                        : viewOrder.status === "IN_PROGRESS"
                        ? "进行中"
                        : viewOrder.status === "COMPLETED"
                        ? "已完成"
                        : "已取消"}
                    </Tag>
                    {viewOrder.deadline && (
                      <Tag>
                        截止时间：
                        {dayjs(viewOrder.deadline).format("MM-DD HH:mm")}
                      </Tag>
                    )}
                    <Tag>申请数 {viewOrder._count?.applications ?? 0}</Tag>
                  </div>
                </div>
                {user?.role === "ADVERTISER" &&
                  viewOrder.status === "PENDING" && (
                    <Button
                      type="primary"
                      onClick={() => openApplications(viewOrder)}
                    >
                      申请/委派
                    </Button>
                  )}
                {/* {user?.role !== "ADVERTISER" &&
                  viewOrder.status === "IN_PROGRESS" &&
                  viewOrder.designer?.id === user?.id && (
                    <Space>
                      <Upload
                        multiple
                        fileList={deliverFiles}
                        beforeUpload={() => false}
                        onChange={({ fileList }) => setDeliverFiles(fileList)}
                      >
                        <Button>添加交付物</Button>
                      </Upload>
                      <Button
                        type="primary"
                        loading={submittingDeliver}
                        disabled={!deliverFiles.length}
                        onClick={async () => {
                          if (!viewOrder) return;
                          setSubmittingDeliver(true);
                          try {
                            const form = new FormData();
                            deliverFiles.forEach((f: any) => {
                              const raw = f.originFileObj || f;
                              if (raw)
                                form.append("files", raw as Blob, f.name);
                            });
                            await http.post(
                              `/materials/upload?orderId=${viewOrder.id}`,
                              form,
                              {
                                headers: {
                                  "Content-Type": "multipart/form-data",
                                },
                              }
                            );
                            message.success("交付物已上传");
                            setDeliverFiles([]);
                          } catch (e: any) {
                            message.error(
                              e?.response?.data?.message || "上传失败"
                            );
                          } finally {
                            setSubmittingDeliver(false);
                          }
                        }}
                      >
                        提交交付物
                      </Button>
                    </Space>
                  )} */}
              </div>
            </Card>

            <Card title="参与者">
              <Space size={24}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar src={resolveFileUrl(viewOrder.customer?.avatar)} />
                  <div>
                    <div style={{ fontWeight: 600 }}>广告商</div>
                    <div>{viewOrder.customer?.username || "-"}</div>
                  </div>
                </div>
                {viewOrder.designer && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Avatar src={resolveFileUrl(viewOrder.designer?.avatar)} />
                    <div>
                      <div style={{ fontWeight: 600 }}>设计师</div>
                      <div>{viewOrder.designer?.username || "-"}</div>
                    </div>
                  </div>
                )}
              </Space>
            </Card>

            {viewOrder.description && (
              <Card title="说明">
                {viewOrder.description && (
                  <div style={{ marginBottom: 8 }}>
                    <Typography.Text type="secondary">描述：</Typography.Text>
                    <div>{viewOrder.description}</div>
                  </div>
                )}
              </Card>
            )}

            {(() => {
              const reqs = Array.isArray((viewOrder as any).requirements)
                ? (viewOrder as any).requirements
                : typeof (viewOrder as any).requirements === "string"
                ? (viewOrder as any).requirements
                    .split("，|,|；|;")
                    .map((t: string) => t.trim())
                    .filter(Boolean)
                : [];
              if (!reqs.length) return null;
              return (
                <Card title="需求标签">
                  <Space wrap>
                    {reqs.map((t: string) => (
                      <Tag key={t} color="blue">
                        {t}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              );
            })()}

            {/* 附件（广告商在发布前/后均可上传；双方可见） */}
            <Card
              title="附件"
              extra={
                user?.role === "ADVERTISER" && (
                  <Space>
                    <Upload
                      multiple
                      fileList={attachFiles}
                      beforeUpload={() => false}
                      onChange={({ fileList }) => setAttachFiles(fileList)}
                    >
                      <Button size="small">添加附件</Button>
                    </Upload>
                    <Button
                      size="small"
                      type="primary"
                      loading={submittingAttach}
                      disabled={!attachFiles.length}
                      onClick={async () => {
                        if (!viewOrder) return;
                        setSubmittingAttach(true);
                        try {
                          const formData = new FormData();
                          (attachFiles || []).forEach((f: any) => {
                            if (f.originFileObj)
                              formData.append("files", f.originFileObj);
                          });
                          await http.post(`/materials/upload`, formData, {
                            params: {
                              orderId: viewOrder.id,
                              kind: "ATTACHMENT",
                            },
                            headers: { "Content-Type": "multipart/form-data" },
                          });
                          message.success("附件已上传");
                          setAttachFiles([]);
                          // 刷新列表
                          try {
                            setAttachmentsLoading(true);
                            const { data } = await http.get(
                              `/orders/${viewOrder.id}/attachments`
                            );
                            setAttachmentsList(data || []);
                          } finally {
                            setAttachmentsLoading(false);
                          }
                        } catch (e: any) {
                          message.error(
                            e?.response?.data?.message || "上传失败"
                          );
                        } finally {
                          setSubmittingAttach(false);
                        }
                      }}
                    >
                      提交
                    </Button>
                  </Space>
                )
              }
            >
              <Collapse
                bordered={false}
                activeKey={attActive}
                onChange={(keys) =>
                  setAttActive(
                    Array.isArray(keys) ? (keys as string[]) : [keys as string]
                  )
                }
              >
                <Collapse.Panel
                  header={
                    <span>
                      附件列表{" "}
                      {attachmentsList?.length
                        ? `(${attachmentsList.length})`
                        : ""}
                    </span>
                  }
                  key="att"
                >
                  {attachmentsLoading ? (
                    <div>加载中...</div>
                  ) : (
                    <List
                      dataSource={attachmentsList}
                      renderItem={(item: any) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={
                              <Avatar src={resolveFileUrl(item.user?.avatar)} />
                            }
                            title={
                              <a
                                role="button"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  try {
                                    const resp = await http.get(
                                      `/materials/${item.id}/preview`,
                                      { responseType: "blob" }
                                    );
                                    const blob = new Blob([resp.data]);
                                    const filename =
                                      item.title || `attachment-${item.id}`;
                                    const nav: any = window.navigator;
                                    if (
                                      nav &&
                                      typeof nav.msSaveOrOpenBlob === "function"
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
                                href="#!"
                              >
                                {item.title || item.url}
                              </a>
                            }
                            description={dayjs(item.createdAt).format(
                              "YYYY-MM-DD HH:mm"
                            )}
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: "暂无附件" }}
                    />
                  )}
                </Collapse.Panel>
              </Collapse>
            </Card>

            {/* 交付物列表与确认收货（仅委派后显示） */}
            {viewOrder.status !== "PENDING" && (
              <Card
                title="交付物"
                extra={
                  user?.role !== "ADVERTISER" &&
                  viewOrder.designer?.id === user?.id && (
                    <Space>
                      <Upload
                        multiple
                        fileList={deliverFiles}
                        beforeUpload={() => false}
                        onChange={({ fileList }) => setDeliverFiles(fileList)}
                      >
                        <Button size="small">添加交付物</Button>
                      </Upload>
                      <Button
                        size="small"
                        type="primary"
                        loading={submittingDeliver}
                        disabled={!deliverFiles.length}
                        onClick={async () => {
                          if (!viewOrder) return;
                          setSubmittingDeliver(true);
                          try {
                            const form = new FormData();
                            deliverFiles.forEach((f: any) => {
                              const raw = f.originFileObj || f;
                              if (raw)
                                form.append("files", raw as Blob, f.name);
                            });
                            await http.post(
                              `/materials/upload?orderId=${viewOrder.id}`,
                              form,
                              {
                                headers: {
                                  "Content-Type": "multipart/form-data",
                                },
                              }
                            );
                            message.success("交付物已上传");
                            setDeliverFiles([]);
                            // 刷新列表
                            try {
                              setDeliverablesLoading(true);
                              const { data } = await http.get(
                                `/orders/${viewOrder.id}/deliverables`
                              );
                              setDeliverablesList(data || []);
                            } finally {
                              setDeliverablesLoading(false);
                            }
                          } catch (e: any) {
                            message.error(
                              e?.response?.data?.message || "上传失败"
                            );
                          } finally {
                            setSubmittingDeliver(false);
                          }
                        }}
                      >
                        提交
                      </Button>
                    </Space>
                  )
                }
              >
                <Collapse
                  bordered={false}
                  activeKey={devActive}
                  onChange={(keys) =>
                    setDevActive(
                      Array.isArray(keys)
                        ? (keys as string[])
                        : [keys as string]
                    )
                  }
                >
                  <Collapse.Panel
                    header={
                      <span>
                        交付物列表{" "}
                        {deliverablesList?.length
                          ? `(${deliverablesList.length})`
                          : ""}
                      </span>
                    }
                    key="dev"
                  >
                    {deliverablesLoading ? (
                      <div>加载中...</div>
                    ) : (
                      <List
                        dataSource={deliverablesList}
                        renderItem={(item: any) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={
                                <Avatar
                                  src={resolveFileUrl(item.user?.avatar)}
                                />
                              }
                              title={
                                <a
                                  role="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                      const resp = await http.get(
                                        `/materials/${item.id}/preview`,
                                        { responseType: "blob" }
                                      );
                                      const blob = new Blob([resp.data]);
                                      const filename =
                                        item.title || `material-${item.id}`;
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
                                  href="#!"
                                >
                                  {item.title || item.url}
                                </a>
                              }
                              description={dayjs(item.createdAt).format(
                                "YYYY-MM-DD HH:mm"
                              )}
                            />
                          </List.Item>
                        )}
                        locale={{ emptyText: "暂无交付物" }}
                      />
                    )}
                  </Collapse.Panel>
                </Collapse>

                {user?.role === "ADVERTISER" &&
                  viewOrder.status === "IN_PROGRESS" && (
                    <Button
                      type="primary"
                      style={{ marginTop: 12 }}
                      onClick={async () => {
                        try {
                          await http.post(
                            `/orders/${viewOrder.id}/confirm-receipt`
                          );
                          message.success("已确认收货并放款");
                          setViewVisible(false);
                          fetchOrders();
                        } catch (e: any) {
                          message.error(
                            e?.response?.data?.message || "操作失败"
                          );
                        }
                      }}
                    >
                      确认收货并放款
                    </Button>
                  )}
              </Card>
            )}
          </Space>
        )}
      </Drawer>

      <Modal
        title={editingOrder ? "编辑订单" : "添加订单"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
      >
        <Form form={form} layout="vertical" initialValues={{}}>
          <Form.Item
            name="title"
            label="订单标题"
            rules={[{ required: true, message: "请输入订单标题" }]}
          >
            <Input placeholder="请输入订单标题" />
          </Form.Item>

          {/* 客户/设计师字段移除，避免前端直接修改归属 */}

          <Form.Item
            name="types"
            label="订单类型（可多选）"
            rules={[{ required: true, message: "请选择至少一个订单类型" }]}
          >
            <Select mode="multiple" placeholder="请选择订单类型（可多选）">
              <Select.Option value="VIDEO">视频</Select.Option>
              <Select.Option value="DESIGN">设计</Select.Option>
              <Select.Option value="H5">H5</Select.Option>
              <Select.Option value="ANIMATION">动画</Select.Option>
              <Select.Option value="AUDIO">音频</Select.Option>
              <Select.Option value="OTHER">其他</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="订单金额"
            rules={[{ required: true, message: "请输入订单金额" }]}
          >
            <InputNumber
              placeholder="请输入订单金额"
              style={{ width: "100%" }}
              min={0}
              formatter={(value) =>
                `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
            />
          </Form.Item>

          <Form.Item
            name="priority"
            label="紧急程度"
            rules={[{ required: true, message: "请选择紧急程度" }]}
          >
            <Select placeholder="请选择紧急程度">
              <Select.Option value="HIGH">高</Select.Option>
              <Select.Option value="MEDIUM">中</Select.Option>
              <Select.Option value="LOW">低</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="deadline"
            label="截止日期"
            rules={[{ required: true, message: "请选择截止日期" }]}
          >
            <DatePicker style={{ width: "100%" }} showTime />
          </Form.Item>

          <Form.Item name="requirementsInput" label="需求标签（以；分隔）">
            <Input placeholder="示例：剪辑；AE；宣传视频" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 申请人作品集查看 */}
      <Modal
  title={
    portfoliosOwner
      ? `作品集：${portfoliosOwner.username || portfoliosOwner.id}`
      : "作品集"
  }
  open={portfoliosVisible}
  width={900}
  footer={null}
  onCancel={() => {
    setPortfoliosVisible(false);
    setPortfolios([]);
    setPortfoliosOwner(null);
  }}
>
  {portfoliosLoading ? (
    <div style={{ textAlign: "center", padding: 24 }}>加载中...</div>
  ) : portfolios.length === 0 ? (
    <div style={{ textAlign: "center", padding: 24, color: "#999" }}>
      无作品集
    </div>
  ) : (
    <Tabs
      items={portfolios.map((p: any) => ({
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
            {/* 缩略图与描述部分（左右布局） */}
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              {/* 左侧：缩略图 */}
              <div
                style={{
                  width: 120,
                  height: 90,
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "#f5f5f5",
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

              {/* 右侧：作品描述 */}
              <div
                style={{
                  flex: 1,
                  color: "#666",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.description ? (
                  p.description.length > 100 ? (
                    <>
                      {p.description.substring(0, 100)}...
                      <span
                        style={{ color: "blue", cursor: "pointer" }}
                        onClick={() => alert(p.description)}
                      >
                        查看更多
                      </span>
                    </>
                  ) : (
                    p.description
                  )
                ) : (
                  "暂无描述"
                )}
              </div>
            </div>

            {/* 折叠面板显示材料 */}
            <Collapse defaultActiveKey={['1']}>
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
                        m.url && /\.(png|jpg|jpeg|gif|webp)$/i.test(m.url) ? (
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
                                typeof nav.msSaveOrOpenBlob === "function"
                              ) {
                                nav.msSaveOrOpenBlob(blob, filename);
                                return;
                              }
                              const url = window.URL.createObjectURL(blob);
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
</Modal>


      {/* 申请列表与委派 */}
      <Modal
        title="申请列表"
        open={appModalVisible}
        onCancel={() => {
          setAppModalVisible(false);
          setAppModalOrder(null);
        }}
        footer={null}
        width={600}
      >
        {appModalOrder && (
          <List
            loading={appLoading}
            dataSource={(appModalOrder.applications || [])
              .slice()
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )}
            renderItem={(app: any) => (
              <List.Item
                actions={[
                  <Button
                    key="accept"
                    type="primary"
                    disabled={
                      app?.status !== "PENDING" ||
                      appModalOrder?.status !== "PENDING"
                    }
                    onClick={() => handleAccept(appModalOrder.id, app.id)}
                  >
                    {app?.status === "ACCEPTED"
                      ? "已委派"
                      : app?.status === "REJECTED"
                      ? "已拒绝"
                      : "委派"}
                  </Button>,
                  <Button
                    key="view-portfolios"
                    onClick={() =>
                      openApplicantPortfolios(
                        app.user?.id || app.userId,
                        app.user?.username
                      )
                    }
                  >
                    作品集
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar src={resolveFileUrl(app.user?.avatar)} />}
                  title={
                    <span>
                      {app.user?.username || app.userId}
                      {typeof app.user?.averageRating === "number" && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          均分 {app.user.averageRating}
                        </Tag>
                      )}
                      {typeof app.user?.reviewsCount === "number" && (
                        <Tag color="cyan" style={{ marginLeft: 4 }}>
                          评价 {app.user.reviewsCount}
                        </Tag>
                      )}
                    </span>
                  }
                  description={(() => {
                    const skills = (() => {
                      const s = app.user?.skills;
                      if (!s) return [] as string[];
                      try {
                        const arr = typeof s === "string" ? JSON.parse(s) : s;
                        return Array.isArray(arr) ? arr : [];
                      } catch {
                        return [];
                      }
                    })();
                    const tags = (() => {
                      const s = app.user?.tags;
                      if (!s) return [] as string[];
                      try {
                        const arr = typeof s === "string" ? JSON.parse(s) : s;
                        return Array.isArray(arr) ? arr : [];
                      } catch {
                        return [];
                      }
                    })();
                    return (
                      <div>
                        {app.user?.bio && (
                          <div style={{ marginBottom: 4 }}>{app.user.bio}</div>
                        )}
                        {(skills.length > 0 || tags.length > 0) && (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {skills.map((s: string) => (
                              <Tag key={`skill-${s}`} color="green">
                                {s}
                              </Tag>
                            ))}
                            {tags.map((t: string) => (
                              <Tag key={`tag-${t}`} color="blue">
                                {t}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                />
              </List.Item>
            )}
            locale={{ emptyText: "暂无申请" }}
          />
        )}
      </Modal>
    </div>
  );
};

export default OrderManagement;
