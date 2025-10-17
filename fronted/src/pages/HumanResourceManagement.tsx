import React from 'react';
import { Card, Table, Button, Space, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const HumanResourceManagement: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">人力资源管理</h1>
        <p style={{ margin: 0, color: '#666' }}>管理设计师信息、发单员、奖金和黑名单</p>
      </div>

      <Card title="设计师管理" style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          设计师管理功能开发中...
        </div>
      </Card>

      <Card title="发单员管理" style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          发单员管理功能开发中...
        </div>
      </Card>

      <Card title="奖金管理">
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          奖金管理功能开发中...
        </div>
      </Card>
    </div>
  );
};

export default HumanResourceManagement;
