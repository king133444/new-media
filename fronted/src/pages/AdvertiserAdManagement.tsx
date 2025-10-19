import React, { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, DatePicker, Select, Button, message } from 'antd';
import ordersApi, { CreateOrderPayload } from '../store/api/ordersApi';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';

const { TextArea } = Input;
const { Option } = Select;

const AdvertiserAdManagement: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<any>();
  const location = useLocation();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    try {
      setSubmitting(true);
      const tagsArray: string[] = (values.tagsInput || '')
        .split(/\s+/)
        .map((t: string) => t.trim())
        .filter((t: string) => t);
      const payload: CreateOrderPayload = {
        title: values.title,
        description: values.description,
        type: values.type,
        amount: values.amount,
        priority: values.priority,
        deadline: values.deadline ? (values.deadline as dayjs.Dayjs).toISOString() : undefined,
        tags: JSON.stringify(tagsArray),
      } as any;
      await ordersApi.create(payload);
      message.success('订单创建成功');
      form.resetFields();
      navigate('/orders');
    } catch (e: any) {
      message.error(e?.response?.data?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 预填支持：从路由 state.prefill 读取并设置表单
  useEffect(() => {
    const state: any = (location as any).state;
    const prefill = state?.prefill;
    if (!prefill) return;
    form.setFieldsValue({
      title: prefill.title,
      description: prefill.description,
      type: prefill.type,
      amount: prefill.amount,
      priority: prefill.priority,
      deadline: prefill.deadline ? dayjs(prefill.deadline) : undefined,
      tagsInput: Array.isArray(prefill.tags) ? prefill.tags.join(' ') : (prefill.tags || ''),
    });
  }, [location, form]);

  return (
    <Card title="广告投放管理 - 创建广告订单">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="title" label="项目标题" rules={[{ required: true, message: '请输入项目标题' }]}>
          <Input placeholder="例如：品牌宣传视频制作" />
        </Form.Item>

        <Form.Item name="description" label="项目描述">
          <TextArea rows={3} placeholder="项目背景、目的、参考样例等" />
        </Form.Item>

        <Form.Item name="type" label="订单类型" rules={[{ required: true, message: '请选择订单类型' }]}>
          <Select placeholder="请选择类型">
            <Option value="VIDEO">视频</Option>
            <Option value="DESIGN">设计</Option>
            <Option value="H5">H5</Option>
            <Option value="ANIMATION">动画</Option>
            <Option value="AUDIO">音频</Option>
            <Option value="OTHER">其他</Option>
          </Select>
        </Form.Item>

        <Form.Item name="amount" label="金额（元）" rules={[{ required: true, message: '请输入金额' }]}>
          <InputNumber style={{ width: '100%' }} min={0} placeholder="预算内期望支付金额" />
        </Form.Item>

        {/* 预算上限已移除 */}

        <Form.Item name="priority" label="优先级">
          <Select placeholder="可选">
            <Option value="HIGH">高</Option>
            <Option value="MEDIUM">中</Option>
            <Option value="LOW">低</Option>
          </Select>
        </Form.Item>

        <Form.Item name="deadline" label="截止时间" rules={[{ required: true, message: '请选择截止时间' }]}>
          <DatePicker style={{ width: '100%' }} showTime />
        </Form.Item>

        {/* 项目需求/内容要求已移除 */}

        <Form.Item name="tagsInput" label="标签（以空格分割）">
          <Input placeholder="示例：剪辑 AE PS 宣传" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            创建订单
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AdvertiserAdManagement;


