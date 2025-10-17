import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Button, theme, Badge, Popover, List } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  TeamOutlined,
  DownloadOutlined,
  FileOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
  DollarOutlined,
  MessageOutlined,
  BulbOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileImageOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { markAsRead, markAllAsRead } from '../store/slices/notificationSlice';
import { wsEmit } from '../store/websocket';
import { logout } from '../store/slices/authSlice';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { notifications, unreadCount } = useSelector((state: RootState) => state.notification);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 根据用户角色生成菜单
  const getMenuItems = () => {
    const baseItems = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: '仪表盘',
      },
    ];

    if (user?.role === 'ADMIN') {
      return [
        ...baseItems,
        {
          key: '/users',
          icon: <UserOutlined />,
          label: '用户管理',
        },
        {
          key: '/orders',
          icon: <ShoppingCartOutlined />,
          label: '订单管理',
        },
        {
          key: '/reviews',
          icon: <StarOutlined />,
          label: '评价管理',
        },
        {
          key: '/customers',
          icon: <TeamOutlined />,
          label: '客户管理',
        },
        {
          key: '/materials/download',
          icon: <DownloadOutlined />,
          label: '素材下载',
        },
        {
          key: '/materials/management',
          icon: <FileOutlined />,
          label: '素材管理',
        },
        {
          key: '/system',
          icon: <SettingOutlined />,
          label: '系统管理',
        },
        {
          key: '/hr',
          icon: <UsergroupAddOutlined />,
          label: '人力资源管理',
        },
        {
          key: '/transactions',
          icon: <DollarOutlined />,
          label: '交易管理',
        },
        {
          key: '/communication',
          icon: <MessageOutlined />,
          label: '交流中心',
        },
        {
          key: '/recommendations',
          icon: <BulbOutlined />,
          label: '内容推荐',
        },
      ];
    } else if (user?.role === 'ADVERTISER') {
      return [
        ...baseItems,
        {
          key: '/advertiser/profile',
          icon: <UserOutlined />,
          label: '个人资料',
        },
        {
          key: '/advertiser/ads',
          icon: <ShoppingCartOutlined />,
          label: '广告投放',
        },
        {
          key: '/orders',
          icon: <ShoppingCartOutlined />,
          label: '订单管理',
        },
        {
          key: '/advertiser/transactions',
          icon: <DollarOutlined />,
          label: '交易管理',
        },
        {
          key: '/communication',
          icon: <MessageOutlined />,
          label: '交流中心',
        },
        {
          key: '/reviews',
          icon: <StarOutlined />,
          label: '评价管理',
        },
      ];
    } else if (user?.role === 'CREATOR' || user?.role === 'DESIGNER') {
      return [
        ...baseItems,
        {
          key: '/creator/profile',
          icon: <UserOutlined />,
          label: '个人资料',
        },
        {
          key: '/orders/plaza',
          icon: <ShoppingCartOutlined />,
          label: '订单广场',
        },
        {
          key: '/orders',
          icon: <ShoppingCartOutlined />,
          label: '我的订单',
        },
        {
          key: '/portfolios',
          icon: <FileImageOutlined />,
          label: '作品集管理',
        },
        {
          key: '/transactions',
          icon: <DollarOutlined />,
          label: '交易管理',
        },
        {
          key: '/communication',
          icon: <MessageOutlined />,
          label: '交流中心',
        },
        {
          key: '/reviews',
          icon: <StarOutlined />,
          label: '评价管理',
        },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];


  const bellContent = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>通知</span>
        <Button size="small" type="link" onClick={() => {
          dispatch(markAllAsRead());
          // 同步后端将订单申请置已读
          wsEmit('order.application.readAll');
        }}>
          全部已读
        </Button>
      </div>
      <List
        dataSource={notifications.slice(0, 8)}
        locale={{ emptyText: '暂无通知' }}
        renderItem={(n) => (
          <List.Item
            onClick={() => {
              dispatch(markAsRead(n.id));
              // 若是订单申请，通知后端置已读
              if (n.event === 'order.application.created' && (n as any).applicationId) {
                wsEmit('order.application.read', { applicationId: (n as any).applicationId });
              }
              // 聊天消息跳转到交流中心（若有 fromUserId 则附带 contactId）
              if (n.event === 'communication.message' && n.fromUserId) {
                navigate(`/communication?contactId=${n.fromUserId}`);
              } else if (n.event === 'order.application.created' || n.event === 'order.application.accepted' || n.orderId) {
                navigate('/orders');
              }
            }}
            style={{ cursor: 'pointer', background: n.isRead ? 'transparent' : '#f6ffed' }}
          >
            <List.Item.Meta
              title={<span style={{ fontWeight: n.isRead ? 400 : 600 }}>{n.message || n.event}</span>}
              description={
                <span style={{ color: '#999', fontSize: 12 }}>
                  {n.orderId ? `订单ID: ${n.orderId} · ` : ''}
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  const getRoleText = (role: string) => {
    const roleMap: { [key: string]: string } = {
      ADMIN: '管理员',
      ADVERTISER: '广告主',
      CREATOR: '创作者',
      DESIGNER: '设计师',
    };
    return roleMap[role] || role;
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {collapsed ? '新媒体' : '新媒体工作室管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout>
        <Header style={{ 
          padding: 0, 
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingRight: 24
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#666' }}>
              欢迎，{user?.username} ({getRoleText(user?.role || '')})
            </span>
            <Popover content={bellContent} trigger="click" placement="bottomRight">
              <Badge count={unreadCount} size="small">
                <Button type="text" style={{ position: 'relative' }}>
                  <BellOutlined style={{ fontSize: 18 }} />
                </Button>
              </Badge>
            </Popover>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
            >
              <Avatar 
                style={{ backgroundColor: '#1890ff', cursor: 'pointer' }}
                icon={<UserOutlined />}
              />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
