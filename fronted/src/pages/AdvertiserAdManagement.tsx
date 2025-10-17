import React, { useState } from 'react';
import { Card, Form, Input, InputNumber, DatePicker, Select, Button, message } from 'antd';
import ordersApi, { CreateOrderPayload } from '../store/api/ordersApi';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const AdvertiserAdManagement: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<CreateOrderPayload>();

  const onFinish = async (values: any) => {
    try {
      setSubmitting(true);
      const payload: CreateOrderPayload = {
        title: values.title,
        description: values.description,
        type: values.type,
        amount: values.amount,
        budget: values.budget,
        priority: values.priority,
        deadline: values.deadline ? (values.deadline as dayjs.Dayjs).toISOString() : undefined,
        contentRequirements: values.contentRequirements,
        requirements: values.requirements,
        tags: values.tags,
      };
      await ordersApi.create(payload);
      message.success('订单创建成功');
      form.resetFields();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

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

        <Form.Item name="budget" label="预算上限（元）">
          <InputNumber style={{ width: '100%' }} min={0} placeholder="可选" />
        </Form.Item>

        <Form.Item name="priority" label="优先级">
          <Select placeholder="可选">
            <Option value="HIGH">高</Option>
            <Option value="MEDIUM">中</Option>
            <Option value="LOW">低</Option>
          </Select>
        </Form.Item>

        <Form.Item name="deadline" label="截止时间">
          <DatePicker style={{ width: '100%' }} showTime />
        </Form.Item>

        <Form.Item name="contentRequirements" label="内容要求">
          <TextArea rows={3} placeholder="画面风格、音乐、时长、尺寸等" />
        </Form.Item>

        <Form.Item name="requirements" label="项目需求(JSON 字符串)">
          <TextArea rows={3} placeholder='例如：{"duration":30,"format":"mp4"}' />
        </Form.Item>

        <Form.Item name="tags" label="标签(JSON 字符串)">
          <TextArea rows={2} placeholder='例如：["紧急","宣传"]' />
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


