import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, InputNumber, message, List, Avatar, Drawer, Card, Typography, Upload } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import http from '../store/api/http';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const OrderManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [form] = Form.useForm();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ status?: string; type?: string; keyword?: string }>({});
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [appModalOrder, setAppModalOrder] = useState<any | null>(null);
  const [viewVisible, setViewVisible] = useState(false);
  const [viewOrder, setViewOrder] = useState<any | null>(null);
  const [deliverFiles, setDeliverFiles] = useState<any[]>([]);
  const [submittingDeliver, setSubmittingDeliver] = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/orders', {
        params: {
          status: filters.status,
          type: filters.type,
          keyword: filters.keyword,
          // 广告主查看全部
          mine: user?.role === 'ADVERTISER' ? false : undefined,
        },
      });
      let list = data.data || [];
      // 设计者/创作者：仅展示委派给自己的订单（我的订单）
      if ((user?.role === 'CREATOR' || user?.role === 'DESIGNER') && user?.id) {
        list = list.filter((o: any) => o.designer?.id === user.id);
      }
      setOrders(list);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '获取订单失败');
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 根据 URL 参数自动打开“申请/委派”抽屉
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('openApplicationsFor');
    if (!orderId) return;
    const order = orders.find(o => o.id === orderId);
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
    cleaned.delete('openApplicationsFor');
    if (cleaned.toString() !== location.search.replace(/^\?/, '')) {
      navigate({ pathname: '/orders', search: cleaned.toString() ? `?${cleaned.toString()}` : '' }, { replace: true });
    }
  }, [orders, appModalVisible, appModalOrder, location.search, fetchOrders, navigate]);

  // 根据 URL 参数自动打开订单详情 Drawer 及交付物列表
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openOrderId = params.get('openOrder');
    const showDeliverables = params.get('showDeliverables');
    if (!openOrderId) return;
    const order = orders.find(o => o.id === openOrderId);
    if (!order) return;
    if (!viewVisible || viewOrder?.id !== order.id) {
      // 确保数据刷新
      fetchOrders();
      handleView(order);
    }
    if (showDeliverables === '1') {
      // 打开交付物列表
      (async () => {
        try {
          const { data } = await http.get(`/orders/${order.id}/deliverables`);
          Modal.info({
            title: '交付物列表',
            width: 700,
            content: (
              <List
                dataSource={data || []}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar src={item.user?.avatar} />}
                      title={<a href={item.url} target="_blank" rel="noreferrer">{item.title || item.url}</a>}
                      description={item.description || item.type}
                    />
                    <div>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                  </List.Item>
                )}
                locale={{ emptyText: '暂无交付物' }}
              />
            ),
          });
        } catch {}
      })();
    }
    // 清理参数，防止重复弹出
    const cleaned = new URLSearchParams(location.search);
    cleaned.delete('openOrder');
    cleaned.delete('showDeliverables');
    if (cleaned.toString() !== location.search.replace(/^\?/, '')) {
      navigate({ pathname: '/orders', search: cleaned.toString() ? `?${cleaned.toString()}` : '' }, { replace: true });
    }
  }, [orders, viewVisible, viewOrder, location.search, fetchOrders, navigate]);

  // Tag helpers（与广场页风格一致）
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

  const getPriorityTag = (priority: string) => {
    const priorityMap: { [key: string]: { color: string; text: string } } = {
      LOW: { color: 'green', text: '低' },
      MEDIUM: { color: 'blue', text: '中' },
      HIGH: { color: 'orange', text: '高' },
      URGENT: { color: 'red', text: '紧急' },
    };
    const config = priorityMap[priority] || { color: 'default', text: priority };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '订单ID',
      dataIndex: 'id',
      key: 'id',
    },
    // 广告主查看申请数
    {
      title: '申请数',
      key: 'applications',
      render: (_: any, record: any) => (record._count.applications ?? '-'),
    },
    {
      title: '订单标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '客户',
      key: 'customer',
      render: (_: any, record: any) => record.customer?.username || '-',
    },
    {
      title: '设计师',
      key: 'designer',
      render: (_: any, record: any) => record.designer?.username || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: { [key: string]: { text: string; color: string } } = {
          VIDEO: { text: '视频', color: 'blue' },
          DESIGN: { text: '设计', color: 'green' },
          H5: { text: 'H5', color: 'orange' },
          ANIMATION: { text: '动画', color: 'purple' },
          AUDIO: { text: '音频', color: 'cyan' },
          OTHER: { text: '其他', color: 'default' },
        };
        const typeInfo = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount}`,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => {
        const priorityMap: { [key: string]: { text: string; color: string } } = {
          HIGH: { text: '高', color: 'red' },
          MEDIUM: { text: '中', color: 'orange' },
          LOW: { text: '低', color: 'green' },
        };
        const priorityInfo = priorityMap[priority] || { text: priority, color: 'default' };
        return <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: { [key: string]: { text: string; color: string } } = {
          PENDING: { text: '待处理', color: 'orange' },
          IN_PROGRESS: { text: '进行中', color: 'blue' },
          COMPLETED: { text: '已完成', color: 'green' },
          CANCELLED: { text: '已取消', color: 'red' },
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {/* 广告主：查看申请并委派 */}
          {user?.role === 'ADVERTISER' && record.status === 'PENDING' && (
            <Button type="link" onClick={() => openApplications(record)}>
              申请/委派
            </Button>
          )}
          {/* 广告主取消：已取消状态时不显示 */}
          {!(record.status === 'CANCELLED') && (
            <Button type="link" danger icon={<CloseOutlined />} onClick={() => handleCancelOrder(record.id)}>
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingOrder(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (order: any) => {
    
    setEditingOrder(order);
    form.setFieldsValue({
      title: order.title,
      customer: order.customer.username ?? '-',
      designer: order.designer.username ?? '-',
      amount: order.amount,
      type: order.type,
      priority: order.priority,
      deadline: order.deadline ? dayjs(order.deadline) : null,
    });
    setIsModalVisible(true);
  };

  const handleView = (order: any) => {
    setViewOrder(order);
    setViewVisible(true);
  };
  

  const handleCancelOrder = async (id: string) => {
    try {
      await http.post(`/orders/${id}/cancel`);
      message.success('订单已取消');
      fetchOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '取消失败');
    }
  };

  const handleModalOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editingOrder) {
          await http.patch(`/orders/${editingOrder.id}`, {
            title: values.title,
            amount: values.amount,
            type: values.type,
            priority: values.priority,
            deadline: values.deadline ? (values.deadline as any).toISOString() : undefined,
          });
          message.success('订单更新成功');
        } else {
          await http.post('/orders', {
            title: values.title,
            amount: values.amount,
            type: values.type,
            priority: values.priority,
            deadline: values.deadline ? (values.deadline as any).toISOString() : undefined,
          });
          message.success('订单添加成功');
        }
        setIsModalVisible(false);
        form.resetFields();
        fetchOrders();
      } catch (e: any) {
        message.error(e?.response?.data?.message || '操作失败');
      }
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 打开申请列表并进行委派
  const openApplications = (order: any) => {
    setAppModalOrder(order);
    setAppModalVisible(true);
  };

  const handleAccept = async (orderId: string, applicationId: string) => {
    try {
      await http.post(`/orders/${orderId}/accept/${applicationId}`);
      message.success('已委派给该创作者');
      setAppModalVisible(false);
      setAppModalOrder(null);
      fetchOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '委派失败');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">订单管理</h1>
        <p style={{ margin: 0, color: '#666' }}>管理广告订单的审核、录入和完成状态</p>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <div>
            <div style={{ marginBottom: 4, color: '#999' }}>关键词</div>
            <Input style={{ width: 240 }} value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
          </div>
          <div>
            <div style={{ marginBottom: 4, color: '#999' }}>状态</div>
            <Select style={{ width: 160 }} allowClear value={filters.status}
              onChange={(v) => setFilters({ ...filters, status: v })}>
              <Select.Option value="PENDING">待处理</Select.Option>
              <Select.Option value="IN_PROGRESS">进行中</Select.Option>
              <Select.Option value="COMPLETED">已完成</Select.Option>
              <Select.Option value="CANCELLED">已取消</Select.Option>
            </Select>
          </div>
          <div>
            <div style={{ marginBottom: 4, color: '#999' }}>类型</div>
            <Select style={{ width: 160 }} allowClear value={filters.type}
              onChange={(v) => setFilters({ ...filters, type: v })}>
              <Select.Option value="VIDEO">视频</Select.Option>
              <Select.Option value="DESIGN">设计</Select.Option>
              <Select.Option value="H5">H5</Select.Option>
              <Select.Option value="ANIMATION">动画</Select.Option>
              <Select.Option value="AUDIO">音频</Select.Option>
              <Select.Option value="OTHER">其他</Select.Option>
            </Select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <Button type="primary" onClick={fetchOrders}>查询</Button>
          </div>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加订单
        </Button>
      </div>

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
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      {/* 查看详情 - 卡片化布局 */}
      <Drawer
        title={viewOrder ? `订单详情：${viewOrder.title}` : '订单详情'}
        open={viewVisible}
        onClose={() => setViewVisible(false)}
        width={720}
      >
        {viewOrder && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{viewOrder.title}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {getTypeTag(viewOrder.type)}
                    {getPriorityTag(viewOrder.priority)}
                    <Tag color="blue">金额 ¥{Number(viewOrder.amount || 0).toFixed(2)}</Tag>
                    {viewOrder.budget ? (<Tag color="geekblue">预算 ¥{Number(viewOrder.budget).toFixed(2)}</Tag>) : null}
                    <Tag color={viewOrder.status === 'PENDING' ? 'orange' : viewOrder.status === 'IN_PROGRESS' ? 'blue' : viewOrder.status === 'COMPLETED' ? 'green' : 'red'}>
                      {viewOrder.status}
                    </Tag>
                    {viewOrder.deadline && (
                      <Tag>{dayjs(viewOrder.deadline).format('MM-DD HH:mm')}</Tag>
                    )}
                    <Tag>申请数 {viewOrder._count?.applications ?? 0}</Tag>
                  </div>
                </div>
                {user?.role === 'ADVERTISER' && viewOrder.status === 'PENDING' && (
                  <Button type="primary" onClick={() => openApplications(viewOrder)}>申请/委派</Button>
                )}
                {user?.role !== 'ADVERTISER' && viewOrder.status === 'IN_PROGRESS' && viewOrder.designer?.id === user?.id && (
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
                          // 这里演示用：需替换为实际上传接口，当前仅提交本地名称与占位URL
                          const files = deliverFiles.map((f: any) => ({ url: f.url || f.response?.url || f.name, title: f.name }));
                          await http.post(`/orders/${viewOrder.id}/deliverables`, { files });
                          message.success('交付物已提交');
                          setDeliverFiles([]);
                        } catch (e: any) {
                          message.error(e?.response?.data?.message || '提交失败');
                        } finally {
                          setSubmittingDeliver(false);
                        }
                      }}
                    >
                      提交交付物
                    </Button>
                  </Space>
                )}
              </div>
            </Card>

            <Card title="参与者">
              <Space size={24}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar src={viewOrder.customer?.avatar} />
                  <div>
                    <div style={{ fontWeight: 600 }}>广告主</div>
                    <div>{viewOrder.customer?.username || '-'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar src={viewOrder.designer?.avatar} />
                  <div>
                    <div style={{ fontWeight: 600 }}>设计师</div>
                    <div>{viewOrder.designer?.username || '-'}</div>
                  </div>
                </div>
              </Space>
            </Card>

            {(viewOrder.description || viewOrder.contentRequirements) && (
              <Card title="说明">
                {viewOrder.description && (
                  <div style={{ marginBottom: 8 }}>
                    <Typography.Text type="secondary">描述：</Typography.Text>
                    <div>{viewOrder.description}</div>
                  </div>
                )}
                {viewOrder.contentRequirements && (
                  <div>
                    <Typography.Text type="secondary">内容要求：</Typography.Text>
                    <div>{viewOrder.contentRequirements}</div>
                  </div>
                )}
              </Card>
            )}

            {(() => {
              const tags = Array.isArray(viewOrder.tags)
                ? viewOrder.tags
                : (typeof viewOrder.tags === 'string' ? viewOrder.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
              if (!tags.length) return null;
              return (
                <Card title="标签">
                  <Space wrap>
                    {tags.map((t: string) => (
                      <Tag key={t} color="blue">{t}</Tag>
                    ))}
                  </Space>
                </Card>
              );
            })()}

            {/* 交付物列表与确认收货 */}
            <Card title="交付物">
              <Button
                size="small"
                onClick={async () => {
                  if (!viewOrder) return;
                  try {
                    const { data } = await http.get(`/orders/${viewOrder.id}/deliverables`);
                    Modal.info({
                      title: '交付物列表',
                      width: 700,
                      content: (
                        <List
                          dataSource={data || []}
                          renderItem={(item: any) => (
                            <List.Item>
                              <List.Item.Meta
                                avatar={<Avatar src={item.user?.avatar} />}
                                title={<a href={item.url} target="_blank" rel="noreferrer">{item.title || item.url}</a>}
                                description={item.description || item.type}
                              />
                              <div>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                            </List.Item>
                          )}
                          locale={{ emptyText: '暂无交付物' }}
                        />
                      ),
                    });
                  } catch (e: any) {
                    message.error(e?.response?.data?.message || '获取交付物失败');
                  }
                }}
              >
                查看交付物
              </Button>

              {user?.role === 'ADVERTISER' && viewOrder.status === 'IN_PROGRESS' && (
                <Button
                  type="primary"
                  style={{ marginLeft: 12 }}
                  onClick={async () => {
                    try {
                      await http.post(`/orders/${viewOrder.id}/confirm-receipt`);
                      message.success('已确认收货并放款');
                      setViewVisible(false);
                      fetchOrders();
                    } catch (e: any) {
                      message.error(e?.response?.data?.message || '操作失败');
                    }
                  }}
                >
                  确认收货并放款
                </Button>
              )}
            </Card>
          </Space>
        )}
      </Drawer>

      <Modal
        title={editingOrder ? '编辑订单' : '添加订单'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{}}
        >
          <Form.Item
            name="title"
            label="订单标题"
            rules={[{ required: true, message: '请输入订单标题' }]}
          >
            <Input placeholder="请输入订单标题" />
          </Form.Item>

          <Form.Item
            name="customer"
            label="客户"
            rules={[{ required: true, message: '请输入客户名称' }]}
          >
            <Input placeholder="请输入客户名称" />
          </Form.Item>

          <Form.Item
            name="designer"
            label="设计师"
            rules={[{ required: true, message: '请输入设计师名称' }]}
          >
            <Input placeholder="请输入设计师名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="订单类型"
            rules={[{ required: true, message: '请选择订单类型' }]}
          >
            <Select placeholder="请选择订单类型">
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
            rules={[{ required: true, message: '请输入订单金额' }]}
          >
            <InputNumber
              placeholder="请输入订单金额"
              style={{ width: '100%' }}
              min={0}
              formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="请选择优先级">
              <Select.Option value="HIGH">高</Select.Option>
              <Select.Option value="MEDIUM">中</Select.Option>
              <Select.Option value="LOW">低</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="deadline"
            label="截止日期"
            // rules={[{ required: true, message: '请选择截止日期' }]}
          >
            <DatePicker style={{ width: '100%' }} showTime />
          </Form.Item>
        </Form>
      </Modal>

      {/* 申请列表与委派 */}
      <Modal
        title="申请列表"
        open={appModalVisible}
        onCancel={() => { setAppModalVisible(false); setAppModalOrder(null); }}
        footer={null}
        width={600}
      >
        {appModalOrder && (
          <List
            dataSource={appModalOrder.applications || []}
            renderItem={(app: any) => (
              <List.Item
                actions={[
                  <Button
                    key="accept"
                    type="primary"
                    onClick={() => handleAccept(appModalOrder.id, app.id)}
                  >
                    委派
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar src={app.user?.avatar} />}
                  title={app.user?.username || app.userId}
                  description={app.message}
                />
              </List.Item>
            )}
            locale={{ emptyText: '暂无申请' }}
          />
        )}
      </Modal>
    </div>
  );
};

export default OrderManagement;
