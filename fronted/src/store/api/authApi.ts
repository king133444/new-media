import http from './http';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    avatar?: string;
    createdAt: string;
  };
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await http.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await http.post('/auth/register', userData);
    return response.data;
  },

  getUserInfo: async () => {
    const response = await http.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await http.post('/auth/logout');
    return response.data;
  },
};
