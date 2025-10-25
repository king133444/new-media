import React, { useEffect, useState, useCallback } from 'react';
import { Card, Form, Input, Upload, Button, Space, Tag, Row, Col, Statistic, message, Select, Divider } from 'antd';
import { PlusOutlined, ShoppingCartOutlined, StarOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import http, { resolveFileUrl } from '../store/api/http';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { getUserInfoAsync } from '../store/slices/authSlice';

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
  const dispatch = useDispatch<AppDispatch>();
  const [profile, setProfile] = useState<CreatorProfileData | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const me = await http.get('/auth/me');
      const id = me.data?.id;
      const { data } = await http.get(`/users/profile/${id}`);
      setProfile(data);
      setSkills(data.skills || []);
      setTags(data.tags || []);
      form.setFieldsValue({ ...data });
      setDirty(false);
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
        setDirty(true);
        message.success('头像上传成功');
      } catch (error) {
        message.error('头像上传失败');
      }
      return false;
    },
  };

  const handleSave = async (values: any) => {
    try {
      const payload: any = { ...values };
      if (Array.isArray(values.skills)) payload.skills = JSON.stringify(values.skills);
      if (Array.isArray(values.tags)) payload.tags = JSON.stringify(values.tags);
      await http.patch('/auth/me', payload);
      message.success('保存成功');
      setDirty(false);
      fetchProfile();
      // 同步刷新 header 头像
      dispatch(getUserInfoAsync());
    } catch (e) {
      message.error('保存失败');
    }
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={16}>
          <Card title="个人资料" extra={<Space>
            {dirty && <span style={{ color: '#faad14' }}>有未保存的更改</span>}
            <Button type="primary" onClick={() => form.submit()} disabled={!dirty}>保存</Button>
          </Space>}>
            <Form form={form} layout="vertical" onFinish={handleSave} onValuesChange={() => setDirty(true)}>
              {/* 确保头像字段参与提交 */}
              <Form.Item name="avatar" hidden>
                <Input type="hidden" />
              </Form.Item>
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
              <Divider />
              <Form.Item name="skills" label="技能（可自定义录入，多项可回车分隔）">
                <Select
                  mode="tags"
                  placeholder="如：剪辑、AE、PS、PR、脚本策划"
                  tokenSeparators={[',', '，', ';', '；', ' ']}
                  value={skills}
                  onChange={(vals) => setSkills(vals as string[])}
                />
              </Form.Item>
              <Form.Item name="tags" label="个性化标签（可自定义录入，多项可回车分隔）">
                <Select
                  mode="tags"
                  placeholder="如：校园、旅行、科技、搞笑、时尚"
                  tokenSeparators={[',', '，', ';', '；', ' ']}
                  value={tags}
                  onChange={(vals) => setTags(vals as string[])}
                />
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
            <Card title="我的技能（预览）" style={{ marginTop: 16 }}>
              <Space wrap>
                {skills.map(s => (
                  <Tag key={s} color="green">{s}</Tag>
                ))}
              </Space>
            </Card>
          )}
          {tags && tags.length > 0 && (
            <Card title="我的标签（预览）" style={{ marginTop: 16 }}>
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


