import React, { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, DatePicker, Select, Button, message, Upload } from 'antd';
import ordersApi, { CreateOrderPayload } from '../store/api/ordersApi';
import http from '../store/api/http';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';

const { TextArea } = Input;
const { Option } = Select;

// Stable mappings/helpers to avoid changing dependencies in hooks
const labelMap: Record<string, string> = {
  VIDEO: '视频',
  DESIGN: '设计',
  H5: 'H5',
  ANIMATION: '动画',
  AUDIO: '音频',
  OTHER: '其他',
};

const codeFromLabel = (label: string): string | undefined => {
  const e = Object.entries(labelMap).find(([, cn]) => cn === label);
  return e ? e[0] : undefined;
};

const AdvertiserAdManagement: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<any>();
  const location = useLocation();
  const navigate = useNavigate();
  const [attachFiles, setAttachFiles] = useState<any[]>([]);

  const onFinish = async (values: any) => {
    try {
      setSubmitting(true);
      const reqArray: string[] = (values.requirementsInput || '')
        .split(/；|;/)
        .map((t: string) => t.trim())
        .filter((t: string) => t);
      const typeCodes: string[] = Array.isArray(values.types) ? values.types : (values.type ? [values.type] : []);
      // const primaryType = typeCodes[0] || 'OTHER';
      const typeChinese: string[] = typeCodes.map((c) => labelMap[c] || c);
      const payload: CreateOrderPayload = {
        title: values.title,
        description: values.description,
        // type: primaryType as any,
        amount: values.amount,
        priority: values.priority,
        deadline: values.deadline ? (values.deadline as dayjs.Dayjs).toISOString() : undefined,
        requirements: JSON.stringify(typeChinese),
        tags: JSON.stringify(reqArray),
      } as any;
      const created = await ordersApi.create(payload);
      // 若创建时已选择附件，则在创建成功后立即上传到该订单
      if (attachFiles.length > 0 && created?.id) {
        const formData = new FormData();
        (attachFiles || []).forEach((f: any) => { if (f.originFileObj) formData.append('files', f.originFileObj); });
        try {
          await http.post(`/materials/upload`, formData, {
            params: { orderId: created.id, kind: 'ATTACHMENT' },
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          message.success('订单创建成功，附件已上传');
        } catch (e: any) {
          message.warning('订单创建成功，但附件上传失败');
        }
      } else {
        message.success('订单创建成功');
      }
      form.resetFields();
      setAttachFiles([]);
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
    const inferTypes = (prefill: any) => {
      const codes: string[] = [];
      if (prefill.type) codes.push(prefill.type);
      const reqs = prefill.requirements;
      if (Array.isArray(reqs)) {
        reqs.forEach((r: string) => {
          const code = codeFromLabel(r);
          if (code && !codes.includes(code)) codes.push(code);
        });
      } else if (typeof reqs === 'string') {
        try {
          const arr = JSON.parse(reqs);
          if (Array.isArray(arr)) {
            arr.forEach((r: any) => {
              const code = codeFromLabel(String(r));
              if (code && !codes.includes(code)) codes.push(code);
            });
          }
        } catch {}
      }
      return codes;
    };

    form.setFieldsValue({
      title: prefill.title,
      description: prefill.description,
      types: inferTypes(prefill),
      amount: prefill.amount,
      priority: prefill.priority,
      deadline: prefill.deadline ? dayjs(prefill.deadline) : undefined,
      requirementsInput: Array.isArray(prefill.tags) ? prefill.tags.join('；') : (prefill.tags || ''),
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

        <Form.Item name="types" label="订单类型（可多选）" rules={[{ required: true, message: '请选择至少一个订单类型' }]}>
          <Select mode="multiple" placeholder="请选择类型（可多选）">
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

        <Form.Item name="priority" label="紧急程度">
          <Select placeholder="可选">
            <Option value="HIGH">高</Option>
            <Option value="MEDIUM">中</Option>
            <Option value="LOW">低</Option>
          </Select>
        </Form.Item>

        <Form.Item name="deadline" label="截止时间" rules={[{ required: true, message: '请选择截止时间' }]}>
          <DatePicker style={{ width: '100%' }} showTime />
        </Form.Item>

        <Form.Item name="requirementsInput" label="需求标签（以；分隔）">
          <Input placeholder="示例：剪辑；AE；宣传视频" />
        </Form.Item>

        {/* 预上传附件（创建成功后自动归属到该订单） */}
        <Form.Item label="附件（可选）">
          <Upload
            multiple
            fileList={attachFiles}
            beforeUpload={() => false}
            onChange={({ fileList }) => setAttachFiles(fileList)}
          >
            <Button>选择附件</Button>
          </Upload>
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


