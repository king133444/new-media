import axios from 'axios';

// 统一定义后端基础地址（包含 /api 前缀）
// 可通过环境变量 REACT_APP_API_URL 覆盖，例如 http://192.168.1.10:3000/api
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://10.10.218.17:3000/api';

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截：附带 token
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截：统一 401 处理（登录/注册除外）
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string | undefined = error.config?.url;
    const isAuthEndpoint = url?.includes('/auth/login') || url?.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default http;


