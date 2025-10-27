import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Upload,
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
  Image,
  Statistic,
  Collapse,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  UserOutlined,
  FileImageOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import type { UploadProps } from "antd/es/upload";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import http, { resolveFileUrl } from "../store/api/http";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Portfolio {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    avatar: string;
    role: string;
  };
  materials?: Array<{
    id: string;
    url: string;
    title?: string;
    createdAt: string;
  }>;
  thumbnail?: string;
}

const PortfolioManagement: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(
    null
  );
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [stats, setStats] = useState<any>(null);
  const [createThumbFile, setCreateThumbFile] = useState<any | null>(null);
  const [createFiles, setCreateFiles] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    keyword: "",
  });

  const { user } = useSelector((state: RootState) => state.auth);

  // 获取作品集列表
  const fetchPortfolios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.keyword) params.append("keyword", filters.keyword);

      const { data } = await http.get(`/portfolios?${params.toString()}`);
      setPortfolios(data.data || []);
    } catch (error) {
      message.error("获取作品集列表失败");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await http.get("/portfolios/stats");
      setStats(data);
    } catch (error) {
      console.error("获取统计信息失败:", error);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
    fetchStats();
  }, [fetchPortfolios, fetchStats]);

  // 创建作品集
  const handleCreate = async (values: any) => {
    try {
      const form = new FormData();
      form.append("title", values.title);
      if (values.description) form.append("description", values.description);
      if (createThumbFile?.originFileObj) {
        form.append("thumbnail", createThumbFile.originFileObj);
      }
      (createFiles || []).forEach((f: any) => {
        if (f.originFileObj) form.append("files", f.originFileObj);
      });
      await http.post("/portfolios", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("作品集创建成功");
      setEditModalVisible(false);
      editForm.resetFields();
      setCreateThumbFile(null);
      setCreateFiles([]);
      fetchPortfolios();
      fetchStats();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "作品集创建失败");
    }
  };

  // 更新作品集
  const handleUpdate = async (values: any) => {
    if (!selectedPortfolio) return;

    try {
      await http.patch(`/portfolios/${selectedPortfolio.id}`, values);
      message.success("作品集更新成功");
      setEditModalVisible(false);
      editForm.resetFields();
      fetchPortfolios();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "作品集更新失败");
    }
  };

  // 删除作品集
  const deletePortfolio = async (id: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个作品集吗？",
      onOk: async () => {
        try {
          await http.delete(`/portfolios/${id}`);
          message.success("删除成功");
          fetchPortfolios();
          fetchStats();
        } catch (error: any) {
          message.error(error?.response?.data?.message || "删除失败");
        }
      },
    });
  };

  // 下载素材
  const downloadMaterial = async (m: any) => {
    try {
      const resp = await http.get(`/materials/${m.id}/preview`, { responseType: 'blob' });
      const blob = new Blob([resp.data]);
      const filename = m.title || `material-${m.id}`;
      const nav: any = window.navigator;
      if (nav && typeof nav.msSaveOrOpenBlob === 'function') {
        nav.msSaveOrOpenBlob(blob, filename);
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('下载失败');
    }
  };

  // 查看作品集详情
  const viewPortfolioDetail = async (portfolio: Portfolio) => {
    try {
      const { data } = await http.get(`/portfolios/${portfolio.id}`);
      setSelectedPortfolio(data);
      setViewModalVisible(true);
    } catch (error) {
      message.error("获取作品集详情失败");
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      ACTIVE: { color: "green", text: "已审核" },
      INACTIVE: { color: "orange", text: "待审核" },
      DELETED: { color: "gray", text: "已下架" },
    };
    const config = statusMap[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取类型标签
  // 类型已移除

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: "file",
    listType: "picture-card",
    showUploadList: false,
    beforeUpload: async (file: any) => {
      if (!selectedPortfolio) {
        message.warning("请先保存作品，再上传文件");
        return false;
      }
      const formData = new FormData();
      formData.append("files", file);
      try {
        await http.post(
          `/materials/upload?portfolioId=${selectedPortfolio.id}`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        message.success("文件上传成功");
        fetchPortfolios();
      } catch (error) {
        message.error("文件上传失败");
      }
      return false;
    },
  };

  const createThumbUploadProps: UploadProps = {
    name: "file",
    listType: "picture-card",
    showUploadList: false,
    beforeUpload: async (file: any) => {
      setCreateThumbFile({
        originFileObj: file,
        name: file.name,
        url: URL.createObjectURL(file),
      });
      return false;
    },
    onRemove: () => {
      setCreateThumbFile(null);
    },
  } as any;

  const createFilesUploadProps: UploadProps = {
    multiple: true,
    showUploadList: true,
    beforeUpload: async (file: any) => {
      setCreateFiles((prev) => [
        ...prev,
        { originFileObj: file, name: file.name },
      ]);
      return false;
    },
    onRemove: (file: any) => {
      setCreateFiles((prev) => prev.filter((f) => f.name !== file.name));
    },
  } as any;

  const columns: ColumnsType<Portfolio> = [
    {
      title: "作品信息",
      key: "portfolioInfo",
      width: 300,
      // ellipsis: true,
      render: (_, record) => (
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              width: 80,
              height: 60,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {(() => {
              const thumb = (record as any).thumbnail as string | undefined;
              const first = record.materials && record.materials[0]?.url;
              const src = thumb || first;
              return src ? (
                <Image
                  src={resolveFileUrl(src)}
                  alt={record.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  preview={false}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileImageOutlined style={{ fontSize: 24, color: "#ccc" }} />
                </div>
              );
            })()}
          </div>
          <div style={{ flex: 1 }}>
            <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
              {record.title}
            </Title>
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              {getStatusTag(record.status)}
            </div>
            <Tooltip title={record.description}>
              <Text
                type="secondary"
                style={{ maxWidth: 800, display: "inline-block" }}
                ellipsis
              >
                {record.description}
              </Text>
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: "创作者",
      key: "user",
      width: 120,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar
            src={resolveFileUrl(record.user.avatar)}
            icon={<UserOutlined />}
            size="small"
          />
          <Text strong>{record.user.username}</Text>
        </div>
      ),
    },
    // 标签已移除
    {
      title: "发布时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => viewPortfolioDetail(record)}
            />
          </Tooltip>
          {(user?.role === "ADMIN" || record.user.id === user?.id) && (
            <>
              <Tooltip title="编辑">
                {user?.role === 'ADMIN' ? (
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setSelectedPortfolio(record);
                      editForm.setFieldsValue({ status: record.status });
                      setEditModalVisible(true);
                    }}
                  />
                ) : (
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setSelectedPortfolio(record);
                      editForm.setFieldsValue({
                        title: record.title,
                        description: record.description,
                        status: record.status,
                      });
                      setEditModalVisible(true);
                    }}
                  />
                )}
              </Tooltip>
              {record.user.id === user?.id && (
                <Tooltip title="删除">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => deletePortfolio(record.id)}
                  />
                </Tooltip>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  if (
    user?.role !== "CREATOR" &&
    user?.role !== "DESIGNER" &&
    user?.role !== "ADMIN"
  ) {
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
        <Title level={2}>作品集管理</Title>
        {(user?.role === "CREATOR" || user?.role === "DESIGNER") && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedPortfolio(null);
              editForm.resetFields();
              setEditModalVisible(true);
            }}
          >
            创建作品集
          </Button>
        )}
      </div>

      {/* 统计信息 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总作品数"
                value={stats.total}
                prefix={<FileImageOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已审核"
                value={stats.byStatus?.ACTIVE ?? 0}
                prefix={<FileImageOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待审核"
                value={stats.byStatus?.INACTIVE ?? 0}
                prefix={<FileImageOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已下架"
                value={stats.byStatus?.DELETED ?? 0}
                prefix={<FileImageOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选器 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="选择状态"
              style={{ width: "100%" }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              allowClear
            >
              <Option value="ACTIVE">已审核</Option>
              <Option value="INACTIVE">待审核</Option>
              <Option value="DELETED">已下架</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={12}>
            <Input
              placeholder="搜索作品标题或描述..."
              value={filters.keyword}
              onChange={(e) =>
                setFilters({ ...filters, keyword: e.target.value })
              }
            />
          </Col>
        </Row>
      </Card>

      {/* 作品集列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={portfolios}
          loading={loading}
          rowKey="id"
          pagination={{
            total: portfolios.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          locale={{ emptyText: <Empty description="暂无作品集" /> }}
        />
      </Card>

      {/* 作品集详情模态框 */}
      <Modal
        title="作品集详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedPortfolio && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>作品标题：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {selectedPortfolio.title}
                  </Title>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {/* {getTypeTag(selectedPortfolio.type)} */}
                    {getStatusTag(selectedPortfolio.status)}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <Text strong>创作者：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Avatar
                      src={resolveFileUrl(selectedPortfolio.user.avatar)}
                      icon={<UserOutlined />}
                    />
                    <div>
                      <Text strong>{selectedPortfolio.user.username}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {selectedPortfolio.user.role === "ADVERTISER"
                            ? "广告商"
                            : "创作者"}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            <Text strong>作品描述：</Text>
            <div
              style={{
                marginTop: 8,
                marginBottom: 16,
                padding: 12,
                background: "#f5f5f5",
                borderRadius: 6,
              }}
            >
              <Text>{selectedPortfolio.description}</Text>
            </div>

            <Text strong>作品预览：</Text>
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              {(() => {
                const thumb = (selectedPortfolio as any).thumbnail as
                  | string
                  | undefined;
                const first = (selectedPortfolio as any).materials?.[0]?.url as
                  | string
                  | undefined;
                const src = thumb || first;
                return src ? (
                  <Image
                    src={resolveFileUrl(src)}
                    alt={selectedPortfolio.title}
                    style={{ maxWidth: "50%", height: "auto", borderRadius: 6 }}
                  />
                ) : (
                  <div
                    style={{
                      padding: 40,
                      background: "#f5f5f5",
                      borderRadius: 6,
                      textAlign: "center",
                      color: "#999",
                    }}
                  >
                    暂无预览图
                  </div>
                );
              })()}
            </div>
            <Collapse defaultActiveKey={["1"]}>
              <Collapse.Panel header="材料展示" key="1">
                {/* 如果没有材料则显示 "暂无材料" */}
                {selectedPortfolio?.materials?.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#999" }}>
                    暂无材料
                  </div>
                ) : (
                  selectedPortfolio?.materials?.map((m: any) => (
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
                              const filename = m.title || `material-${m.id}`;
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
            {/* {selectedPortfolio.tags && selectedPortfolio.tags.length > 0 && (
              <>
                <Text strong>标签：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <Space wrap>
                    {selectedPortfolio.tags.map(tag => (
                      <Tag key={tag} color="blue">{tag}</Tag>
                    ))}
                  </Space>
                </div>
              </>
            )} */}

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">
                    发布时间:{" "}
                    {new Date(selectedPortfolio.createdAt).toLocaleString()}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">
                    更新时间:{" "}
                    {new Date(selectedPortfolio.updatedAt).toLocaleString()}
                  </Text>
                </Col>
              </Row>
              {/* <div style={{ marginTop: 8 }}>
                <Button 
                  type="link" 
                  href={selectedPortfolio.url} 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看完整作品 →
                </Button>
              </div> */}
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑作品集模态框 */}
      <Modal
        title={selectedPortfolio ? "编辑作品集" : "创建作品集"}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setCreateThumbFile(null);
          setCreateFiles([]);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={selectedPortfolio ? handleUpdate : handleCreate}
        >
          {user?.role !== 'ADMIN' && (
            <>
              <Form.Item name="title" label="作品标题" rules={[{ required: true, message: "请输入作品标题" }]}>
                <Input placeholder="请输入作品标题" />
              </Form.Item>
              <Form.Item name="description" label="作品描述">
                <TextArea rows={4} placeholder="请输入作品描述" />
              </Form.Item>
            </>
          )}

          {selectedPortfolio ? (
            <Form.Item label="上传作品文件（归档到当前作品集）">
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>上传文件</Button>
              </Upload>
              <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
                支持图片、视频、音频等格式。已上传的文件显示在列表缩略图中。
              </div>
            </Form.Item>
          ) : (
            user?.role !== 'ADMIN' && (
              <>
                <Form.Item label="缩略图（可选）">
                  <Upload {...createThumbUploadProps}>
                    {createThumbFile ? (
                      <Image src={createThumbFile.url} alt="thumb" style={{ width: 102, height: 102, objectFit: "cover" }} />
                    ) : (
                      <Button icon={<UploadOutlined />}>上传缩略图</Button>
                    )}
                  </Upload>
                </Form.Item>
                <Form.Item label="附件（可选，创建时一并上传）">
                  <Upload {...createFilesUploadProps}>
                    <Button icon={<UploadOutlined />}>选择文件</Button>
                  </Upload>
                </Form.Item>
              </>
            )
          )}

          {selectedPortfolio && (selectedPortfolio as any)?.materials?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text strong>已上传材料：</Text>
              <Table
                style={{ marginTop: 8 }}
                size="small"
                rowKey={(m: any) => m.id}
                dataSource={(selectedPortfolio as any).materials}
                pagination={false}
                columns={[
                  {
                    title: '名称',
                    dataIndex: 'title',
                    key: 'title',
                    render: (_: any, m: any) => (
                      <Button type="link" onClick={() => downloadMaterial(m)} title={m.title || ''}>
                        {m.title || '未命名'}
                      </Button>
                    ),
                  },
                  {
                    title: '上传时间',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
                    width: 160,
                  },
                  {
                    title: '操作',
                    key: 'action',
                    align: 'right' as const,
                    width: 120,
                    render: (_: any, m: any) => (
                      (user?.id === selectedPortfolio?.user.id) ? (
                        <Button size="small" danger onClick={async () => {
                          try {
                            await http.delete(`/materials/${m.id}`);
                            message.success('已删除');
                            const { data } = await http.get(`/portfolios/${selectedPortfolio?.id}`);
                            setSelectedPortfolio(data);
                            fetchPortfolios();
                          } catch {
                            message.error('删除失败');
                          }
                        }}>删除</Button>
                      ) : null
                    ),
                  },
                ]}
              />
            </div>
          )}

          {selectedPortfolio && (
            <Form.Item name="status" label="状态">
              <Select disabled={user?.role !== "ADMIN"}>
                <Option value="ACTIVE">已审核</Option>
                <Option value="INACTIVE">待审核</Option>
                <Option value="DELETED">已下架</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedPortfolio ? "更新" : "创建"}
              </Button>
              <Button
                onClick={() => {
                  setEditModalVisible(false);
                  editForm.resetFields();
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

export default PortfolioManagement;

// 删除无效的顶级示例代码片段
