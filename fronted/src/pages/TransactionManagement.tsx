import React from 'react';
import { Card, Table, Button, Space, Tag, Statistic, Row, Col } from 'antd';
import { DollarOutlined, PlusOutlined } from '@ant-design/icons';

const TransactionManagement: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">交易管理</h1>
        <p style={{ margin: 0, color: '#666' }}>管理用户虚拟货币充值和平台交易</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总交易额"
              value={98765}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日交易"
              value={1234}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待处理"
              value={56}
              suffix="笔"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平台收益"
              value={987}
              prefix="¥"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="交易记录">
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          交易记录功能开发中...
        </div>
      </Card>
    </div>
  );
};

export default TransactionManagement;
