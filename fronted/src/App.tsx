import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { getUserInfoAsync } from './store/slices/authSlice';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import OrderManagement from './pages/OrderManagement';
import ReviewManagement from './pages/ReviewManagement';
import CustomerManagement from './pages/CustomerManagement';
import MaterialDownload from './pages/MaterialDownload';
import MaterialManagement from './pages/MaterialManagement';
import SystemManagement from './pages/SystemManagement';
import HumanResourceManagement from './pages/HumanResourceManagement';
import TransactionManagement from './pages/TransactionManagement';
import CommunicationCenter from './pages/CommunicationCenter';
import ContentRecommendation from './pages/ContentRecommendation';
import AdvertiserProfile from './pages/AdvertiserProfile';
import AdvertiserAdManagement from './pages/AdvertiserAdManagement';
import AdvertiserTransactionManagement from './pages/AdvertiserTransactionManagement';
import OrderPlaza from './pages/OrderPlaza';
import PortfolioManagement from './pages/PortfolioManagement';
import { connectWebSocket } from './store/websocket';
import CreatorProfile from './pages/CreatorProfile';
import CreatorTransactionManagement from './pages/CreatorTransactionManagement';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    // 如果有 token，尝试获取用户信息
    if (token && !isAuthenticated) {
      dispatch(getUserInfoAsync());
    }
    // WebSocket 连接（只在有 token 时建立/复用；不在此处主动断开，避免频繁切路由导致闪断）
    if (token) {
      connectWebSocket(token);
    }
    // 不返回 disconnect 函数，保持全局连接贯穿整个应用生命周期
  }, [token, isAuthenticated, dispatch]);

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/orders" element={<OrderManagement />} />
                <Route path="/reviews" element={<ReviewManagement />} />
                <Route path="/customers" element={<CustomerManagement />} />
                <Route path="/materials/download" element={<MaterialDownload />} />
                <Route path="/materials/management" element={<MaterialManagement />} />
                <Route path="/system" element={<SystemManagement />} />
                <Route path="/hr" element={<HumanResourceManagement />} />
                <Route path="/transactions" element={<TransactionManagement />} />
                <Route path="/communication" element={<CommunicationCenter />} />
                <Route path="/recommendations" element={<ContentRecommendation />} />
                <Route path="/advertiser/profile" element={<AdvertiserProfile />} />
                <Route path="/creator/profile" element={<CreatorProfile />} />
                <Route path="/creator/transactions" element={<CreatorTransactionManagement />} />
                <Route path="/advertiser/ads" element={<AdvertiserAdManagement />} />
                <Route path="/advertiser/transactions" element={<AdvertiserTransactionManagement />} />
                <Route path="/orders/plaza" element={<OrderPlaza />} />
                <Route path="/portfolios" element={<PortfolioManagement />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

export default App;
