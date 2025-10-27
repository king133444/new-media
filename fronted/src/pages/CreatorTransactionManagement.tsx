import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  message,
  Row,
  Col,
  Typography,
  Statistic,
  Modal,
} from "antd";
import {
  ArrowDownOutlined,
  DollarOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import http from "../store/api/http";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
// 移除未使用的 Option

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  order?: { id: string; title: string };
}

interface TransactionStats {
  total: number;
  deposits: { count: number; amount: number };
  withdrawals: { count: number; amount: number };
  payments: { count: number; amount: number };
  refunds: { count: number; amount: number };
  walletBalance: number;
  totalIncome: number;
}

const CreatorTransactionManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawForm] = Form.useForm();

  const fetchTransactions = async (type?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type && type !== "all") params.append("type", type);
      const { data } = await http.get(`/transactions?${params.toString()}`);
      setTransactions(data.data || []);
    } catch (e) {
      message.error("获取交易列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await http.get("/transactions/stats");
      // 累计收入 = 钱包余额 + 已提现金额
      const walletBalance = data.walletBalance || 0;
      const withdrawn = data.withdrawals?.amount || 0;
      setStats({
        ...data,
        payments: { ...data.payments },
        walletBalance,
        totalIncome: walletBalance + withdrawn,
      });
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, []);

  const handleWithdraw = async (values: any) => {
    try {
      await http.post("/transactions/withdraw", {
        amount: values.amount,
        paymentAccount: values.paymentAccount,
      });
      message.success("提现申请已提交");
      setWithdrawModalVisible(false);
      withdrawForm.resetFields();
      fetchTransactions();
      fetchStats();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "提现失败");
    }
  };

  const getStatusTag = (status: string) => {
    const map: any = {
      PENDING: { c: "orange", t: "待处理" },
      COMPLETED: { c: "green", t: "已完成" },
      FAILED: { c: "red", t: "失败" },
      CANCELLED: { c: "gray", t: "已取消" },
    };
    const it = map[status] || { c: "default", t: status };
    return <Tag color={it.c}>{it.t}</Tag>;
  };

  const getTypeText = (type: string) =>
    ((
      {
        DEPOSIT: "充值",
        WITHDRAWAL: "提现",
        PAYMENT: "支付",
        REFUND: "退款",
        COMMISSION: "佣金",
      } as any
    )[type] || type);

  const columns: ColumnsType<Transaction> = [
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (t) => getTypeText(t),
    },
    {
      title: "金额",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (a, r) => (
        <Text
          style={{
            color: r.type === "WITHDRAWAL" ? "#ff4d4f" : "#52c41a",
            fontWeight: "bold",
          }}
        >
          {r.type === "WITHDRAWAL" ? "-" : "+"}¥{a.toFixed(2)}
        </Text>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s) => getStatusTag(s),
    },
    {
      title: "关联订单",
      dataIndex: "order",
      key: "order",
      width: 180,
      render: (o) =>
        o ? <Text ellipsis={{ tooltip: o.title }}>{o.title}</Text> : "-",
    },
    {
      title: "时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (d) => dayjs(d).format("YYYY-MM-DD HH:mm"),
    },
  ];

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
        <Title level={2}>交易管理（创作者）</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchTransactions()}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<ArrowDownOutlined />}
            onClick={() => setWithdrawModalVisible(true)}
          >
            提现
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="累计收入"
              value={stats?.totalIncome || 0}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已提现金额"
              value={stats?.withdrawals?.amount || 0}
              precision={2}
              prefix={<ArrowDownOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="钱包余额"
              value={stats?.walletBalance || 0}
              precision={2}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      <Card>
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
          }}
        />
      </Card>

      <Modal
        title="发起提现"
        open={withdrawModalVisible}
        onCancel={() => {
          setWithdrawModalVisible(false);
          withdrawForm.resetFields();
        }}
        footer={null}
      >
        <Form form={withdrawForm} layout="vertical" onFinish={handleWithdraw}>
          <Form.Item
            name="amount"
            label="提现金额"
            rules={[
              { required: true, message: "请输入提现金额" },
              { type: "number", min: 0.01, message: "金额必须大于0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              precision={2}
              addonBefore="¥"
            />
          </Form.Item>
          <Form.Item
            name="paymentAccount"
            label="收款账户"
            rules={[{ required: true, message: "请输入收款账户" }]}
          >
            <Input placeholder="请输入你的收款账户" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
              <Button
                onClick={() => {
                  setWithdrawModalVisible(false);
                  withdrawForm.resetFields();
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

export default CreatorTransactionManagement;
