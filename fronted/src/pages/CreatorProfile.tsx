import React, { useEffect, useState, useCallback } from 'react';
import { Card, Form, Input, Upload, Button, Space, Tag, Row, Col, Statistic, message } from 'antd';
import { PlusOutlined, ShoppingCartOutlined, StarOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import http, { resolveFileUrl } from '../store/api/http';

const { TextArea } = Input;

interface CreatorProfileData {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  tags?: string[];
  paymentAccount?: string;
  averageRating?: number;
  participatedOrders?: number;
  createdAt: string;
}

const CreatorProfile: React.FC = () => {
  const [form] = Form.useForm();
  const [profile, setProfile] = useState<CreatorProfileData | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const me = await http.get('/auth/me');
      const id = me.data?.id;
      const { data } = await http.get(`/users/profile/${id}`);
      setProfile(data);
      setSkills(data.skills || []);
      setTags(data.tags || []);
      form.setFieldsValue({ ...data });
    } catch (e) {
      message.error('获取资料失败');
    }
  }, [form]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const uploadProps: UploadProps = {
    name: 'file',
    listType: 'picture-card',
    showUploadList: false,
    beforeUpload: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const { data } = await http.post('/materials/upload-avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        form.setFieldsValue({ avatar: data.url });
        setProfile(prev => (prev ? { ...prev, avatar: data.url } : prev));
        message.success('头像上传成功');
      } catch (error) {
        message.error('头像上传失败');
      }
      return false;
    },
  };

  const handleSave = async (values: any) => {
    try {
      await http.patch('/auth/me', values);
      message.success('保存成功');
      fetchProfile();
    } catch (e) {
      message.error('保存失败');
    }
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={16}>
          <Card title="个人资料" extra={<Button type="primary" onClick={() => form.submit()}>保存</Button>}>
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }]}> 
                <Input />
              </Form.Item>
              <Form.Item name="bio" label="个人简介">
                <TextArea rows={4} placeholder="请输入个人简介" />
              </Form.Item>
              <Form.Item name="paymentAccount" label="收款账户">
                <Input placeholder="请输入你的收款账户" />
              </Form.Item>
              <Form.Item label="头像">
                <Upload {...uploadProps}>
                  {profile?.avatar ? (
                    <img src={resolveFileUrl(profile.avatar)} alt="avatar" style={{ width: '100%' }} />
                  ) : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>上传头像</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="关键指标">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Statistic title="参与订单" value={profile?.participatedOrders || 0} prefix={<ShoppingCartOutlined />} />
              <Statistic title="平均评分" value={profile?.averageRating || 0} precision={1} prefix={<StarOutlined />} />
            </Space>
          </Card>
          {skills && skills.length > 0 && (
            <Card title="技能" style={{ marginTop: 16 }}>
              <Space wrap>
                {skills.map(s => (
                  <Tag key={s} color="green">{s}</Tag>
                ))}
              </Space>
            </Card>
          )}
          {tags && tags.length > 0 && (
            <Card title="标签" style={{ marginTop: 16 }}>
              <Space wrap>
                {tags.map(t => (
                  <Tag key={t} color="blue">{t}</Tag>
                ))}
              </Space>
            </Card>
          )}
          <Card title="账户信息" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>支付账户：{profile?.paymentAccount || '-'}</div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CreatorProfile;


