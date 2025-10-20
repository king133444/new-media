import React, { useState, useEffect, useCallback } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  UserOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd/es/upload';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import http from '../store/api/http';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Portfolio {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  thumbnail: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    avatar: string;
    role: string;
  };
}

const PortfolioManagement: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    keyword: '',
  });

  const { user } = useSelector((state: RootState) => state.auth);

  // 获取作品集列表
  const fetchPortfolios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.keyword) params.append('keyword', filters.keyword);

      const { data } = await http.get(`/portfolios?${params.toString()}`);
      setPortfolios(data.data || []);
    } catch (error) {
      message.error('获取作品集列表失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await http.get('/portfolios/stats');
      setStats(data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
    fetchStats();
  }, [fetchPortfolios, fetchStats]);

  // 创建作品集
  const handleCreate = async (values: any) => {
    try {
      await http.post('/portfolios', values);
      message.success('作品集创建成功');
      setEditModalVisible(false);
      editForm.resetFields();
      fetchPortfolios();
      fetchStats();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '作品集创建失败');
    }
  };

  // 更新作品集
  const handleUpdate = async (values: any) => {
    if (!selectedPortfolio) return;

    try {
      await http.patch(`/portfolios/${selectedPortfolio.id}`, values);
      message.success('作品集更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      fetchPortfolios();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '作品集更新失败');
    }
  };

  // 删除作品集
  const deletePortfolio = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个作品集吗？',
      onOk: async () => {
        try {
          await http.delete(`/portfolios/${id}`);
          message.success('删除成功');
          fetchPortfolios();
          fetchStats();
        } catch (error: any) {
          message.error(error?.response?.data?.message || '删除失败');
        }
      },
    });
  };

  // 查看作品集详情
  const viewPortfolioDetail = async (portfolio: Portfolio) => {
    try {
      const { data } = await http.get(`/portfolios/${portfolio.id}`);
      setSelectedPortfolio(data);
      setViewModalVisible(true);
    } catch (error) {
      message.error('获取作品集详情失败');
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      ACTIVE: { color: 'green', text: '已发布' },
      DRAFT: { color: 'orange', text: '草稿' },
      ARCHIVED: { color: 'gray', text: '已归档' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取类型标签
  const getTypeTag = (type: string) => {
    const typeMap: { [key: string]: { color: string; text: string } } = {
      VIDEO: { color: 'purple', text: '视频' },
      DESIGN: { color: 'cyan', text: '设计' },
      H5: { color: 'blue', text: 'H5' },
      ANIMATION: { color: 'orange', text: '动画' },
      AUDIO: { color: 'green', text: '音频' },
      PHOTO: { color: 'pink', text: '摄影' },
      OTHER: { color: 'default', text: '其他' },
    };
    const config = typeMap[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    listType: 'picture-card',
    showUploadList: false,
    beforeUpload: async (file: any) => {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const { data } = await http.post('/upload/portfolio', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        editForm.setFieldsValue({ url: data.url });
        if (file.type.startsWith('image/')) {
          editForm.setFieldsValue({ thumbnail: data.url });
        }
        message.success('文件上传成功');
      } catch (error) {
        message.error('文件上传失败');
      }
      return false;
    },
  };

  const columns: ColumnsType<Portfolio> = [
    {
      title: '作品信息',
      key: 'portfolioInfo',
      width: 300,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 80, height: 60, borderRadius: 6, overflow: 'hidden' }}>
            {record.thumbnail ? (
              <Image
                src={record.thumbnail}
                alt={record.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                preview={false}
              />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                background: '#f5f5f5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <FileImageOutlined style={{ fontSize: 24, color: '#ccc' }} />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
              {record.title}
            </Title>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              {getTypeTag(record.type)}
              {getStatusTag(record.status)}
            </div>
            <Text type="secondary" ellipsis={{ tooltip: record.description}}>
              {record.description}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '创作者',
      key: 'user',
      width: 120,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={record.user.avatar} icon={<UserOutlined />} size="small" />
          <Text strong>{record.user.username}</Text>
        </div>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <div>
          {tags && tags.length > 0 ? (
            <Space wrap>
              {tags.slice(0, 3).map(tag => (
                <Tag key={tag} color="blue">{tag}</Tag>
              ))}
              {tags.length > 3 && (
                <Tag color="default">+{tags.length - 3}</Tag>
              )}
            </Space>
          ) : (
            <Text type="secondary">无标签</Text>
          )}
        </div>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
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
          {(user?.role === 'ADMIN' || record.user.id === user?.id) && (
            <>
              <Tooltip title="编辑">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setSelectedPortfolio(record);
                    editForm.setFieldsValue({
                      title: record.title,
                      description: record.description,
                      type: record.type,
                      url: record.url,
                      thumbnail: record.thumbnail,
                      tags: record.tags,
                      status: record.status,
                    });
                    setEditModalVisible(true);
                  }}
                />
              </Tooltip>
              <Tooltip title="删除">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deletePortfolio(record.id)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  if (user?.role !== 'CREATOR' && user?.role !== 'DESIGNER' && user?.role !== 'ADMIN') {
    return <div>您没有权限访问此页面</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>作品集管理</Title>
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
                title="已发布"
                value={stats.byStatus?.ACTIVE || 0}
                prefix={<FileImageOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="草稿"
                value={stats.byStatus?.DRAFT || 0}
                prefix={<FileImageOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已归档"
                value={stats.byStatus?.ARCHIVED || 0}
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
              placeholder="选择类型"
              style={{ width: '100%' }}
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
              allowClear
            >
              <Option value="VIDEO">视频</Option>
              <Option value="DESIGN">设计</Option>
              <Option value="H5">H5</Option>
              <Option value="ANIMATION">动画</Option>
              <Option value="AUDIO">音频</Option>
              <Option value="PHOTO">摄影</Option>
              <Option value="OTHER">其他</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="选择状态"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              allowClear
            >
              <Option value="ACTIVE">已发布</Option>
              <Option value="DRAFT">草稿</Option>
              <Option value="ARCHIVED">已归档</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={12}>
            <Input
              placeholder="搜索作品标题或描述..."
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
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
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
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
                  <Title level={4} style={{ margin: 0 }}>{selectedPortfolio.title}</Title>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {getTypeTag(selectedPortfolio.type)}
                    {getStatusTag(selectedPortfolio.status)}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <Text strong>创作者：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar src={selectedPortfolio.user.avatar} icon={<UserOutlined />} />
                    <div>
                      <Text strong>{selectedPortfolio.user.username}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {selectedPortfolio.user.role === 'ADVERTISER' ? '广告商' : '创作者'}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
            
            <Text strong>作品描述：</Text>
            <div style={{ marginTop: 8, marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <Text>{selectedPortfolio.description}</Text>
            </div>

            <Text strong>作品预览：</Text>
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              {selectedPortfolio.thumbnail ? (
                <Image
                  src={selectedPortfolio.thumbnail}
                  alt={selectedPortfolio.title}
                  style={{ maxWidth: '100%', borderRadius: 6 }}
                />
              ) : (
                <div style={{ 
                  padding: 40, 
                  background: '#f5f5f5', 
                  borderRadius: 6, 
                  textAlign: 'center',
                  color: '#999'
                }}>
                  暂无预览图
                </div>
              )}
            </div>

            {selectedPortfolio.tags && selectedPortfolio.tags.length > 0 && (
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
            )}

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">
                    发布时间: {new Date(selectedPortfolio.createdAt).toLocaleString()}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">
                    更新时间: {new Date(selectedPortfolio.updatedAt).toLocaleString()}
                  </Text>
                </Col>
              </Row>
              <div style={{ marginTop: 8 }}>
                <Button 
                  type="link" 
                  href={selectedPortfolio.url} 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看完整作品 →
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑作品集模态框 */}
      <Modal
        title={selectedPortfolio ? '编辑作品集' : '创建作品集'}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={selectedPortfolio ? handleUpdate : handleCreate}
        >
          <Form.Item
            name="title"
            label="作品标题"
            rules={[{ required: true, message: '请输入作品标题' }]}
          >
            <Input placeholder="请输入作品标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="作品描述"
          >
            <TextArea rows={4} placeholder="请输入作品描述" />
          </Form.Item>

          <Form.Item
            name="type"
            label="作品类型"
            rules={[{ required: true, message: '请选择作品类型' }]}
          >
            <Select placeholder="请选择作品类型">
              <Option value="VIDEO">视频</Option>
              <Option value="DESIGN">设计</Option>
              <Option value="H5">H5</Option>
              <Option value="ANIMATION">动画</Option>
              <Option value="AUDIO">音频</Option>
              <Option value="PHOTO">摄影</Option>
              <Option value="OTHER">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="url"
            label="作品链接"
            rules={[{ required: true, message: '请输入作品链接' }]}
          >
            <Input placeholder="请输入作品链接或上传文件" />
          </Form.Item>

          <Form.Item
            name="thumbnail"
            label="缩略图"
          >
            <Input placeholder="请输入缩略图链接" />
          </Form.Item>

          <Form.Item label="文件上传">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>上传文件</Button>
            </Upload>
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              支持图片、视频、音频等格式，上传后会自动填入链接
            </div>
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="输入标签后按回车"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
          >
            <Select>
              <Option value="ACTIVE">已发布</Option>
              <Option value="DRAFT">草稿</Option>
              <Option value="ARCHIVED">已归档</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedPortfolio ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
              }}>
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
