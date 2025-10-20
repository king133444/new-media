import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  message,
  Row,
  Col,
  Typography,
  Statistic,
  Tabs,
  Descriptions,
} from 'antd';
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ShoppingCartOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import http from '../store/api/http';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
// 移除未使用的 RangePicker

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  description?: string;
  paymentMethod?: string;
  paymentAccount?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string;
  };
  order?: {
    id: string;
    title: string;
    amount: number;
  };
}

interface TransactionStats {
  total: number;
  deposits: {
    count: number;
    amount: number;
  };
  withdrawals: {
    count: number;
    amount: number;
  };
  payments: {
    count: number;
    amount: number;
  };
  refunds: {
    count: number;
    amount: number;
  };
}

const AdvertiserTransactionManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [depositForm] = Form.useForm();
  const [withdrawForm] = Form.useForm();

  // 获取交易列表
  const fetchTransactions = async (type?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type && type !== 'all') {
        params.append('type', type);
      }
      
      const { data } = await http.get(`/transactions?${params.toString()}`);
      setTransactions(data.data || []);
    } catch (error) {
      message.error('获取交易列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const { data } = await http.get('/transactions/stats');
      setStats(data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // （移除未使用的 fetchWalletInfo）

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, []);

  // 充值
  const handleDeposit = async (values: any) => {
    try {
      await http.post('/transactions/deposit', {
        amount: values.amount,
        paymentMethod: values.paymentMethod,
      });
      message.success('充值申请已提交');
      setDepositModalVisible(false);
      depositForm.resetFields();
      fetchTransactions();
      fetchStats();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '充值失败');
    }
  };

  // 提现
  const handleWithdraw = async (values: any) => {
    try {
      await http.post('/transactions/withdraw', {
        amount: values.amount,
        paymentAccount: values.paymentAccount,
      });
      message.success('提现申请已提交');
      setWithdrawModalVisible(false);
      withdrawForm.resetFields();
      fetchTransactions();
      fetchStats();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '提现失败');
    }
  };

  // 查看交易详情
  const viewTransactionDetail = async (id: string) => {
    try {
      const { data } = await http.get(`/transactions/${id}`);
      setSelectedTransaction(data);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取交易详情失败');
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      PENDING: { color: 'orange', text: '已发布' },
      COMPLETED: { color: 'green', text: '已完成' },
      FAILED: { color: 'red', text: '失败' },
      CANCELLED: { color: 'gray', text: '已取消' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取交易类型标签
  const getTypeTag = (type: string) => {
    const typeMap: { [key: string]: { color: string; text: string; icon: React.ReactNode } } = {
      DEPOSIT: { color: 'green', text: '充值', icon: <ArrowUpOutlined /> },
      WITHDRAWAL: { color: 'red', text: '提现', icon: <ArrowDownOutlined /> },
      PAYMENT: { color: 'blue', text: '支付', icon: <ShoppingCartOutlined /> },
      REFUND: { color: 'orange', text: '退款', icon: <ArrowUpOutlined /> },
      COMMISSION: { color: 'purple', text: '佣金', icon: <DollarOutlined /> },
    };
    const config = typeMap[type] || { color: 'default', text: type, icon: null };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: '交易类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => getTypeTag(type),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount, record) => (
        <Text
          style={{
            color: record.type === 'DEPOSIT' || record.type === 'REFUND' ? '#52c41a' : '#ff4d4f',
            fontWeight: 'bold',
          }}
        >
          {record.type === 'DEPOSIT' || record.type === 'REFUND' ? '+' : '-'}¥{amount.toFixed(2)}
        </Text>
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
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method) => method || '-',
    },
    {
      title: '关联订单',
      dataIndex: 'order',
      key: 'order',
      width: 150,
      render: (order) =>
        order ? (
          <Text type="secondary" ellipsis={{ tooltip: order.title }}>
            {order.title}
          </Text>
        ) : (
          '-'
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => viewTransactionDetail(record.id)}
        >
          详情
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: '全部交易',
    },
    {
      key: 'DEPOSIT',
      label: '充值记录',
    },
    {
      key: 'WITHDRAWAL',
      label: '提现记录',
    },
    {
      key: 'PAYMENT',
      label: '支付记录',
    },
    {
      key: 'REFUND',
      label: '退款记录',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>交易管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchTransactions()}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<ArrowUpOutlined />}
            onClick={() => setDepositModalVisible(true)}
          >
            充值
          </Button>
          <Button
            icon={<ArrowDownOutlined />}
            onClick={() => setWithdrawModalVisible(true)}
          >
            提现
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总交易数"
              value={stats?.total || 0}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="充值总额"
              value={stats?.deposits?.amount || 0}
              precision={2}
              prefix={<ArrowUpOutlined />}
              suffix="元"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="提现总额"
              value={stats?.withdrawals?.amount || 0}
              precision={2}
              prefix={<ArrowDownOutlined />}
              suffix="元"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="支付总额"
              value={stats?.payments?.amount || 0}
              precision={2}
              prefix={<ShoppingCartOutlined />}
              suffix="元"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 交易列表 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            fetchTransactions(key);
          }}
          items={tabItems}
        />
        
        <Table
          columns={columns}
          dataSource={transactions}
          loading={loading}
          rowKey="id"
          pagination={{
            total: transactions.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {/* 充值模态框 */}
      <Modal
        title="账户充值"
        open={depositModalVisible}
        onCancel={() => {
          setDepositModalVisible(false);
          depositForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={depositForm}
          layout="vertical"
          onFinish={handleDeposit}
        >
          <Form.Item
            name="amount"
            label="充值金额"
            rules={[
              { required: true, message: '请输入充值金额' },
              { type: 'number', min: 0.01, message: '金额必须大于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入充值金额"
              min={0.01}
              precision={2}
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="支付方式"
            rules={[{ required: true, message: '请选择支付方式' }]}
          >
            <Select placeholder="请选择支付方式">
              <Option value="alipay">支付宝</Option>
              <Option value="wechat">微信支付</Option>
              <Option value="bank">银行卡</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交充值申请
              </Button>
              <Button onClick={() => {
                setDepositModalVisible(false);
                depositForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 提现模态框 */}
      <Modal
        title="账户提现"
        open={withdrawModalVisible}
        onCancel={() => {
          setWithdrawModalVisible(false);
          withdrawForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={withdrawForm}
          layout="vertical"
          onFinish={handleWithdraw}
        >
          <Form.Item
            name="amount"
            label="提现金额"
            rules={[
              { required: true, message: '请输入提现金额' },
              { type: 'number', min: 0.01, message: '金额必须大于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入提现金额"
              min={0.01}
              precision={2}
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            name="paymentAccount"
            label="收款账户"
            rules={[{ required: true, message: '请输入收款账户' }]}
          >
            <Input placeholder="请输入收款账户信息" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交提现申请
              </Button>
              <Button onClick={() => {
                setWithdrawModalVisible(false);
                withdrawForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 交易详情模态框 */}
      <Modal
        title="交易详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedTransaction && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="交易ID" span={2}>
              {selectedTransaction.id}
            </Descriptions.Item>
            <Descriptions.Item label="交易类型">
              {getTypeTag(selectedTransaction.type)}
            </Descriptions.Item>
            <Descriptions.Item label="交易状态">
              {getStatusTag(selectedTransaction.status)}
            </Descriptions.Item>
            <Descriptions.Item label="交易金额" span={2}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: selectedTransaction.type === 'DEPOSIT' || selectedTransaction.type === 'REFUND' ? '#52c41a' : '#ff4d4f',
                }}
              >
                {selectedTransaction.type === 'DEPOSIT' || selectedTransaction.type === 'REFUND' ? '+' : '-'}¥{selectedTransaction.amount.toFixed(2)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="交易描述" span={2}>
              {selectedTransaction.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="支付方式">
              {selectedTransaction.paymentMethod || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="收款账户">
              {selectedTransaction.paymentAccount || '-'}
            </Descriptions.Item>
            {selectedTransaction.order && (
              <Descriptions.Item label="关联订单" span={2}>
                <div>
                  <Text strong>{selectedTransaction.order.title}</Text>
                  <br />
                  <Text type="secondary">订单金额: ¥{selectedTransaction.order.amount.toFixed(2)}</Text>
                </div>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="备注" span={2}>
              {selectedTransaction.remark || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedTransaction.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(selectedTransaction.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AdvertiserTransactionManagement;
