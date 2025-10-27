import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  message,
  Row,
  Col,
  Typography,
  Avatar,
  Tooltip,
  Empty,
  InputNumber,
  List,
  Pagination,
} from "antd";
import { Collapse } from "antd";
import {
  EyeOutlined,
  SendOutlined,
  UserOutlined,
  FilterOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
// import type { ColumnsType } from "antd/es/table";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import http, { resolveFileUrl } from "../store/api/http";
import { XiaomeiIcon } from "../components/AIAssistant";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Order {
  id: string;
  title: string;
  description: string;
  amount: number;
  budget: number;
  status: string;
  priority: string;
  deadline: string;
  contentRequirements: string;
  requirements: string[];
  tags: string[];
  createdAt: string;
  applications?: Array<{
    id: string;
    userId: string;
  }>;
  customer: {
    id: string;
    username: string;
    avatar: string;
    company: string;
  };
  _count: {
    applications: string[];
  };
}

const OrderPlaza: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(6);
  const [total, setTotal] = useState<number>(0);
  const [aiSet, setAiSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [applyForm] = Form.useForm();
  const [filters, setFilters] = useState({
    priority: "",
    minAmount: 0,
    maxAmount: undefined as number | undefined,
    keyword: "",
  });

  const { user } = useSelector((state: RootState) => state.auth);

  // 获取订单列表
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.minAmount !== undefined)
        params.append("minAmount", filters.minAmount?.toString());
      if (filters.maxAmount !== undefined)
        params.append("maxAmount", filters.maxAmount?.toString());
      if (filters.keyword) params.append("keyword", filters.keyword);
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));
      params.append("status", "PENDING");
      const { data } = await http.get(`/orders?${params.toString()}`);
      setOrders(data.data || []);
      setTotal(Number(data.total || 0));
    } catch (error) {
      message.error("获取订单列表失败");
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 申请接单
  const handleApply = async (values: any) => {
    if (!selectedOrder) return;

    try {
      await http.post(`/orders/${selectedOrder.id}/apply`, {
        message: values.message,
      });
      message.success("申请提交成功");
      setApplyModalVisible(false);
      applyForm.resetFields();
      fetchOrders();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "申请失败");
    }
  };

  // 查看订单详情
  const viewOrderDetail = async (order: Order) => {
    try {
      const { data } = await http.get(`/orders/${order.id}`);
      setSelectedOrder(data);
      setViewModalVisible(true);
      // 拉取附件列表
      setAttLoading(true);
      try {
        const att = await http.get(`/orders/${order.id}/attachments`);
        setAttachments(att.data || []);
      } catch {
      } finally {
        setAttLoading(false);
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || "获取订单详情失败");
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      PENDING: { color: "orange", text: "已发布" },
      IN_PROGRESS: { color: "blue", text: "进行中" },
      COMPLETED: { color: "green", text: "已完成" },
      CANCELLED: { color: "red", text: "已取消" },
    };
    const config = statusMap[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取紧急程度标签
  const getPriorityText = (priority: string) => {
    const map: { [key: string]: string } = {
      LOW: "低",
      MEDIUM: "中",
      HIGH: "高",
      URGENT: "紧急",
    };
    const text = map[priority] || priority;
    return <Text type="secondary">紧急程度：{text}</Text>;
  };

  // 已移除：类型标签

  // 已移除表格，改为卡片分页（每页6个）

  if (user?.role !== "CREATOR" && user?.role !== "DESIGNER") {
    return <div>您没有权限访问此页面</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={2}>订单广场</Title>
        <Text type="secondary">发现合适的项目，展示您的才华</Text>
      </div>

      {/* 筛选器 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {/* 已移除类型筛选 */}
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">紧急程度</Text>
            </div>
            <Select
              style={{ width: "100%" }}
              value={filters.priority}
              onChange={(value) => setFilters({ ...filters, priority: value })}
              allowClear
            >
              <Option value="LOW">低</Option>
              <Option value="MEDIUM">中</Option>
              <Option value="HIGH">高</Option>
              <Option value="URGENT">紧急</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">最小金额</Text>
            </div>
            <InputNumber
              style={{ width: "100%" }}
              value={filters.minAmount}
              onChange={(value) =>
                setFilters({ ...filters, minAmount: value ?? 0 })
              }
              min={0}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">最大金额</Text>
            </div>
            <InputNumber
              style={{ width: "100%" }}
              value={filters.maxAmount}
              onChange={(value) =>
                setFilters({
                  ...filters,
                  maxAmount: value === null ? undefined : value,
                })
              }
              min={0}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">关键词</Text>
            </div>
            <Input
              prefix={<SearchOutlined />}
              value={filters.keyword}
              onChange={(e) =>
                setFilters({ ...filters, keyword: e.target.value })
              }
            />
          </Col>
          <Col xs={24} sm={12} md={2}>
            <Button
              style={{ marginTop: 26 }}
              icon={<ReloadOutlined />}
              onClick={() => {
                setFilters({
                  priority: "",
                  minAmount: 0,
                  maxAmount: undefined,
                  keyword: "",
                });
                setAiSet(new Set());
                setPage(1);
                fetchOrders();
              }}
            >
              重置
            </Button>
          </Col>
        </Row>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <div style={{ color: "#666" }}>
            还在为找不到心仪的订单而烦恼吗？试试 <strong>小媒 AI</strong>{" "}
            筛选功能，可根据您的擅长技能与个性化标签匹配合适订单。
          </div>
          <Space>
            {/* <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setAiSet(new Set());
                setPage(1);
                fetchOrders();
              }}
            >
              筛选
            </Button> */}
            <Button
              // type="primary"
              icon={XiaomeiIcon}
              style={{ marginLeft: 60 }}
              onClick={async () => {
                try {
                  setLoading(true);
                  const { data } = await http.post("/orders/smart-match");
                  const list = data?.data || [];
                  setOrders(list);
                  setAiSet(new Set(list.map((x: any) => x.id)));
                  message.success(data?.notice || "已为您筛选");
                } catch (e: any) {
                  message.error(e?.response?.data?.message || "AI 筛选失败");
                } finally {
                  setLoading(false);
                }
              }}
            >
              AI 智能筛选
            </Button>
          </Space>
        </div>
      </Card>

      {/* 订单卡片（每页6个） */}
      <Card>
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 3 }}
          dataSource={orders}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无订单" /> }}
          renderItem={(record) => (
            <List.Item key={record.id}>
              <Card
                hoverable
                style={{ position: "relative" }}
                actions={[
                  <Tooltip title="查看详情" key={`view-${record.id}`}>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => viewOrderDetail(record)}
                    >
                      查看
                    </Button>
                  </Tooltip>,
                  record.status === "PENDING" ? (
                    (() => {
                      const alreadyApplied = Array.isArray(record.applications)
                        ? !!record.applications?.some(
                            (app) => app.userId === user?.id
                          )
                        : false;
                      if (alreadyApplied)
                        return (
                          <Button
                            icon={<CheckOutlined />}
                            key={`apply-${record.id}`}
                            type="text"
                            disabled
                          >
                            已申请
                          </Button>
                        );
                      return (
                        <Button
                          key={`apply-${record.id}`}
                          type="link"
                          icon={<SendOutlined />}
                          onClick={() => {
                            setSelectedOrder(record);
                            setApplyModalVisible(true);
                          }}
                        >
                          申请
                        </Button>
                      );
                    })()
                  ) : (
                    <span key={`noaction-${record.id}`} />
                  ),
                ]}
                title={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 6px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          lineHeight: 1.2,
                          wordBreak: "break-all",
                        }}
                      >
                        {record.title}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        {getPriorityText(record.priority)}
                      </div>
                    </div>
                  </div>
                }
                extra={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 4,
                    }}
                  >
                    {aiSet.has(record.id) && <Tag color="magenta">AI筛选</Tag>}
                    <div style={{ textAlign: "right" }}>
                      <Text
                        strong
                        style={{ color: "#1890ff", whiteSpace: "nowrap" }}
                      >
                        ¥{record.amount.toFixed(2)}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        {getStatusTag(record.status)}
                      </div>
                    </div>
                  </div>
                }
              >
                <div>
                  <Text
                    type="secondary"
                    style={{ display: "block" }}
                    ellipsis={{ tooltip: record.description }}
                  >
                    {record.description}
                  </Text>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <Avatar
                    src={resolveFileUrl(record.customer.avatar)}
                    icon={<UserOutlined />}
                    size="small"
                  />
                  <div>
                    <Text strong>{record.customer.username}</Text>
                    {record.customer.company && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {record.customer.company}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>

                {/* 需求标签 */}
                {record.tags && record.tags.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong>需求标签：</Text>
                    <Space wrap style={{ marginTop: 4 }}>
                      {record.tags.map((t) => (
                        <Tag key={t} color="blue">
                          {t}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* 项目需求 */}
                {record.requirements && record.requirements.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong>项目需求：</Text>
                    <Space wrap style={{ marginTop: 4 }}>
                      {record.requirements.map((r) => (
                        <Tag key={r} color="purple">
                          {r}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
                {/* 截止时间说明，不换行 */}
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div style={{ marginTop: 8 }}>
                    {record.deadline ? (
                      <Text
                        style={{
                          color: "#ff4d4f",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                        }}
                      >
                        截止：
                        {dayjs(record.deadline).format("YYYY-MM-DD HH:mm")}
                      </Text>
                    ) : (
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, whiteSpace: "nowrap" }}
                      >
                        截止：无要求
                      </Text>
                    )}
                  </div>

                  {/* <Divider style={{ margin: '8px 0' }} /> */}
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      当前已有 {(record as any)._count?.applications || 0}{" "}
                      个申请
                    </Text>
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      </Card>

      {/* 分页器 */}
      {total > 0 && (
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}
        >
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showQuickJumper
            showSizeChanger={false}
            showTotal={(t) => `共 ${t} 条`}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* 订单详情模态框 */}
      <Modal
        title="订单详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>订单标题：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {selectedOrder.title}
                  </Title>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {getPriorityText(selectedOrder.priority)}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <Text strong>订单状态：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  {getStatusTag(selectedOrder.status)}
                </div>
              </Col>
            </Row>

            {/* 附件：可折叠 + 弹窗查看 */}
            <div style={{ marginTop: 8 }}>
              <Collapse bordered={false} defaultActiveKey={["attachments"]}>
                <Collapse.Panel
                  header={
                    <span>
                      附件{" "}
                      {attachments?.length ? `(${attachments.length})` : ""}
                    </span>
                  }
                  key="attachments"
                >
                  {attLoading ? (
                    <Text type="secondary">加载中...</Text>
                  ) : attachments && attachments.length > 0 ? (
                    <List
                      dataSource={attachments}
                      renderItem={(item: any) => (
                        <List.Item>
                          <List.Item.Meta
                            title={
                              <Typography.Link
                                style={{ color: "#1890ff" }}
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
                              >
                                {item.title || item.url}
                              </Typography.Link>
                            }
                            description={dayjs(item.createdAt).format(
                              "YYYY-MM-DD HH:mm"
                            )}
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: "暂无附件" }}
                    />
                  ) : (
                    <Text type="secondary">暂无附件</Text>
                  )}
                </Collapse.Panel>
              </Collapse>
            </div>

            {selectedOrder.description && (
              <>
                <Text strong>项目描述：</Text>
                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 16,
                    padding: 12,
                    background: "#f5f5f5",
                    borderRadius: 6,
                  }}
                >
                  <Text>{selectedOrder.description}</Text>
                </div>
              </>
            )}

            <Row gutter={16}>
              <Col span={8}>
                <Text strong>项目金额：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      color: "#1890ff",
                      fontWeight: "bold",
                    }}
                  >
                    ¥{selectedOrder.amount.toFixed(2)}
                  </Text>
                  {selectedOrder.budget && (
                    <div>
                      <Text type="secondary">
                        预算: ¥{selectedOrder.budget.toFixed(2)}
                      </Text>
                    </div>
                  )}
                </div>
              </Col>
              <Col span={8}>
                <Text strong>广告商信息：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Avatar
                      src={resolveFileUrl(selectedOrder.customer.avatar)}
                      icon={<UserOutlined />}
                    />
                    <div>
                      <Text strong>{selectedOrder.customer.username}</Text>
                      {selectedOrder.customer.company && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {selectedOrder.customer.company}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <Text strong>截止时间：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  {selectedOrder.deadline ? (
                    <Text style={{ color: "#ff4d4f", fontSize: 12 }}>
                      {dayjs(selectedOrder.deadline).format("YYYY-MM-DD HH:mm")}
                    </Text>
                  ) : (
                    <Text type="secondary">无截止时间</Text>
                  )}
                </div>
              </Col>
            </Row>

            {selectedOrder.requirements &&
              selectedOrder.requirements.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 16,
                    padding: 12,
                    background: "#f5f5f5",
                    borderRadius: 6,
                  }}
                >
                  <Text strong>项目需求：</Text>
                  <Space wrap style={{ marginTop: 8 }}>
                    {selectedOrder.requirements.map((r) => (
                      <Tag key={r} color="purple">
                        {r}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}

            {selectedOrder.tags && selectedOrder.tags.length > 0 && (
              <>
                <Text strong>需求标签：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <Space wrap>
                    {selectedOrder.tags?.map((r) => (
                      <Tag key={r} color="blue">
                        {r}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </>
            )}

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <Text type="secondary">
                发布时间:{" "}
                {dayjs(selectedOrder.createdAt).format("YYYY-MM-DD HH:mm:ss")}
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  已有 {selectedOrder.applications?.length || 0} 位创作者申请
                </Text>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 申请接单模态框 */}
      <Modal
        title="申请接单"
        open={applyModalVisible}
        onCancel={() => {
          setApplyModalVisible(false);
          applyForm.resetFields();
        }}
        footer={null}
      >
        <Form form={applyForm} layout="vertical" onFinish={handleApply}>
          <Form.Item
            name="message"
            label="申请留言"
            rules={[{ required: true, message: "请输入申请留言" }]}
          >
            <TextArea
              rows={4}
              placeholder="请简要介绍您的经验和优势，为什么适合这个项目..."
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交申请
              </Button>
              <Button
                onClick={() => {
                  setApplyModalVisible(false);
                  applyForm.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderPlaza;
