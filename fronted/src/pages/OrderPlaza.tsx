import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Table,
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
} from "antd";
import { List } from "antd";
import { Collapse } from "antd";
import {
  EyeOutlined,
  SendOutlined,
  UserOutlined,
  FilterOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import http, { resolveFileUrl } from "../store/api/http";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Order {
  id: string;
  title: string;
  description: string;
  type: string;
  amount: number;
  budget: number;
  status: string;
  priority: string;
  deadline: string;
  contentRequirements: string;
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
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [applyForm] = Form.useForm();
  const [filters, setFilters] = useState({
    type: "",
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
      if (filters.type) params.append("type", filters.type);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.minAmount !== undefined)
        params.append("minAmount", filters.minAmount?.toString());
      if (filters.maxAmount !== undefined)
        params.append("maxAmount", filters.maxAmount?.toString());
      if (filters.keyword) params.append("keyword", filters.keyword);

      const { data } = await http.get(`/orders?${params.toString()}`);
      setOrders(data.data || []);
    } catch (error) {
      message.error("获取订单列表失败");
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
      PENDING: { color: "orange", text: "待接单" },
      IN_PROGRESS: { color: "blue", text: "进行中" },
      COMPLETED: { color: "green", text: "已完成" },
      CANCELLED: { color: "red", text: "已取消" },
    };
    const config = statusMap[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取紧急程度标签
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
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取类型标签
  const getTypeTag = (type: string) => {
    const typeMap: { [key: string]: { color: string; text: string } } = {
      VIDEO: { color: "purple", text: "视频" },
      DESIGN: { color: "cyan", text: "设计" },
      H5: { color: "blue", text: "H5" },
      ANIMATION: { color: "orange", text: "动画" },
      AUDIO: { color: "green", text: "音频" },
      OTHER: { color: "default", text: "其他" },
    };
    const config = typeMap[type] || { color: "default", text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<Order> = [
    {
      title: "订单信息",
      key: "orderInfo",
      width: 300,
      render: (_, record) => (
        <div>
          <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
            {record.title}
          </Title>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            {getTypeTag(record.type)}
            {getPriorityTag(record.priority)}
          </div>
          <Text type="secondary" ellipsis={{ tooltip: record.description }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: "金额",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (amount, record) => (
        <div>
          <Text strong style={{ fontSize: 16, color: "#1890ff" }}>
            ¥{amount.toFixed(2)}
          </Text>
          {record.budget && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                预算: ¥{record.budget.toFixed(2)}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "广告商",
      key: "customer",
      width: 150,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: "截止时间",
      dataIndex: "deadline",
      key: "deadline",
      width: 120,
      render: (deadline) => (
        <div>
          {deadline ? (
            <>
              <Text>{dayjs(deadline).format("MM-DD")}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(deadline).format("HH:mm")}
                </Text>
              </div>
            </>
          ) : (
            <Text type="secondary">无截止时间</Text>
          )}
        </div>
      ),
    },
    {
      title: "申请数",
      dataIndex: ["_count", "applications"],
      key: "applications",
      width: 80,
      render: (count) => <Tag color="blue">{count} 个申请</Tag>,
    },
    {
      title: "发布时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 100,
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(date).format("MM-DD HH:mm")}
        </Text>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => viewOrderDetail(record)}
            />
          </Tooltip>
          {record.status === "PENDING" &&
            (() => {
              const alreadyApplied = Array.isArray(record.applications)
                ? !!record.applications?.some((app) => app.userId === user?.id)
                : false;
              if (alreadyApplied) {
                return <Tag color="default">已申请</Tag>;
              }
              return (
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => {
                    setSelectedOrder(record);
                    setApplyModalVisible(true);
                  }}
                >
                  申请
                </Button>
              );
            })()}
        </Space>
      ),
    },
  ];

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
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">类型</Text>
            </div>
            <Select
              style={{ width: "100%" }}
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
              allowClear
            >
              <Option value="VIDEO">视频</Option>
              <Option value="DESIGN">设计</Option>
              <Option value="H5">H5</Option>
              <Option value="ANIMATION">动画</Option>
              <Option value="AUDIO">音频</Option>
              <Option value="OTHER">其他</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
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
          <Col xs={24} sm={12} md={6}>
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
          <Col xs={24} sm={12} md={6}>
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
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col xs={24} sm={16} md={18}>
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
          <Col xs={24} sm={8} md={6}>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={fetchOrders}
              block
            >
              筛选
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 订单列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          loading={loading}
          rowKey="id"
          pagination={{
            total: orders.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          locale={{ emptyText: <Empty description="暂无订单" /> }}
        />
      </Card>

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
                    {getTypeTag(selectedOrder.type)}
                    {getPriorityTag(selectedOrder.priority)}
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
                              style={{color: '#1890ff'}}
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

            {selectedOrder.description && <><Text strong>项目描述：</Text><div
              style={{
                marginTop: 8,
                marginBottom: 16,
                padding: 12,
                background: "#f5f5f5",
                borderRadius: 6,
              }}
            >
              <Text>{selectedOrder.description}</Text>
            </div></>}

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
                    <Text>
                      {dayjs(selectedOrder.deadline).format("YYYY-MM-DD HH:mm")}
                    </Text>
                  ) : (
                    <Text type="secondary">无截止时间</Text>
                  )}
                </div>
              </Col>
            </Row>

            {selectedOrder.contentRequirements && (
              <div
                style={{
                  marginTop: 8,
                  marginBottom: 16,
                  padding: 12,
                  background: "#f5f5f5",
                  borderRadius: 6,
                }}
              >
                <Text strong>内容要求：</Text>
                <Text>{selectedOrder.contentRequirements}</Text>
              </div>
            )}

            {selectedOrder.tags && selectedOrder.tags.length > 0 && (
              <>
                <Text strong>标签：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <Space wrap>
                    {selectedOrder.tags?.map((tag) => (
                      <Tag key={tag} color="blue">
                        {tag}
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
