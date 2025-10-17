import React from 'react';
import { Card, Row, Col, Button, Input, Select, Space } from 'antd';
import { DownloadOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';

const MaterialDownload: React.FC = () => {
  const materialCategories = [
    { type: 'audio', name: '音频素材', count: 156, color: '#1890ff' },
    { type: 'video', name: '视频素材', count: 89, color: '#52c41a' },
    { type: 'image', name: '图片素材', count: 234, color: '#faad14' },
    { type: 'page', name: '页面模板', count: 67, color: '#f5222d' },
    { type: 'h5', name: 'H5模板', count: 45, color: '#722ed1' },
    { type: 'miniprogram', name: '小程序模板', count: 23, color: '#13c2c2' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">素材下载</h1>
        <p style={{ margin: 0, color: '#666' }}>下载音频、视频、图片、页面、H5、小程序等相关素材</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Space>
          <Input
            placeholder="搜索素材"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
          />
          <Select placeholder="按类型筛选" style={{ width: 150 }} allowClear>
            <Select.Option value="audio">音频素材</Select.Option>
            <Select.Option value="video">视频素材</Select.Option>
            <Select.Option value="image">图片素材</Select.Option>
            <Select.Option value="page">页面模板</Select.Option>
            <Select.Option value="h5">H5模板</Select.Option>
            <Select.Option value="miniprogram">小程序模板</Select.Option>
          </Select>
          <Button icon={<FilterOutlined />}>更多筛选</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {materialCategories.map((category) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={category.type}>
            <Card
              hoverable
              style={{ textAlign: 'center' }}
              bodyStyle={{ padding: '24px 16px' }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: category.color,
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 24,
                }}
              >
                <DownloadOutlined />
              </div>
              <h3 style={{ margin: '0 0 8px 0' }}>{category.name}</h3>
              <p style={{ color: '#666', margin: '0 0 16px 0' }}>
                共 {category.count} 个素材
              </p>
              <Button type="primary" icon={<DownloadOutlined />}>
                进入下载
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="热门素材" style={{ marginTop: 24 }}>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          热门素材列表功能开发中...
        </div>
      </Card>
    </div>
  );
};

export default MaterialDownload;
