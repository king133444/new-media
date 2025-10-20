import React, { useState, useEffect, useCallback } from 'react';
import http from '../store/api/http';
import { Row, Col, Card, Statistic, Progress, Table, Tag, DatePicker, Select, Spin, Empty, Avatar } from 'antd';
import {
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  StarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  TrophyOutlined,
  MessageOutlined,
  FileImageOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface PlatformStats {
  overview: {
    totalUsers: number;
    totalOrders: number;
    totalTransactions: number;
    totalReviews: number;
    totalPortfolios: number;
    totalCommunications: number;
    activeUsers: number;
    completedOrders: number;
    totalTransactionAmount: number;
    averageRating: number;
  };
  userRoleDistribution: Array<{
    role: string;
    count: number;
  }>;
  orderStatusDistribution: Array<{
    status: string;
    count: number;
    totalAmount: number;
  }>;
  transactionTypeDistribution: Array<{
    type: string;
    status: string;
    count: number;
    totalAmount: number;
  }>;
}

interface TrendData {
  userTrend: Array<{
    date: string;
    count: number;
  }>;
  orderTrend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
  transactionTrend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

interface PopularData {
  mostActiveUsers: Array<{
    id: string;
    username: string;
    avatar: string;
    role: string;
    orderCount: number;
  }>;
  mostPopularCreators: Array<{
    id: string;
    username: string;
    avatar: string;
    role: string;
    orderCount: number;
    averageRating: number;
    totalReviews: number;
  }>;
  popularPortfolios: Array<{
    id: string;
    title: string;
    type: string;
    thumbnail: string;
    user: {
      id: string;
      username: string;
      avatar: string;
    };
  }>;
}

const Dashboard: React.FC = () => {
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [popularData, setPopularData] = useState<PopularData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);

  const { user } = useSelector((state: RootState) => state.auth);

  // 获取平台统计数据
  const fetchPlatformStats = useCallback(async () => {
    try {
      const { data } = await http.get('/statistics/platform');
      setPlatformStats(data);
    } catch (error) {
      console.error('获取平台统计数据失败:', error);
    }
  }, []);

  // 获取趋势数据
  const fetchTrendData = useCallback(async (days: number = 30) => {
    try {
      const { data } = await http.get(`/statistics/trends`, { params: { days } });
      setTrendData(data);
    } catch (error) {
      console.error('获取趋势数据失败:', error);
    }
  }, []);

  // 获取热门数据
  const fetchPopularData = useCallback(async () => {
    try {
      const { data } = await http.get('/statistics/popular');
      setPopularData(data);
    } catch (error) {
      console.error('获取热门数据失败:', error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPlatformStats(),
      fetchTrendData(30),
      fetchPopularData(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [fetchPlatformStats, fetchTrendData, fetchPopularData]);

  // 获取角色标签
  const getRoleTag = (role: string) => {
    const roleMap: { [key: string]: { color: string; text: string } } = {
      ADMIN: { color: 'red', text: '管理员' },
      ADVERTISER: { color: 'blue', text: '广告商' },
      CREATOR: { color: 'green', text: '创作者' },
      DESIGNER: { color: 'purple', text: '设计师' },
    };
    const config = roleMap[role] || { color: 'default', text: role };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      PENDING: { color: 'orange', text: '待处理' },
      IN_PROGRESS: { color: 'blue', text: '进行中' },
      COMPLETED: { color: 'green', text: '已完成' },
      CANCELLED: { color: 'red', text: '已取消' },
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

  // 最活跃用户表格列
  const activeUsersColumns: ColumnsType<any> = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={record.avatar} icon={<UserOutlined />} size="small" />
          <div>
            <div>{record.username}</div>
            {getRoleTag(record.role)}
          </div>
        </div>
      ),
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (count) => <Tag color="blue">{count}</Tag>,
    },
  ];

  // 最受欢迎创作者表格列
  const popularCreatorsColumns: ColumnsType<any> = [
    {
      title: '创作者',
      key: 'creator',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={record.avatar} icon={<UserOutlined />} size="small" />
          <div>
            <div>{record.username}</div>
            {getRoleTag(record.role)}
          </div>
        </div>
      ),
    },
    {
      title: '接单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (count) => <Tag color="green">{count}</Tag>,
    },
    {
      title: '平均评分',
      dataIndex: 'averageRating',
      key: 'averageRating',
      render: (rating) => (
        <div>
          <StarOutlined style={{ color: '#faad14' }} />
          <span style={{ marginLeft: 4 }}>{rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      title: '评价数',
      dataIndex: 'totalReviews',
      key: 'totalReviews',
      render: (count) => <span>{count}</span>,
    },
  ];

  // 热门作品集表格列
  const popularPortfoliosColumns: ColumnsType<any> = [
    {
      title: '作品',
      key: 'portfolio',
      render: (_, record) => (
        <div>
          <div>{record.title}</div>
          {getTypeTag(record.type)}
        </div>
      ),
    },
    {
      title: '创作者',
      key: 'creator',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={record.user.avatar} icon={<UserOutlined />} size="small" />
          <span>{record.user.username}</span>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载数据中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">数据统计看板</h1>
        <p style={{ margin: 0, color: '#666' }}>新媒体工作室管理系统概览</p>
      </div>

      {/* 时间范围选择 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span>时间范围：</span>
          </Col>
          <Col>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                  const days = dates[1].diff(dates[0], 'day');
                  fetchTrendData(days);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </Col>
          <Col>
            <Select
              defaultValue={30}
              onChange={(days) => fetchTrendData(days)}
              style={{ width: 120 }}
            >
              <Option value={7}>最近7天</Option>
              <Option value={30}>最近30天</Option>
              <Option value={90}>最近90天</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 核心指标 */}
      {platformStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={platformStats.overview.totalUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总订单数"
                value={platformStats.overview.totalOrders}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="交易总额"
                value={platformStats.overview.totalTransactionAmount}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="平均评分"
                value={platformStats.overview.averageRating}
                precision={1}
                prefix={<StarOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 详细统计 */}
      {platformStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="活跃用户"
                value={platformStats.overview.activeUsers}
                suffix={`/ ${platformStats.overview.totalUsers}`}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已完成订单"
                value={platformStats.overview.completedOrders}
                suffix={`/ ${platformStats.overview.totalOrders}`}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="作品集总数"
                value={platformStats.overview.totalPortfolios}
                prefix={<FileImageOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="消息总数"
                value={platformStats.overview.totalCommunications}
                prefix={<MessageOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        {/* 用户角色分布 */}
        {platformStats && (
          <Col xs={24} lg={8}>
            <Card title="用户角色分布">
              <div style={{ marginBottom: 16 }}>
                {platformStats.userRoleDistribution.map((item, index) => {
                  const percentage = (item.count / platformStats.overview.totalUsers) * 100;
                  return (
                    <div key={index} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>{getRoleTag(item.role)}</span>
                        <span>{item.count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress percent={percentage} size="small" />
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>
        )}

        {/* 订单状态分布 */}
        {platformStats && (
          <Col xs={24} lg={8}>
            <Card title="订单状态分布">
              <div style={{ marginBottom: 16 }}>
                {platformStats.orderStatusDistribution.map((item, index) => {
                  const percentage = (item.count / platformStats.overview.totalOrders) * 100;
                  return (
                    <div key={index} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>{getStatusTag(item.status)}</span>
                        <span>{item.count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress percent={Number(percentage.toFixed(1))} size="small" />
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>
        )}

        {/* 交易类型分布 */}
        {platformStats && (
          <Col xs={24} lg={8}>
            <Card title="交易类型分布">
              <div style={{ marginBottom: 16 }}>
                {platformStats.transactionTypeDistribution.slice(0, 5).map((item, index) => {
                  const totalTransactions = platformStats.transactionTypeDistribution
                    .reduce((sum, t) => sum + t.count, 0);
                  const percentage = (item.count / totalTransactions) * 100;
                  return (
                    <div key={index} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>
                          <Tag color="blue">{item.type}</Tag>
                          <Tag color="green">{item.status}</Tag>
                        </span>
                        <span>{item.count}</span>
                      </div>
                      <Progress percent={Number(percentage.toFixed(1))} size="small" />
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>
        )}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 最活跃用户 */}
        {popularData && (
          <Col xs={24} lg={8}>
            <Card title="最活跃用户" extra={<TrophyOutlined />}>
              <Table
                columns={activeUsersColumns}
                dataSource={popularData.mostActiveUsers.slice(0, 5)}
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="暂无数据" /> }}
              />
            </Card>
          </Col>
        )}

        {/* 最受欢迎创作者 */}
        {popularData && (
          <Col xs={24} lg={8}>
            <Card title="最受欢迎创作者" extra={<StarOutlined />}>
              <Table
                columns={popularCreatorsColumns}
                dataSource={popularData.mostPopularCreators.slice(0, 5)}
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="暂无数据" /> }}
              />
            </Card>
          </Col>
        )}

        {/* 热门作品集 */}
        {popularData && (
          <Col xs={24} lg={8}>
            <Card title="热门作品集" extra={<EyeOutlined />}>
              <Table
                columns={popularPortfoliosColumns}
                dataSource={popularData.popularPortfolios.slice(0, 5)}
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="暂无数据" /> }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* 快速操作 */}
      {/* <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="快速操作">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Card size="small" hoverable>
                <div style={{ textAlign: 'center' }}>
                  <UserOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                  <div>用户管理</div>
                </div>
              </Card>
              <Card size="small" hoverable>
                <div style={{ textAlign: 'center' }}>
                  <ShoppingCartOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
                  <div>订单管理</div>
                </div>
              </Card>
              <Card size="small" hoverable>
                <div style={{ textAlign: 'center' }}>
                  <DollarOutlined style={{ fontSize: 24, color: '#faad14', marginBottom: 8 }} />
                  <div>交易管理</div>
                </div>
              </Card>
              <Card size="small" hoverable>
                <div style={{ textAlign: 'center' }}>
                  <StarOutlined style={{ fontSize: 24, color: '#f5222d', marginBottom: 8 }} />
                  <div>评价管理</div>
                </div>
              </Card>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="系统状态">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div style={{ textAlign: 'center', padding: 16, background: '#f6ffed', borderRadius: 6 }}>
                <div style={{ fontSize: 20, color: '#52c41a', marginBottom: 8 }}>✓</div>
                <div>系统运行正常</div>
              </div>
              <div style={{ textAlign: 'center', padding: 16, background: '#f6ffed', borderRadius: 6 }}>
                <div style={{ fontSize: 20, color: '#52c41a', marginBottom: 8 }}>✓</div>
                <div>数据库连接正常</div>
              </div>
              <div style={{ textAlign: 'center', padding: 16, background: '#fff7e6', borderRadius: 6 }}>
                <div style={{ fontSize: 20, color: '#faad14', marginBottom: 8 }}>⚠</div>
                <div>待审核订单 3</div>
              </div>
              <div style={{ textAlign: 'center', padding: 16, background: '#fff2f0', borderRadius: 6 }}>
                <div style={{ fontSize: 20, color: '#ff4d4f', marginBottom: 8 }}>!</div>
                <div>待处理评价 1</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row> */}
    </div>
  );
};

export default Dashboard;