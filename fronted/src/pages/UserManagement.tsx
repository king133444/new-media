import React, { useEffect, useMemo, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import http from '../store/api/http';

const UserManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/users');
      setUsers(data || []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const okRole = roleFilter ? u.role === roleFilter : true;
      const okKw = keyword ? (u.username?.includes(keyword) || u.email?.includes(keyword)) : true;
      return okRole && okKw;
    });
  }, [users, roleFilter, keyword]);

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleMap: { [key: string]: { text: string; color: string } } = {
          ADMIN: { text: '管理员', color: 'red' },
          ADVERTISER: { text: '广告商', color: 'blue' },
          CREATOR: { text: '创作者', color: 'green' },
          DESIGNER: { text: '设计师', color: 'orange' },
        };
        const roleInfo = roleMap[role] || { text: role, color: 'default' };
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
      },
    },
    // 状态列移除（默认活跃，不展示）
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除这个用户吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    form.setFieldsValue({ username: user.username, email: user.email, role: user.role });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/users/${id}`);
      message.success('删除成功');
      fetchUsers();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '删除失败');
    }
  };

  const handleModalOk = () => {
    form.validateFields().then(async (values) => {
      try {
        const payload: any = { username: values.username, email: values.email, role: values.role };
        if (!editingUser && values.password) payload.password = values.password;
        if (editingUser && values.password) payload.password = values.password; // 允许重置密码
        if (editingUser) {
          await http.patch(`/users/${editingUser.id}`, payload);
          message.success('用户更新成功');
        } else {
          await http.post('/users', payload);
          message.success('用户添加成功');
        }
        setIsModalVisible(false);
        form.resetFields();
        fetchUsers();
      } catch (e: any) {
        message.error(e?.response?.data?.message || (editingUser ? '更新失败' : '添加失败'));
      }
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">用户管理</h1>
        <p style={{ margin: 0, color: '#666' }}>管理系统用户账号和权限</p>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input
            placeholder="搜索用户"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select placeholder="按角色筛选" style={{ width: 160 }} allowClear value={roleFilter} onChange={setRoleFilter}>
            <Select.Option value="ADMIN">管理员</Select.Option>
            <Select.Option value="ADVERTISER">广告商</Select.Option>
            <Select.Option value="DESIGNER">设计师</Select.Option>
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{display: 'none'}}>
          添加用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        pagination={{
          total: filteredUsers.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: 'ADVERTISER' }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Select.Option value="ADMIN">管理员</Select.Option>
              <Select.Option value="ADVERTISER">广告商</Select.Option>
              <Select.Option value="DESIGNER">设计师</Select.Option>
            </Select>
          </Form.Item>

          {/* 创建或编辑时允许设置新密码；编辑时留空表示不改 */}
          <Form.Item name="password" label={editingUser ? '新密码（可选）' : '密码'} rules={editingUser ? [] : [{ required: true, message: '请输入密码' }, { min: 6, message: '至少6位' }]}>
            <Input.Password placeholder={editingUser ? '留空则不修改' : '请输入密码'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
