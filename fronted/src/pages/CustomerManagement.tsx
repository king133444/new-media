import React from 'react';
import { Card, Table, Tag, Button, Space } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const CustomerManagement: React.FC = () => {
  // 模拟客户数据
  const customers = [
    {
      id: '1',
      name: '张三',
      company: 'ABC科技有限公司',
      industry: '科技',
      contact: '13800138000',
      email: 'zhangsan@abc.com',
      level: 'VIP',
      risk: '低',
      status: 'active',
    },
    {
      id: '2',
      name: '李四',
      company: 'XYZ广告公司',
      industry: '广告',
      contact: '13900139000',
      email: 'lisi@xyz.com',
      level: '普通',
      risk: '中',
      status: 'active',
    },
  ];

  const columns = [
    {
      title: '客户姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      key: 'contact',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '客户层次',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => (
        <Tag color={level === 'VIP' ? 'gold' : 'blue'}>{level}</Tag>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'risk',
      key: 'risk',
      render: (risk: string) => (
        <Tag color={risk === '低' ? 'green' : risk === '中' ? 'orange' : 'red'}>
          {risk}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '活跃' : '非活跃'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">客户管理</h1>
        <p style={{ margin: 0, color: '#666' }}>管理客户基本信息、销售信息和风险等级</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}>
          添加客户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={customers}
        rowKey="id"
        pagination={{
          total: customers.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />
    </div>
  );
};

export default CustomerManagement;
