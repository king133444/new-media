import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Rate,
  Space,
  Tag,
  message,
  Row,
  Col,
  Typography,
  Avatar,
  Tooltip,
  Empty,
  Select,
  Statistic,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  StarOutlined,
  MessageOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import http from '../store/api/http';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Review {
  id: string;
  rating: number;
  content: string;
  reply: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    title: string;
    type: string;
  };
  reviewer: {
    id: string;
    username: string;
    avatar: string;
    role: string;
  };
  reviewee: {
    id: string;
    username: string;
    avatar: string;
    role: string;
  };
}

const ReviewManagement: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    type: 'all', // all, given, received
  });

  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useSelector((state: RootState) => state.auth);

  // 获取评价列表
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);

      const { data } = await http.get(`/reviews?${params.toString()}`);
      let filteredReviews = data.data || [];

      // 根据类型过滤评价
      if (filters.type === 'given') {
        filteredReviews = filteredReviews.filter((review: Review) => review.reviewer.id === user?.id);
      } else if (filters.type === 'received') {
        filteredReviews = filteredReviews.filter((review: Review) => review.reviewee.id === user?.id);
      }

      setReviews(filteredReviews);
    } catch (error) {
      message.error('获取评价列表失败');
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await http.get('/reviews/stats');
      setStats(data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [fetchReviews, fetchStats]);

  // 处理从铃铛过来的“去评价”入口：根据订单定位待评价记录并打开编辑弹窗
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('openReviewForOrder');
    if (!orderId) return;
    const open = () => {
      const target = reviews.find(r => r.order.id === orderId && (r.status === 'PENDING' || !r.rating));
      if (target) {
        setSelectedReview(target);
        // 初始化表单为空评分与空内容，避免“关不掉”循环：仅打开一次后清参数
        editForm.setFieldsValue({ rating: target.rating || undefined, content: target.content || '' });
        setEditModalVisible(true);
        const cleaned = new URLSearchParams(location.search);
        cleaned.delete('openReviewForOrder');
        navigate({ pathname: '/reviews', search: cleaned.toString() ? `?${cleaned.toString()}` : '' }, { replace: true });
      }
    };
    // 若列表尚未加载完，延时尝试一次
    const t = setTimeout(open, 50);
    return () => clearTimeout(t);
  }, [location.search, reviews, editForm, navigate]);

  // （移除未使用的单独状态更新方法，状态更新通过编辑表单一并提交）

  // 删除评价
  const deleteReview = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个评价吗？',
      onOk: async () => {
        try {
          await http.delete(`/reviews/${id}`);
          message.success('删除成功');
          fetchReviews();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 编辑评价
  const handleEditReview = async (values: any) => {
    if (!selectedReview) return;

    try {
      await http.patch(`/reviews/${selectedReview.id}`, values);
      message.success('评价更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      fetchReviews();
    } catch (error) {
      message.error('评价更新失败');
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      PENDING: { color: 'orange', text: '待审核' },
      APPROVED: { color: 'green', text: '已通过' },
      REJECTED: { color: 'red', text: '已拒绝' },
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
      OTHER: { color: 'default', text: '其他' },
    };
    const config = typeMap[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<Review> = [
    {
      title: '评价信息',
      key: 'reviewInfo',
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: 8 }}>
            <Rate disabled value={record.rating} style={{ fontSize: 14 }} />
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {record.rating} 分
            </Text>
          </div>
          <Text ellipsis={{ tooltip: record.content}}>
            {record.content}
          </Text>
        </div>
      ),
    },
    {
      title: '关联订单',
      key: 'order',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{record.order.title}</Text>
          <div style={{ marginTop: 4 }}>
            {getTypeTag(record.order.type)}
          </div>
        </div>
      ),
    },
    {
      title: '评价者',
      key: 'reviewer',
      width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={record.reviewer.avatar} icon={<UserOutlined />} size="small" />
          <div>
            <Text strong>{record.reviewer.username}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.reviewer.role === 'ADVERTISER' ? '广告主' : '创作者'}
              </Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '被评价者',
      key: 'reviewee',
      width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={record.reviewee.avatar} icon={<UserOutlined />} size="small" />
          <div>
            <Text strong>{record.reviewee.username}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.reviewee.role === 'ADVERTISER' ? '广告主' : '创作者'}
              </Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '评价时间',
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
              onClick={() => {
                setSelectedReview(record);
                setViewModalVisible(true);
              }}
            />
          </Tooltip>
          {(user?.role === 'ADMIN' || record.reviewer.id === user?.id) && (
            <Tooltip title="编辑">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedReview(record);
                  editForm.setFieldsValue({
                    rating: record.rating,
                    content: record.content,
                    reply: record.reply,
                    status: record.status,
                  });
                  setEditModalVisible(true);
                }}
              />
            </Tooltip>
          )}
          {user?.role === 'ADMIN' && (
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => deleteReview(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>评价管理</Title>
      
      {/* 统计信息 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总评价数"
                value={stats.totalReviews}
                prefix={<StarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均评分"
                value={stats.averageRating}
                precision={1}
                prefix={<StarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待审核"
                value={stats.pendingReviews}
                prefix={<MessageOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="我的评价"
                value={stats.myReviews}
                prefix={<UserOutlined />}
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
            >
              <Option value="all">全部评价</Option>
              <Option value="given">我给出的评价</Option>
              <Option value="received">我收到的评价</Option>
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
              <Option value="PENDING">待审核</Option>
              <Option value="APPROVED">已通过</Option>
              <Option value="REJECTED">已拒绝</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 评价列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={reviews}
          loading={loading}
          rowKey="id"
          pagination={{
            total: reviews.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          locale={{ emptyText: <Empty description="暂无评价" /> }}
        />
      </Card>

      {/* 评价详情模态框 */}
      <Modal
        title="评价详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedReview && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>评分：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <Rate disabled value={selectedReview.rating} />
                  <Text style={{ marginLeft: 8, fontSize: 16 }}>{selectedReview.rating} 分</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text strong>状态：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  {getStatusTag(selectedReview.status)}
                </div>
              </Col>
            </Row>

            <Text strong>评价内容：</Text>
            <div style={{ marginTop: 8, marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <Text>{selectedReview.content}</Text>
            </div>

            {selectedReview.reply && (
              <>
                <Text strong>回复内容：</Text>
                <div style={{ marginTop: 8, marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 6 }}>
                  <Text>{selectedReview.reply}</Text>
                </div>
              </>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>评价者：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar src={selectedReview.reviewer.avatar} icon={<UserOutlined />} />
                    <div>
                      <Text strong>{selectedReview.reviewer.username}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {selectedReview.reviewer.role === 'ADVERTISER' ? '广告主' : '创作者'}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <Text strong>被评价者：</Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar src={selectedReview.reviewee.avatar} icon={<UserOutlined />} />
                    <div>
                      <Text strong>{selectedReview.reviewee.username}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {selectedReview.reviewee.role === 'ADVERTISER' ? '广告主' : '创作者'}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            <Text strong>关联订单：</Text>
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              <Text>{selectedReview.order.title}</Text>
              <div style={{ marginTop: 4 }}>
                {getTypeTag(selectedReview.order.type)}
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Text type="secondary">
                评价时间: {new Date(selectedReview.createdAt).toLocaleString()}
              </Text>
              {selectedReview.updatedAt !== selectedReview.createdAt && (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">
                    更新时间: {new Date(selectedReview.updatedAt).toLocaleString()}
                  </Text>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑评价模态框 */}
      <Modal
        title="编辑评价"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditReview}
        >
          <Form.Item
            name="rating"
            label="评分"
            rules={[{ required: true, message: '请选择评分' }]}
          >
            <Rate />
          </Form.Item>

          <Form.Item
            name="comment"
            label="评价内容"
            rules={[{ required: true, message: '请输入评价内容' }]}
          >
            <TextArea rows={4} placeholder="请输入评价内容" />
          </Form.Item>

          {/* <Form.Item
            name="reply"
            label="回复内容"
          >
            <TextArea rows={3} placeholder="请输入回复内容（可选）" />
          </Form.Item> */}

          {user?.role === 'ADMIN' && (
            <Form.Item
              name="status"
              label="状态"
            >
              <Select>
                <Option value="PENDING">待审核</Option>
                <Option value="APPROVED">已通过</Option>
                <Option value="REJECTED">已拒绝</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
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

export default ReviewManagement;