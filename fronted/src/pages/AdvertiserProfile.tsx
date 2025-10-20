import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  Select,
  Switch,
  Tag,
  Space,
  Divider,
  Row,
  Col,
  Statistic,
  Table,
  message,
  Modal,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import http, { resolveFileUrl } from '../store/api/http';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface AdvertiserProfileData {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  contact?: string;
  company?: string;
  industry?: string;
  tags: string[];
  isVerified: boolean;
  walletBalance: number;
  paymentAccount?: any;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalOrders: number;
  totalAmount: number;
  walletBalance: number;
  orderStats: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  transactionStats: Array<{
    type: string;
    status: string;
    count: number;
    amount: number;
  }>;
}

const AdvertiserProfile: React.FC = () => {
  const [form] = Form.useForm();
  const [, setLoading] = useState(false);
  const [profile, setProfile] = useState<AdvertiserProfileData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [bindAccountModalVisible, setBindAccountModalVisible] = useState(false);
  const [paymentAccount, setPaymentAccount] = useState<any>(null);

  const { user } = useSelector((state: RootState) => state.auth);

  // 获取个人资料
  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await http.get('/advertisers/profile');
      setProfile(data);
      setTags(data.tags || []);
      if (data) {
        form.setFieldsValue({
          ...data,
          tags: data.tags || [],
        });
      }
    } catch (error: any) {
      console.log(error);
      message.error(error?.response?.data?.message || '获取个人资料失败');
    }
  }, [form]);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await http.get('/advertisers/stats');
      setStats(data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  // 获取钱包信息
  const fetchWalletInfo = useCallback(async () => {
    try {
      const { data } = await http.get('/advertisers/wallet');
      setPaymentAccount(data.paymentAccount);
    } catch (error) {
      console.error('获取钱包信息失败:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADVERTISER') {
      fetchProfile();
      fetchStats();
      fetchWalletInfo();
    }
  }, [user, fetchProfile, fetchStats, fetchWalletInfo]);

  // 更新个人资料
  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      await http.put('/advertisers/profile', values);
      message.success('个人资料更新成功');
      fetchProfile();
      fetchStats();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加标签
  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  // 删除标签
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // 头像上传（materials 接口）
  const uploadProps: UploadProps = {
    name: 'file',
    listType: 'picture-card',
    showUploadList: false,
    beforeUpload: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
    try {
      const { data } = await http.post('/materials/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      form.setFieldsValue({ avatar: data.url });
      message.success('头像上传成功');
    } catch (error) {
      message.error('头像上传失败');
    }
      return false;
    },
  };

  // 绑定收款账户
  const handleBindAccount = async (values: any) => {
    try {
      await http.post('/advertisers/wallet/bind-account', values);
      message.success('收款账户绑定成功');
      setBindAccountModalVisible(false);
      fetchWalletInfo();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '绑定失败');
    }
  };

  const transactionColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: { [key: string]: string } = {
          DEPOSIT: '充值',
          WITHDRAWAL: '提现',
          PAYMENT: '支付',
          REFUND: '退款',
          COMMISSION: '佣金',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: any) => (
        <span style={{ color: record.type === 'DEPOSIT' ? '#52c41a' : '#ff4d4f' }}>
          {record.type === 'DEPOSIT' ? '+' : '-'}{amount.toFixed(2)}元
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: { [key: string]: { text: string; color: string } } = {
          PENDING: { text: '已发布', color: 'orange' },
          COMPLETED: { text: '已完成', color: 'green' },
          FAILED: { text: '失败', color: 'red' },
          CANCELLED: { text: '已取消', color: 'gray' },
        };
        const config = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  if (user?.role !== 'ADVERTISER') {
    return <div>您没有权限访问此页面</div>;
  }

  return (
    <div>
      <Title level={2}>广告商个人中心</Title>
      
      <Row gutter={[16, 16]}>
        {/* 统计卡片 */}
        <Col span={24}>
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总订单数"
                  value={stats?.totalOrders || 0}
                  prefix={<ShoppingCartOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总交易金额"
                  value={stats?.totalAmount || 0}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="元"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="钱包余额"
                  value={profile?.walletBalance || 0}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="元"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="认证状态"
                  value={profile?.isVerified ? '已认证' : '未认证'}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </Col>

        {/* 个人资料编辑 */}
        <Col span={16}>
          <Card title="个人资料管理" extra={
            <Button type="primary" onClick={() => form.submit()}>
              保存修改
            </Button>
          }>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateProfile}
              initialValues={profile ?? undefined}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: '请输入邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' }
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="company" label="公司名称">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="industry" label="所属行业">
                    <Select placeholder="请选择行业">
                      <Option value="互联网">互联网</Option>
                      <Option value="电商">电商</Option>
                      <Option value="教育">教育</Option>
                      <Option value="金融">金融</Option>
                      <Option value="医疗">医疗</Option>
                      <Option value="游戏">游戏</Option>
                      <Option value="其他">其他</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="contact" label="联系方式">
                <Input placeholder="请输入联系方式" />
              </Form.Item>

              <Form.Item name="bio" label="个人简介">
                <TextArea rows={4} placeholder="请输入个人简介" />
              </Form.Item>

              <Form.Item label="头像">
                <Upload {...uploadProps}>
                  {profile?.avatar ? (
                    <img src={resolveFileUrl(profile.avatar)} alt="avatar" style={{ width: '100%' }} />
                  ) : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>上传头像</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item label="个人标签">
                <Space wrap>
                  {tags.map(tag => (
                    <Tag
                      key={tag}
                      closable
                      onClose={() => removeTag(tag)}
                      color="blue"
                    >
                      {tag}
                    </Tag>
                  ))}
                  <Input
                    style={{ width: 100 }}
                    placeholder="添加标签"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onPressEnter={addTag}
                  />
                  <Button size="small" onClick={addTag}>
                    添加
                  </Button>
                </Space>
              </Form.Item>

              <Form.Item name="isVerified" label="认证状态" valuePropName="checked">
                <Switch disabled />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 钱包管理 */}
        <Col span={8}>
          <Card 
            title="钱包管理" 
            extra={
              <Button 
                type="link" 
                onClick={() => setBindAccountModalVisible(true)}
              >
                绑定收款账户
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>当前余额：</Text>
                <Text style={{ fontSize: 18, color: '#1890ff' }}>
                  ¥{profile?.walletBalance?.toFixed(2) || '0.00'}
                </Text>
              </div>
              
              {paymentAccount && (
                <div>
                  <Text strong>收款账户：</Text>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      {paymentAccount.type === 'alipay' ? '支付宝' : '微信'}
                    </Text>
                    <br />
                    <Text>{paymentAccount.account}</Text>
                  </div>
                </div>
              )}

              <Divider />
              
              <Button type="primary" block>
                充值
              </Button>
              <Button block>
                提现
              </Button>
            </Space>
          </Card>

          {/* 最近交易记录 */}
          <Card title="最近交易" style={{ marginTop: 16 }}>
            <Table
              size="small"
              columns={transactionColumns}
              dataSource={[]}
              pagination={false}
              locale={{ emptyText: '暂无交易记录' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 绑定收款账户模态框 */}
      <Modal
        title="绑定收款账户"
        open={bindAccountModalVisible}
        onCancel={() => setBindAccountModalVisible(false)}
        footer={null}
      >
        <Form onFinish={handleBindAccount} layout="vertical">
          <Form.Item
            name="type"
            label="账户类型"
            rules={[{ required: true, message: '请选择账户类型' }]}
          >
            <Select>
              <Option value="alipay">支付宝</Option>
              <Option value="wechat">微信</Option>
              <Option value="bank">银行卡</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="account"
            label="账户号码"
            rules={[{ required: true, message: '请输入账户号码' }]}
          >
            <Input placeholder="请输入账户号码" />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="账户姓名"
            rules={[{ required: true, message: '请输入账户姓名' }]}
          >
            <Input placeholder="请输入账户姓名" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                绑定
              </Button>
              <Button onClick={() => setBindAccountModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdvertiserProfile;
