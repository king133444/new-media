import React from 'react';
import { Card, Table, Button, Space, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const SystemManagement: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">系统管理</h1>
        <p style={{ margin: 0, color: '#666' }}>管理系统用户、角色和权限</p>
      </div>

      <Card title="角色管理" style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          角色管理功能开发中...
        </div>
      </Card>

      <Card title="权限管理">
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          权限管理功能开发中...
        </div>
      </Card>
    </div>
  );
};

export default SystemManagement;
