import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Tabs, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loginAsync, registerAsync, clearError } from '../store/slices/authSlice';

const { TabPane } = Tabs;

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState('login');
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  // 显示错误消息
  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const onLoginFinish = async (values: { username: string; password: string }) => {
    try {
      await dispatch(loginAsync(values)).unwrap();
      // 登录成功后显示成功消息
      message.success('登录成功！');
    } catch (error) {
      // 错误已在useEffect中处理
    }
  };

  const onRegisterFinish = async (values: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    try {
      await dispatch(registerAsync({
        username: values.username,
        email: values.email,
        password: values.password,
        role: values.role.toUpperCase(),
      })).unwrap();
      message.success('注册成功！');
    } catch (error) {
      // 错误已在useEffect中处理
    }
  };

  return (
    <div className="login-container">
      <Card className="login-form">
        <div className="login-title">
          <h1>新媒体工作室管理系统</h1>
          <p style={{ color: '#666', marginTop: '8px' }}>连接广告商与创作者的桥梁</p>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
          <TabPane tab="登录" key="login">
            <Form
              name="login"
              onFinish={onLoginFinish}
              autoComplete="off"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入用户名!' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="注册" key="register">
            <Form
              name="register"
              onFinish={onRegisterFinish}
              autoComplete="off"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名!' },
                  { min: 3, message: '用户名至少3个字符!' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱!' },
                  { type: 'email', message: '请输入有效的邮箱地址!' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="邮箱"
                />
              </Form.Item>

              <Form.Item
                name="role"
                rules={[{ required: true, message: '请选择角色!' }]}
                initialValue="advertiser"
              >
                <select style={{ width: '100%', height: '40px', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '0 11px' }}>
                  <option value="advertiser">广告商</option>
                  <option value="designer">设计师</option>
                </select>
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码!' },
                  { min: 6, message: '密码至少6个字符!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                rules={[{ required: true, message: '请确认密码!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="确认密码"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                >
                  注册
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>

        <div style={{ textAlign: 'center', marginTop: '20px', color: '#999' }}>
          <p>系统功能包括：用户管理、广告投放、订单管理、作品集管理、交易管理以及交流中心等</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
