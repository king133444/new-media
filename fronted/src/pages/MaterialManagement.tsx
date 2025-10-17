import React from 'react';
import { Card, Button, Upload, Table, Space, Tag } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';

const MaterialManagement: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">素材管理</h1>
        <p style={{ margin: 0, color: '#666' }}>设计师上传素材，管理员管理素材类别和信息</p>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Upload.Dragger
            name="file"
            multiple
            action="/api/upload"
            style={{ width: '100%' }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个或批量上传。支持音频、视频、图片等格式
            </p>
          </Upload.Dragger>
        </div>
      </Card>

      <Card title="素材列表">
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          素材管理功能开发中...
        </div>
      </Card>
    </div>
  );
};

export default MaterialManagement;
