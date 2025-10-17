import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../api/authApi';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'ADVERTISER' | 'CREATOR' | 'DESIGNER';
  avatar?: string;
  createdAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// 从 localStorage 恢复用户信息
const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('token'),
  user: getStoredUser(),
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
};

// 异步登录
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem('token', response.token);
      return response;
    } catch (error: any) {
      // NestJS 默认的异常响应格式是 { statusCode: 401, message: "..." }
      const errorMessage = error.response?.data?.message || '登录失败';
      return rejectWithValue(errorMessage);
    }
  }
);

// 异步注册
export const registerAsync = createAsyncThunk(
  'auth/register',
  async (userData: { username: string; email: string; password: string; role: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.register(userData);
      localStorage.setItem('token', response.token);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '注册失败');
    }
  }
);

// 获取用户信息
export const getUserInfoAsync = createAsyncThunk(
  'auth/getUserInfo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getUserInfo();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '获取用户信息失败');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 登录
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        
        const userData = {
          ...action.payload.user,
          role: action.payload.user.role as User['role'],
        };
        state.user = userData;
        state.token = action.payload.token;
        // 保存用户信息到 localStorage
        localStorage.setItem('user', JSON.stringify(userData));
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 注册
      .addCase(registerAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        const userData = {
          ...action.payload.user,
          role: action.payload.user.role as User['role'],
        };
        state.user = userData;
        state.token = action.payload.token;
        // 保存用户信息到 localStorage
        localStorage.setItem('user', JSON.stringify(userData));
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 获取用户信息
      .addCase(getUserInfoAsync.fulfilled, (state, action) => {
        const userData = {
          ...action.payload,
          role: action.payload.role as User['role'],
        };
        state.user = userData;
        state.isAuthenticated = true;
        // 保存用户信息到 localStorage
        localStorage.setItem('user', JSON.stringify(userData));
      })
      .addCase(getUserInfoAsync.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
